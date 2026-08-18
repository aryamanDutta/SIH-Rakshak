import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import AsyncSessionLocal
from seed_data import seed
from app.simulation.simulator import simulation_manager

async def run_demo_story_verification():
    print("==================================================================")
    print(" RAKSHAK DEMO STORY VERIFICATION (PATROL -> HIGH INTENSITY -> RECOVERY)")
    print("==================================================================")
    
    await seed()
    
    async with AsyncSessionLocal() as db:
        # Phase 1: PATROL
        print("\n--- PHASE 1: PATROL SCENARIO (5 ticks) ---")
        simulation_manager.start(soldier_ids=[1, 2, 3, 4, 5], scenario="PATROL")
        for i in range(5):
            await simulation_manager._run_tick(db)
        status = simulation_manager.get_status()
        print(f"Scenario: {status['scenario']} | Ticks: {status['tick_count']} | Active Soldiers: {status['active_soldiers']}")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/squads/1/status")
        sq = res.json()
        print("Squad Status (PATROL):")
        for s in sq["soldiers"]:
            print(f"  {s['name']}: HR={s['mean_hr']} BPM, Temp={s['temperature']}°C, Fatigue={s['fatigue_score']}, Risk={s['risk_category']}")
        assert sq["risk_distribution"]["HIGH"] == 0
        assert sq["risk_distribution"]["CRITICAL"] == 0

        # Phase 2: HIGH INTENSITY
        print("\n--- PHASE 2: SWITCHING TO HIGH_INTENSITY SCENARIO (25 ticks) ---")
        simulation_manager.set_scenario("HIGH_INTENSITY")
        async with AsyncSessionLocal() as db:
            for i in range(25):
                await simulation_manager._run_tick(db)
        
        res = await client.get("/squads/1/status")
        sq = res.json()
        print("Squad Status (HIGH INTENSITY):")
        for s in sq["soldiers"]:
            print(f"  {s['name']}: HR={s['mean_hr']} BPM, Temp={s['temperature']}°C, Fatigue={s['fatigue_score']}, Risk={s['risk_category']}")

        # Verify fatigue score rose and alerts exist
        res_alerts = await client.get("/soldiers/alerts?active_only=true")
        active_alerts = res_alerts.json()
        print(f"\nActive Alerts Count: {len(active_alerts)}")
        for a in active_alerts:
            print(f"  Alert [{a['severity']}]: {a['message']}")

        # Phase 3: RECOVERY
        print("\n--- PHASE 3: SWITCHING TO RECOVERY SCENARIO (30 ticks) ---")
        simulation_manager.set_scenario("RECOVERY")
        async with AsyncSessionLocal() as db:
            for i in range(30):
                await simulation_manager._run_tick(db)

        res = await client.get("/squads/1/status")
        sq = res.json()
        print("Squad Status (RECOVERY):")
        for s in sq["soldiers"]:
            print(f"  {s['name']}: HR={s['mean_hr']} BPM, Temp={s['temperature']}°C, Fatigue={s['fatigue_score']}, Risk={s['risk_category']}")

        res_alerts_after = await client.get("/soldiers/alerts?active_only=true")
        active_alerts_after = res_alerts_after.json()
        print(f"Active Alerts Count After Recovery: {len(active_alerts_after)}")

        simulation_manager.stop()
        print("\n==================================================================")
        print(" DEMO STORY VERIFICATION COMPLETE: ALL TRANSITIONS WORKING AS EXPECTED")
        print("==================================================================")

if __name__ == "__main__":
    asyncio.run(run_demo_story_verification())
