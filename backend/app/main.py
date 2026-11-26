from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import Property
from app.seed import seed_database
from app.routes.properties import router as properties_router
from app.routes.calls import router as calls_router
from app.routes.voice import router as voice_router
from app.routes.appointments import router as appointments_router
from app.routes.appointments import leads_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure database tables exist and seed initial properties if empty."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = db.query(Property).count()
        if count == 0:
            print("Database empty. Running seed...")
            seed_database()
        else:
            print(f"Database already contains {count} properties.")
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for EstateVoice AI - DreamSpace Properties Sales Assistant",
    version="1.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with prefix /api
app.include_router(properties_router, prefix="/api")
app.include_router(calls_router, prefix="/api")
app.include_router(voice_router, prefix="/api")
app.include_router(appointments_router, prefix="/api")
app.include_router(leads_router, prefix="/api")


@app.get("/")
def root():
    return {
        "message": "Welcome to EstateVoice AI Backend API",
        "company": "DreamSpace Properties, Bangalore",
        "tagline": "Turning conversations into property visits.",
        "docs": "/docs",
        "health": "/api/health"
    }
