"""
Resource Inventory model for storing enriched resource data.
Separate from resource_centers as inventory changes frequently.
"""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.resource_center import ResourceCenter


class ResourceInventory(Base, TimestampMixin):
    """
    Model representing inventory for a resource center.
    
    Uses a flexible JSON field for type-specific inventory
    plus common fields for quick access.
    """

    __tablename__ = "resource_inventory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    resource_center_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("resource_centers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Hospital-specific
    beds: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    ambulances: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    doctors: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    medical_kits: Mapped[int] = mapped_column(Integer, nullable=True, default=0)

    # Warehouse/Shelter-specific
    food: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    water: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    medicine: Mapped[int] = mapped_column(Integer, nullable=True, default=0)

    # Fire Station-specific
    fire_trucks: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    rescue_team: Mapped[int] = mapped_column(Integer, nullable=True, default=0)

    # Generic capacity
    capacity: Mapped[int] = mapped_column(Integer, nullable=True, default=0)

    # Flexible field for additional inventory items
    extra_inventory: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationship
    resource_center: Mapped["ResourceCenter"] = relationship(
        "ResourceCenter",
        back_populates="inventory",
    )

    def __repr__(self) -> str:
        return f"<ResourceInventory(id={self.id}, center_id={self.resource_center_id})>"

    def get_total_capacity(self) -> int:
        """Calculate total capacity based on resource type."""
        return (
            (self.beds or 0)
            + (self.capacity or 0)
            + (self.food or 0)
            + (self.water or 0)
        )
