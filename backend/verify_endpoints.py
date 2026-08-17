import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db, AsyncSessionLocal
from seed_data import seed
from app.simulation.simulator import simulation_manager, SCENARIOS

async def verify():
    print("--- 1. Initializing DB & Seeding Data ---")
    await seed()
    
    async with AsyncSessionLocal() as db:
        print("\n--- 2. Ticking Simulation 3 Times ---")
        simulation_manager.start(soldier_ids=[1, 2, 3, 4, 5], scenario="PATROL")
        for i in range(3):
            await simulation_manager._run_tick(db)
            print(f"  Tick {i+1} completed.")
        simulation_manager.stop()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("\n--- 3. Testing GET /soldiers/1/readings ---")
        res = await client.get("/soldiers/1/readings")
        print(f"Status Code: {res.status_code}")
        readings = res.json()
        print(f"Readings Count: {len(readings)}")
        if readings:
            print("Sample Reading:", readings[0])

        print("\n--- 4. Testing GET /soldiers/1/fatigue ---")
        res = await client.get("/soldiers/1/fatigue")
        print(f"Status Code: {res.status_code}")
        print("Fatigue Assessment:", res.json())

        print("\n--- 5. Testing GET /squads/1/status ---")
        res = await client.get("/squads/1/status")
        print(f"Status Code: {res.status_code}")
        status = res.json()
        print(f"Squad Name: {status.get('squad_name')}")
        print(f"Total Soldiers: {status.get('total_soldiers')}")
        print("Soldiers Summary:")
        for s in status.get("soldiers", []):
            print(f"  Soldier ID {s['soldier_id']} ({s['name']}): mean_hr={s['mean_hr']}, temp={s['temperature']}, fatigue={s['fatigue_score']}")

if __name__ == "__main__":
    asyncio.run(verify())
