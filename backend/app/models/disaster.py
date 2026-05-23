"""
Disaster model for storing disaster nodes.
"""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.graph_edge import GraphEdge


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


class Disaster(Base, TimestampMixin):
    """Model representing a disaster location."""

    __tablename__ = "disasters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    lng: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    disaster_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    affected_population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    edges_from: Mapped[list["GraphEdge"]] = relationship(
        "GraphEdge",
        foreign_keys="GraphEdge.source_disaster_id",
        back_populates="source_disaster",
        lazy="dynamic",
    )
    edges_to: Mapped[list["GraphEdge"]] = relationship(
        "GraphEdge",
        foreign_keys="GraphEdge.target_disaster_id",
        back_populates="target_disaster",
        lazy="dynamic",
    )

    def __repr__(self) -> str:
        return f"<Disaster(id={self.id}, type={self.disaster_type}, severity={self.severity})>"
