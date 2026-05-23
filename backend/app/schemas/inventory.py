"""
Inventory-related Pydantic schemas for request/response validation.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class InventoryBase(BaseModel):
    """Base schema for inventory fields."""

    # Hospital-specific
    beds: int | None = Field(default=None, ge=0)
    ambulances: int | None = Field(default=None, ge=0)
    doctors: int | None = Field(default=None, ge=0)
    medical_kits: int | None = Field(default=None, ge=0)

    # Warehouse/Shelter-specific
    food: int | None = Field(default=None, ge=0, description="Food units")
    water: int | None = Field(default=None, ge=0, description="Water units")
    medicine: int | None = Field(default=None, ge=0, description="Medicine units")

    # Fire Station-specific
    fire_trucks: int | None = Field(default=None, ge=0)
    rescue_team: int | None = Field(default=None, ge=0)

    # Generic
    capacity: int | None = Field(default=None, ge=0)

    # Flexible additional inventory
    extra_inventory: dict | None = Field(default=None)


class InventoryCreate(InventoryBase):
    """Schema for creating/updating inventory."""

    resource_center_id: int = Field(..., description="ID of the resource center")


class InventoryUpdate(InventoryBase):
    """Schema for updating inventory (all fields optional)."""

    pass


class InventoryResponse(InventoryBase):
    """Schema for inventory response."""

    id: int
    resource_center_id: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class InventoryBulkUpdate(BaseModel):
    """Schema for bulk inventory updates."""

    updates: list[InventoryCreate] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of inventory updates",
    )


class InventoryBulkResponse(BaseModel):
    """Schema for bulk inventory update response."""

    updated: list[InventoryResponse]
    count: int
    message: str = "Inventories updated successfully"
