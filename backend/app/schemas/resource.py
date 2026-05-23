"""
Resource-related Pydantic schemas for request/response validation.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ResourceType(str, Enum):
    """Types of resource centers."""

    HOSPITAL = "hospital"
    FIRE_STATION = "fire_station"
    POLICE = "police"
    SHELTER = "shelter"
    PHARMACY = "pharmacy"
    WAREHOUSE = "warehouse"
    NGO_CENTER = "ngo_center"


class ResourceCenterCreate(BaseModel):
    """Schema for creating a resource center manually."""

    name: str = Field(..., min_length=1, max_length=255)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    resource_type: ResourceType
    address: str | None = Field(default=None, max_length=500)
    osm_id: int | None = None


class ResourceCenterResponse(BaseModel):
    """Schema for resource center response."""

    id: int
    osm_id: int | None
    name: str
    lat: float
    lng: float
    resource_type: str
    address: str | None
    created_at: datetime
    updated_at: datetime
    has_inventory: bool = False

    model_config = {"from_attributes": True}


class ResourceCenterWithInventory(ResourceCenterResponse):
    """Schema for resource center with inventory details."""

    inventory: "InventoryResponse | None" = None


class DiscoveredResource(BaseModel):
    """Schema for a discovered resource from OSM."""

    osm_id: int
    name: str
    lat: float
    lng: float
    resource_type: str
    address: str | None = None
    distance_km: float | None = None


class ResourceDiscoveryRequest(BaseModel):
    """Schema for resource discovery request."""

    disaster_ids: list[int] = Field(
        ...,
        min_length=1,
        description="List of disaster IDs to discover resources around",
    )
    radius_km: float | None = Field(
        default=None,
        ge=1,
        le=100,
        description="Search radius in km (defaults to config value)",
    )
    resource_types: list[ResourceType] | None = Field(
        default=None,
        description="Filter by specific resource types",
    )


class ResourceDiscoveryResponse(BaseModel):
    """Schema for resource discovery response."""

    discovered: list[ResourceCenterResponse]
    count: int
    search_region: dict  # GeoJSON polygon
    message: str = "Resources discovered successfully"


class ResourceListResponse(BaseModel):
    """Schema for listing resources."""

    resources: list[ResourceCenterResponse]
    total: int
    page: int = 1
    page_size: int = 50


# Forward reference resolution
from app.schemas.inventory import InventoryResponse

ResourceCenterWithInventory.model_rebuild()
