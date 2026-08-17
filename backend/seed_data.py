"""
RAKSHAK Seed Data

Populates the development database with one squad, 5 soldiers,
and one active mission for demo purposes.

Run from the backend/ directory:
    python seed_data.py
"""
import asyncio
from app.database import AsyncSessionLocal, init_db
from app.models import Squad, Soldier, Mission, MissionStatus, MissionEvent, MissionPhase
from datetime import datetime


SOLDIERS_DATA = [
    {"soldier_uid": "RK-001", "name": "Arjun Singh",    "call_sign": "ALPHA-1", "rank": "Captain",       "age": 32, "weight_kg": 78.0, "height_cm": 178.0},
    {"soldier_uid": "RK-002", "name": "Vikram Rao",     "call_sign": "ALPHA-2", "rank": "Lieutenant",    "age": 28, "weight_kg": 72.0, "height_cm": 175.0},
    {"soldier_uid": "RK-003", "name": "Priya Sharma",   "call_sign": "ALPHA-3", "rank": "Havildar",      "age": 26, "weight_kg": 60.0, "height_cm": 163.0},
    {"soldier_uid": "RK-004", "name": "Rajan Mehta",    "call_sign": "ALPHA-4", "rank": "Naik",          "age": 24, "weight_kg": 70.0, "height_cm": 170.0},
    {"soldier_uid": "RK-005", "name": "Deepak Nair",    "call_sign": "ALPHA-5", "rank": "Sepoy",         "age": 22, "weight_kg": 68.0, "height_cm": 172.0},
]


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        from sqlalchemy import select
        existing = await db.execute(select(Squad))
        if existing.scalar_one_or_none():
            print("[Seed] Database already seeded. Skipping.")
            return
        
        # Create squad
        squad = Squad(name="Alpha Squad", unit="1st Infantry Brigade", commander_name="Colonel Kapoor")
        db.add(squad)
        await db.flush()  # get squad.id
        
        # Create soldiers
        soldiers = []
        for s_data in SOLDIERS_DATA:
            soldier = Soldier(squad_id=squad.id, **s_data)
            db.add(soldier)
            soldiers.append(soldier)
        await db.flush()
        
        # Create a demo mission
        mission = Mission(
            mission_uid="MSN-DEMO-001",
            name="Border Patrol — Sector 7",
            mission_type="Reconnaissance",
            squad_id=squad.id,
            status=MissionStatus.ACTIVE,
            conditions='{"terrain": "mountainous", "temperature_c": 24, "duration_hours": 6}',
            started_at=datetime.utcnow(),
        )
        db.add(mission)
        await db.flush()
        
        # Add mission start event
        event = MissionEvent(
            mission_id=mission.id,
            timestamp=datetime.utcnow(),
            phase=MissionPhase.BRIEFING,
            description="Mission briefing complete. Alpha Squad deploying to Sector 7.",
        )
        db.add(event)
        
        await db.commit()
        print(f"[Seed] Created squad '{squad.name}' (id={squad.id})")
        print(f"[Seed] Created {len(soldiers)} soldiers")
        print(f"[Seed] Created mission '{mission.name}' (id={mission.id}, uid={mission.mission_uid})")
        print(f"[Seed] Done. Soldier IDs: {[s.id for s in soldiers]}")
        print(f"[Seed] Mission ID: {mission.id}")
        print("[Seed] To start simulation, POST /simulation/start with these soldier IDs")


if __name__ == "__main__":
    asyncio.run(seed())
