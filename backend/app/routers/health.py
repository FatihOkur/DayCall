"""
DayCall — Health Check Router
Simple endpoint for load balancers and monitoring.
"""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    """Health check — returns server status."""
    return {
        "status": "healthy",
        "service": "daycall-backend",
        "version": "0.1.0",
    }
