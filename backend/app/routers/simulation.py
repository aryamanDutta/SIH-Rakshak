from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.simulation.simulator import simulation_manager, SCENARIOS
from app.models import Soldier

router = APIRouter()


class SimStartRequest(BaseModel):
    soldier_ids: Optional[List[int]] = None  # if None, auto-load all active soldiers
    scenario: str = "PATROL"
    mission_id: Optional[int] = None


class ScenarioChangeRequest(BaseModel):
    scenario: str


@router.post("/start")
async def start_simulation(req: SimStartRequest = None, db: AsyncSession = Depends(get_db)):
    """Start simulation. If soldier_ids is omitted, all active soldiers are loaded."""
    soldier_ids = (req.soldier_ids if req else None) or []
    scenario = (req.scenario if req else None) or "PATROL"
    mission_id = (req.mission_id if req else None)

    if not soldier_ids:
        result = await db.execute(select(Soldier).where(Soldier.is_active == True))
        soldiers = result.scalars().all()
        soldier_ids = [s.id for s in soldiers]

    if not soldier_ids:
        raise HTTPException(status_code=400, detail="No active soldiers found. Run seed_data.py first.")

    if scenario not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Unknown scenario. Valid: {list(SCENARIOS.keys())}")

    simulation_manager.start(
        soldier_ids=soldier_ids,
        scenario=scenario,
        mission_id=mission_id,
    )
    simulation_manager.launch_task()
    return {
        "status": "started",
        "soldier_ids": soldier_ids,
        "scenario": scenario,
        "active_soldiers": len(soldier_ids),
    }


@router.post("/stop")
async def stop_simulation():
    simulation_manager.stop()
    return {"status": "stopped"}


@router.post("/tick")
async def manual_tick(db: AsyncSession = Depends(get_db)):
    """Generate one tick of data for all running soldiers (for debugging)."""
    if not simulation_manager.is_running:
        # Allow single tick even when not running, for demo/test purposes
        result = await db.execute(select(Soldier).where(Soldier.is_active == True))
        soldiers = result.scalars().all()
        soldier_ids = [s.id for s in soldiers]
        if not soldier_ids:
            raise HTTPException(status_code=400, detail="No active soldiers found.")
        simulation_manager.start(soldier_ids=soldier_ids, scenario="PATROL")
        await simulation_manager._run_tick(db)
        simulation_manager.stop()
        return {"message": f"Manual tick completed for {len(soldier_ids)} soldiers.", "running": False}
    
    await simulation_manager._run_tick(db)
    return {"message": "Manual tick completed.", "running": True}


@router.get("/status")
async def simulation_status(db: AsyncSession = Depends(get_db)):
    status = simulation_manager.get_status()
    # Add total_readings count
    from sqlalchemy import func
    from app.models import SensorReading
    try:
        result = await db.execute(select(func.count()).select_from(SensorReading))
        total_readings = result.scalar_one()
        status["total_readings"] = total_readings
    except Exception:
        status["total_readings"] = 0
    return status


@router.post("/scenario")
async def change_scenario(req: ScenarioChangeRequest):
    if req.scenario not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Unknown scenario. Valid: {list(SCENARIOS.keys())}")
    if not simulation_manager.is_running:
        raise HTTPException(status_code=400, detail="Simulation is not running")
    simulation_manager.set_scenario(req.scenario)
    return {"status": "scenario_changed", "scenario": req.scenario}


@router.get("/scenarios")
async def list_scenarios():
    return [{"name": k, "description": v.description} for k, v in SCENARIOS.items()]
