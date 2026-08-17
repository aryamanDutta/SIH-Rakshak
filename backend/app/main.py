"""
RAKSHAK — Soldier Health and Fatigue Monitoring System
Software Prototype — FastAPI Application Entry Point

DISCLAIMER: This is a research prototype for the SIH internal round.
All fatigue assessments are heuristic estimates, not clinical diagnoses.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routers import soldiers, squads, missions, analytics, simulation


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB tables on startup."""
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "RAKSHAK — Soldier Health and Fatigue Monitoring System (Software Prototype). "
        "All fatigue assessments are heuristic estimates, not clinically validated diagnoses."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(soldiers.router, prefix="/soldiers", tags=["Soldiers"])
app.include_router(squads.router, prefix="/squads", tags=["Squads"])
app.include_router(missions.router, prefix="/missions", tags=["Missions"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(simulation.router, prefix="/simulation", tags=["Simulation"])


@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "disclaimer": "Prototype heuristic fatigue estimation — not a clinical tool.",
    }
