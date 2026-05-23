"""
Resource Center model for storing discovered resources.
"""

from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.graph_edge import GraphEdge
    from app.models.resource_inventory import ResourceInventory


class ResourceType(str, Enum):
    """Types of resource centers."""

    HOSPITAL = "hospital"
    FIRE_STATION = "fire_station"
    POLICE = "police"
    SHELTER = "shelter"
    PHARMACY = "pharmacy"
    WAREHOUSE = "warehouse"
    NGO_CENTER = "ngo_center"


class ResourceCenter(Base, TimestampMixin):
    """Model representing a resource center (hospital, fire station, etc.)."""

    __tablename__ = "resource_centers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    osm_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    lng: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    inventory: Mapped["ResourceInventory | None"] = relationship(
        "ResourceInventory",
        back_populates="resource_center",
        uselist=False,
        lazy="joined",
    )
    edges_from: Mapped[list["GraphEdge"]] = relationship(
        "GraphEdge",
        foreign_keys="GraphEdge.source_resource_id",
        back_populates="source_resource",
        lazy="dynamic",
    )
    edges_to: Mapped[list["GraphEdge"]] = relationship(
        "GraphEdge",
        foreign_keys="GraphEdge.target_resource_id",
        back_populates="target_resource",
        lazy="dynamic",
    )

    def __repr__(self) -> str:
        return f"<ResourceCenter(id={self.id}, name={self.name}, type={self.resource_type})>"
