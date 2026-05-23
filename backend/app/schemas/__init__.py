"""Schemas module initialization."""

from app.schemas.disaster import (
    DisasterBulkCreate,
    DisasterBulkResponse,
    DisasterCreate,
    DisasterIdsRequest,
    DisasterListResponse,
    DisasterResponse,
    DisasterType,
    DisasterUpdate,
    Priority,
)
from app.schemas.graph import (
    EdgeType,
    GraphBuildRequest,
    GraphEdgeSchema,
    GraphNode,
    GraphNodeType,
    GraphResponse,
    GraphStats,
    RouteRequest,
    RouteResponse,
)
from app.schemas.inventory import (
    InventoryBulkResponse,
    InventoryBulkUpdate,
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate,
)
from app.schemas.optimize import (
    AllocationStatus,
    OptimizationAlgorithm,
    OptimizationObjective,
    OptimizationRequest,
    OptimizationResponse,
    OptimizationResult,
    ResourceAllocation,
    ShortestPathRequest,
    ShortestPathResponse,
)
from app.schemas.resource import (
    DiscoveredResource,
    ResourceCenterCreate,
    ResourceCenterResponse,
    ResourceCenterWithInventory,
    ResourceDiscoveryRequest,
    ResourceDiscoveryResponse,
    ResourceListResponse,
    ResourceType,
)

__all__ = [
    # Disaster
    "DisasterCreate",
    "DisasterBulkCreate",
    "DisasterResponse",
    "DisasterBulkResponse",
    "DisasterUpdate",
    "DisasterListResponse",
    "DisasterIdsRequest",
    "DisasterType",
    "Priority",
    # Resource
    "ResourceType",
    "ResourceCenterCreate",
    "ResourceCenterResponse",
    "ResourceCenterWithInventory",
    "DiscoveredResource",
    "ResourceDiscoveryRequest",
    "ResourceDiscoveryResponse",
    "ResourceListResponse",
    # Inventory
    "InventoryCreate",
    "InventoryUpdate",
    "InventoryResponse",
    "InventoryBulkUpdate",
    "InventoryBulkResponse",
    # Graph
    "EdgeType",
    "GraphNodeType",
    "GraphNode",
    "GraphEdgeSchema",
    "GraphBuildRequest",
    "GraphResponse",
    "GraphStats",
    "RouteRequest",
    "RouteResponse",
    # Optimize
    "OptimizationAlgorithm",
    "AllocationStatus",
    "OptimizationObjective",
    "ResourceAllocation",
    "OptimizationRequest",
    "OptimizationResult",
    "OptimizationResponse",
    "ShortestPathRequest",
    "ShortestPathResponse",
]
