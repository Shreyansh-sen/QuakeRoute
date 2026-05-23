"""
Optimization-related Pydantic schemas for request/response validation.
"""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class OptimizationAlgorithm(str, Enum):
    """Available optimization algorithms."""

    DIJKSTRA = "dijkstra"
    GREEDY = "greedy"
    MIN_COST_FLOW = "min_cost_flow"
    QAOA = "qaoa"  # Future quantum


class AllocationStatus(str, Enum):
    """Status of resource allocation."""

    PENDING = "pending"
    ALLOCATED = "allocated"
    PARTIALLY_ALLOCATED = "partially_allocated"
    FAILED = "failed"


class OptimizationObjective(str, Enum):
    """Optimization objectives."""

    MINIMIZE_DISTANCE = "minimize_distance"
    MINIMIZE_TIME = "minimize_time"
    MAXIMIZE_COVERAGE = "maximize_coverage"
    BALANCED = "balanced"


class ResourceAllocation(BaseModel):
    """Schema for a single resource allocation."""

    disaster_id: int
    resource_center_id: int
    resource_type: str
    allocated_quantity: dict[str, int]  # {"beds": 10, "ambulances": 2}
    distance_meters: float
    eta_seconds: float
    priority_score: float


class OptimizationRequest(BaseModel):
    """Schema for optimization request."""

    disaster_ids: list[int] | None = Field(
        default=None,
        description="Specific disaster IDs to optimize (all if None)",
    )
    algorithm: OptimizationAlgorithm = Field(
        default=OptimizationAlgorithm.GREEDY,
        description="Optimization algorithm to use",
    )
    objective: OptimizationObjective = Field(
        default=OptimizationObjective.BALANCED,
        description="Optimization objective",
    )
    constraints: dict[str, Any] | None = Field(
        default=None,
        description="Additional constraints",
    )
    max_iterations: int = Field(
        default=1000,
        ge=1,
        le=100000,
        description="Maximum optimization iterations",
    )


class OptimizationResult(BaseModel):
    """Schema for optimization result."""

    allocations: list[ResourceAllocation]
    total_distance: float
    total_time: float
    coverage_percentage: float
    unmet_demands: dict[int, dict[str, int]]  # disaster_id -> unmet resources
    algorithm_used: OptimizationAlgorithm
    iterations: int
    computation_time_ms: float


class OptimizationResponse(BaseModel):
    """Schema for optimization response."""

    result: OptimizationResult
    status: AllocationStatus
    message: str = "Optimization completed"


class ShortestPathRequest(BaseModel):
    """Schema for shortest path request."""

    source_node_id: str  # "disaster_1" or "resource_5"
    target_node_id: str
    algorithm: OptimizationAlgorithm = OptimizationAlgorithm.DIJKSTRA


class ShortestPathResponse(BaseModel):
    """Schema for shortest path response."""

    path: list[str]  # List of node IDs
    total_distance: float
    total_duration: float
    edges: list[dict]
