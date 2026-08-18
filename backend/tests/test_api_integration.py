"""Integration tests for RAKSHAK API endpoints, pipeline, alert lifecycle, and event stream."""
import pytest
import pytest_asyncio
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import Squad, Soldier, SensorReading, DataSource, Alert, AlertType, AlertSeverity, RiskCategory
from app.pipeline.processor import process_and_assess
from app.services.alert_service import check_and_create_alert, acknowledge_alert
from app.ai.interface import FatigueResult
from app.simulation.simulator import simulation_manager


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def async_session():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def test_client(async_session: AsyncSession):
    async def override_get_db():
        yield async_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_soldier_readings_endpoint(test_client: AsyncClient, async_session: AsyncSession):
    squad = Squad(name="Test Squad", unit="Alpha")
    async_session.add(squad)
    await async_session.flush()

    soldier = Soldier(
        soldier_uid="RK-101",
        name="Test Soldier",
        call_sign="T-1",
        rank="Sergeant",
        squad_id=squad.id,
        age=30,
        weight_kg=75.0,
        height_cm=175.0,
    )
    async_session.add(soldier)
    await async_session.flush()

    ts = datetime.utcnow()
    reading1 = SensorReading(
        soldier_id=soldier.id,
        timestamp=ts,
        rr_interval_ms=800.0,
        temperature_c=36.8,
        accel_x=0.01,
        accel_y=0.01,
        accel_z=9.81,
        activity_label="REST",
        source=DataSource.SIMULATOR,
    )
    async_session.add(reading1)
    await async_session.commit()

    res = await test_client.get(f"/soldiers/{soldier.id}/readings")
    assert res.status_code == 200
    readings = res.json()
    assert isinstance(readings, list)
    assert len(readings) == 1

    r = readings[0]
    assert r["soldier_id"] == soldier.id
    assert r["rr_interval_ms"] == 800.0
    assert r["derived_hr"] == 75.0
    assert r["temperature_c"] == 36.8
    assert r["activity_label"] == "REST"
    assert r["source"] == "simulator"


@pytest.mark.asyncio
async def test_squad_status_contains_non_null_physiological_values(test_client: AsyncClient, async_session: AsyncSession):
    squad = Squad(name="Bravo Squad", unit="Special Ops")
    async_session.add(squad)
    await async_session.flush()

    soldier1 = Soldier(
        soldier_uid="RK-201", name="Soldier One", call_sign="B-1", rank="Sepoy",
        squad_id=squad.id, age=22, weight_kg=70.0, height_cm=170.0
    )
    soldier2 = Soldier(
        soldier_uid="RK-202", name="Soldier Two", call_sign="B-2", rank="Sepoy",
        squad_id=squad.id, age=24, weight_kg=72.0, height_cm=172.0
    )
    async_session.add_all([soldier1, soldier2])
    await async_session.flush()

    now = datetime.utcnow()
    for s, rr, temp in [(soldier1, 750.0, 36.9), (soldier2, 600.0, 37.4)]:
        for _ in range(5):
            r = SensorReading(
                soldier_id=s.id,
                timestamp=now,
                rr_interval_ms=rr,
                temperature_c=temp,
                accel_x=0.05, accel_y=0.05, accel_z=9.81,
                activity_label="PATROL",
                source=DataSource.SIMULATOR,
            )
            async_session.add(r)
        await async_session.commit()
        await process_and_assess(soldier_id=s.id, db=async_session)

    res = await test_client.get(f"/squads/{squad.id}/status")
    assert res.status_code == 200
    data = res.json()

    assert data["squad_id"] == squad.id
    assert data["total_soldiers"] == 2
    assert len(data["soldiers"]) == 2

    for s_state in data["soldiers"]:
        assert s_state["mean_hr"] is not None
        assert s_state["temperature"] is not None
        assert s_state["mean_hr"] > 0
        assert s_state["temperature"] > 30.0


@pytest.mark.asyncio
async def test_squad_status_aggregates_active_soldiers_correctly(test_client: AsyncClient, async_session: AsyncSession):
    squad = Squad(name="Charlie Squad", unit="Artillery")
    async_session.add(squad)
    await async_session.flush()

    active_soldier = Soldier(
        soldier_uid="RK-301", name="Active Soldier", call_sign="C-1", rank="Naik",
        squad_id=squad.id, age=26, weight_kg=68.0, height_cm=168.0, is_active=True
    )
    inactive_soldier = Soldier(
        soldier_uid="RK-302", name="Inactive Soldier", call_sign="C-2", rank="Naik",
        squad_id=squad.id, age=27, weight_kg=70.0, height_cm=170.0, is_active=False
    )
    async_session.add_all([active_soldier, inactive_soldier])
    await async_session.commit()

    res = await test_client.get(f"/squads/{squad.id}/status")
    assert res.status_code == 200
    data = res.json()

    assert data["total_soldiers"] == 1
    assert len(data["soldiers"]) == 1
    assert data["soldiers"][0]["soldier_id"] == active_soldier.id


@pytest.mark.asyncio
async def test_alert_lifecycle_and_auto_resolution(async_session: AsyncSession):
    squad = Squad(name="Delta Squad", unit="Recon")
    async_session.add(squad)
    await async_session.flush()

    soldier = Soldier(
        soldier_uid="RK-401", name="Delta Soldier", call_sign="D-1", rank="Sepoy",
        squad_id=squad.id, age=25, weight_kg=72.0, height_cm=174.0
    )
    async_session.add(soldier)
    await async_session.flush()

    # 1. High fatigue -> trigger alert
    high_fatigue = FatigueResult(
        soldier_id=soldier.id,
        timestamp=datetime.utcnow(),
        fatigue_score=65.0,
        risk_category=RiskCategory.HIGH,
        contributors={"hr_deviation": 0.4, "hrv_deterioration": 0.6},
        model_version="heuristic-v1",
        activity_context="PATROL",
        baseline_valid=True,
    )
    alert = await check_and_create_alert(soldier_id=soldier.id, fatigue_result=high_fatigue, db=async_session)
    assert alert is not None
    assert alert.severity == AlertSeverity.HIGH
    assert not alert.is_acknowledged

    # 2. Return to normal -> auto-resolve alert
    normal_fatigue = FatigueResult(
        soldier_id=soldier.id,
        timestamp=datetime.utcnow(),
        fatigue_score=15.0,
        risk_category=RiskCategory.NORMAL,
        contributors={"hr_deviation": 0.1, "hrv_deterioration": 0.1},
        model_version="heuristic-v1",
        activity_context="REST",
        baseline_valid=True,
    )
    res_normal = await check_and_create_alert(soldier_id=soldier.id, fatigue_result=normal_fatigue, db=async_session)
    assert res_normal is None

    # Check alert in DB is now acknowledged/resolved
    await async_session.refresh(alert)
    assert alert.is_acknowledged


@pytest.mark.asyncio
async def test_simulation_manager_event_logging():
    simulation_manager.start(soldier_ids=[10, 11], scenario="PATROL")
    assert simulation_manager.is_running
    status = simulation_manager.get_status()
    assert "events" in status
    assert len(status["events"]) > 0

    simulation_manager.set_scenario("HIGH_INTENSITY")
    assert simulation_manager.active_scenario == "HIGH_INTENSITY"

    simulation_manager.stop()
    assert not simulation_manager.is_running
