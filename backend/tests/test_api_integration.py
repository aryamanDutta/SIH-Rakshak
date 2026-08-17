"""Integration tests for RAKSHAK API endpoints and pipeline data mapping."""
import pytest
import pytest_asyncio
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import Squad, Soldier, SensorReading, DataSource
from app.pipeline.processor import process_and_assess


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
    # Setup test squad & soldier
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

    # Add sensor readings
    ts = datetime.utcnow()
    reading1 = SensorReading(
        soldier_id=soldier.id,
        timestamp=ts,
        rr_interval_ms=800.0,  # HR = 75 bpm
        temperature_c=36.8,
        accel_x=0.01,
        accel_y=0.01,
        accel_z=9.81,
        activity_label="REST",
        source=DataSource.SIMULATOR,
    )
    async_session.add(reading1)
    await async_session.commit()

    # Call GET /soldiers/{id}/readings
    res = await test_client.get(f"/soldiers/{soldier.id}/readings")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
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
    # Setup squad & 2 soldiers
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

    # Add readings for both soldiers
    now = datetime.utcnow()
    for s, rr, temp in [(soldier1, 750.0, 36.9), (soldier2, 600.0, 37.4)]:
        for _ in range(5):  # multiple readings to trigger feature extraction
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

    # Call GET /squads/{id}/status
    res = await test_client.get(f"/squads/{squad.id}/status")
    assert res.status_code == 200
    data = res.json()

    assert data["squad_id"] == squad.id
    assert data["total_soldiers"] == 2
    assert len(data["soldiers"]) == 2

    # Verify non-null mean_hr and temperature for all soldiers
    for s_state in data["soldiers"]:
        assert s_state["mean_hr"] is not None, f"mean_hr should not be None for soldier {s_state['soldier_id']}"
        assert s_state["temperature"] is not None, f"temperature should not be None for soldier {s_state['soldier_id']}"
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
