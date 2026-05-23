"""
Disaster-related Pydantic schemas for request/response validation.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class DisasterType(str, Enum):
    """Types of disasters supported."""

    FLOOD = "flood"
    EARTHQUAKE = "earthquake"
    FIRE = "fire"
    CYCLONE = "cyclone"
    LANDSLIDE = "landslide"
    TSUNAMI = "tsunami"
    DROUGHT = "drought"
    OTHER = "other"


class Priority(str, Enum):
    """Priority levels for disasters."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DisasterCreate(BaseModel):
    """Schema for creating a single disaster."""

    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")
    disaster_type: DisasterType = Field(..., description="Type of disaster")
    severity: int = Field(default=5, ge=1, le=10, description="Severity (1-10)")
    affected_population: int = Field(default=0, ge=0, description="Affected population count")
    priority: Priority = Field(default=Priority.MEDIUM, description="Priority level")
    notes: str | None = Field(default=None, max_length=1000, description="Additional notes")


class DisasterBulkCreate(BaseModel):
    """Schema for creating multiple disasters at once."""

    disasters: list[DisasterCreate] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of disasters to create",
    )


class DisasterResponse(BaseModel):
    """Schema for disaster response."""

    id: int
    lat: float
    lng: float
    disaster_type: str
    severity: int
    affected_population: int
    priority: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DisasterBulkResponse(BaseModel):
    """Schema for bulk disaster creation response."""

    created: list[DisasterResponse]
    count: int
    message: str = "Disasters created successfully"


class DisasterUpdate(BaseModel):
    """Schema for updating a disaster."""

    disaster_type: DisasterType | None = None
    severity: int | None = Field(default=None, ge=1, le=10)
    affected_population: int | None = Field(default=None, ge=0)
    priority: Priority | None = None
    notes: str | None = Field(default=None, max_length=1000)


class DisasterListResponse(BaseModel):
    """Schema for listing disasters."""

    disasters: list[DisasterResponse]
    total: int
    page: int = 1
    page_size: int = 50


class DisasterIdsRequest(BaseModel):
    """Schema for requesting disaster IDs for resource discovery."""

    disaster_ids: list[int] = Field(
        ...,
        min_length=1,
        description="List of disaster IDs to use for resource discovery",
    )
