"""API module initialization."""

from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.disaster import router as disaster_router
from app.api.graph import router as graph_router
from app.api.optimize import router as optimize_router
from app.api.resources import router as resources_router

# Main API router
api_router = APIRouter()

# Include all routers
api_router.include_router(disaster_router)
api_router.include_router(resources_router)
api_router.include_router(admin_router)
api_router.include_router(graph_router)
api_router.include_router(optimize_router)

__all__ = [
    "api_router",
    "disaster_router",
    "resources_router",
    "admin_router",
    "graph_router",
    "optimize_router",
]
