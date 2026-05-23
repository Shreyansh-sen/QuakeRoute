"""
Results API — stores and retrieves optimization results for cross-portal communication.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any

router = APIRouter(prefix="/results", tags=["results"])

# Simple in-memory store (persists while server is running)
_latest_result: dict | None = None


class OptimizationResultStore(BaseModel):
    """Schema for storing optimization results."""
    greedy: dict[str, Any] | None = None
    dijkstra: dict[str, Any] | None = None
    graph: dict[str, Any] | None = None
    disasters: list[dict[str, Any]] = []
    resources: list[dict[str, Any]] = []
    timestamp: float = 0


@router.post("/optimization")
def store_optimization_result(payload: OptimizationResultStore):
    """Admin stores optimization results after running the pipeline."""
    global _latest_result
    _latest_result = payload.model_dump()
    return {"status": "stored", "timestamp": payload.timestamp}


@router.get("/optimization")
def get_optimization_result():
    """User polls this to get the latest optimization results."""
    if _latest_result is None:
        return {"status": "pending", "result": None}
    return {"status": "ready", "result": _latest_result}


@router.delete("/optimization")
def clear_optimization_result():
    """Clear stored results (for new session)."""
    global _latest_result
    _latest_result = None
    return {"status": "cleared"}
