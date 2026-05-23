"""
Graph-related Pydantic schemas for request/response validation.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class EdgeType(str, Enum):
    """Types of graph edges."""

    DISASTER_TO_RESOURCE = "disaster_to_resource"
    RESOURCE_TO_RESOURCE = "resource_to_resource"
    DISASTER_TO_DISASTER = "disaster_to_disaster"


class GraphNodeType(str, Enum):
    """Types of graph nodes."""

    DISASTER = "disaster"
    RESOURCE = "resource"


class GraphNode(BaseModel):
    """Schema for a graph node."""

    id: str  # "disaster_1" or "resource_5"
    node_type: GraphNodeType
    lat: float
    lng: float
    label: str
    metadata: dict = Field(default_factory=dict)


class GraphEdgeSchema(BaseModel):
    """Schema for a graph edge."""

    id: int
    source: str
    target: str
    distance_meters: float
    duration_seconds: float
    weight: float
    edge_type: EdgeType
    route_geometry: dict | None = None

    model_config = {"from_attributes": True}


class GraphBuildRequest(BaseModel):
    """Schema for graph build request."""

    disaster_ids: list[int] | None = Field(
        default=None,
        description="Specific disaster IDs to include (all if None)",
    )
    resource_ids: list[int] | None = Field(
        default=None,
        description="Specific resource IDs to include (all if None)",
    )
    include_route_geometry: bool = Field(
        default=True,
        description="Whether to include route geometry in edges",
    )
    max_distance_km: float | None = Field(
        default=50,
        ge=1,
        le=200,
        description="Maximum edge distance in km",
    )


class GraphResponse(BaseModel):
    """Schema for graph response."""

    nodes: list[GraphNode]
    edges: list[GraphEdgeSchema]
    node_count: int
    edge_count: int
    message: str = "Graph built successfully"


class GraphStats(BaseModel):
    """Schema for graph statistics."""

    total_nodes: int
    disaster_nodes: int
    resource_nodes: int
    total_edges: int
    avg_edge_distance_km: float
    avg_edge_duration_min: float
    graph_density: float


class RouteRequest(BaseModel):
    """Schema for route calculation request."""

    source_lat: float = Field(..., ge=-90, le=90)
    source_lng: float = Field(..., ge=-180, le=180)
    target_lat: float = Field(..., ge=-90, le=90)
    target_lng: float = Field(..., ge=-180, le=180)


class RouteResponse(BaseModel):
    """Schema for route response."""

    distance_meters: float
    duration_seconds: float
    geometry: dict | None = None
    source: dict
    target: dict
