"""
DayCall — FastAPI Application Entry Point
Sets up the app, middleware, routers, and database lifecycle.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, close_db
from app.routers import health

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("daycall")


# ============================================================================
# LIFESPAN — startup/shutdown hooks
# ============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run on startup and shutdown."""
    logger.info("🚀 DayCall backend starting...")

    # Initialize MongoDB + Beanie
    await init_db()
    logger.info("✅ MongoDB connected & Beanie initialized")

    yield  # App is running

    # Cleanup
    await close_db()
    logger.info("👋 DayCall backend shutting down...")


# ============================================================================
# APP
# ============================================================================

app = FastAPI(
    title="DayCall API",
    description="AI Voice Journal — Backend API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)

# Future routers (uncomment as implemented):
# app.include_router(auth.router, prefix="/auth")
# app.include_router(journal.router, prefix="/journal")
# app.include_router(settings.router, prefix="/settings")
# app.include_router(voice.router)


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
