"""
AI Voice Journal - FastAPI Backend
Main application entry point with router registration and CORS configuration.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.routers import auth, settings as settings_router, journal, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup: Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # Shutdown: Close database connections
    await engine.dispose()


# Initialize FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="AI Voice Journal - Proactive journaling assistant with voice calls",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(settings_router.router)
app.include_router(journal.router)
app.include_router(webhooks.router)


@app.get("/")
async def root() -> dict:
    """Root endpoint for health check."""
    return {
        "app": settings.app_name,
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}
