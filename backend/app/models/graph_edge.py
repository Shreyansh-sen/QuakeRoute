"""
Graph Edge model for storing graph connections.
"""

from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.disaster import Disaster
    from app.models.resource_center import ResourceCenter


class GraphEdge(Base, TimestampMixin):
    """
    Model representing an edge in the resource allocation graph.
    
    Edges connect:
    - Disaster to Resource
    - Resource to Resource
    - Disaster to Disaster (rare)
    
    Stores route metadata from OSRM.
    """

    __tablename__ = "graph_edges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Source node (either disaster or resource)
    source_disaster_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("disasters.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    source_resource_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("resource_centers.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Target node (either disaster or resource)
    target_disaster_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("disasters.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    target_resource_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("resource_centers.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Edge metadata
    distance_meters: Mapped[float] = mapped_column(Float, nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Edge weight for optimization (computed from distance, time, priority)
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    # Route geometry (encoded polyline or GeoJSON)
    route_geometry: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Edge type for filtering
    edge_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="disaster_to_resource",
    )

    # Relationships
    source_disaster: Mapped["Disaster | None"] = relationship(
        "Disaster",
        foreign_keys=[source_disaster_id],
        back_populates="edges_from",
    )
    target_disaster: Mapped["Disaster | None"] = relationship(
        "Disaster",
        foreign_keys=[target_disaster_id],
        back_populates="edges_to",
    )
    source_resource: Mapped["ResourceCenter | None"] = relationship(
        "ResourceCenter",
        foreign_keys=[source_resource_id],
        back_populates="edges_from",
    )
    target_resource: Mapped["ResourceCenter | None"] = relationship(
        "ResourceCenter",
        foreign_keys=[target_resource_id],
        back_populates="edges_to",
    )

    def __repr__(self) -> str:
        src = f"D{self.source_disaster_id}" if self.source_disaster_id else f"R{self.source_resource_id}"
        tgt = f"D{self.target_disaster_id}" if self.target_disaster_id else f"R{self.target_resource_id}"
        return f"<GraphEdge(id={self.id}, {src} -> {tgt}, dist={self.distance_meters:.0f}m)>"

    @property
    def source_node_id(self) -> str:
        """Get source node identifier."""
        if self.source_disaster_id:
            return f"disaster_{self.source_disaster_id}"
        return f"resource_{self.source_resource_id}"

    @property
    def target_node_id(self) -> str:
        """Get target node identifier."""
        if self.target_disaster_id:
            return f"disaster_{self.target_disaster_id}"
        return f"resource_{self.target_resource_id}"
