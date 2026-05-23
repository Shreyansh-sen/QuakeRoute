"""
Graph service for building and managing the resource allocation graph.
"""

from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import GraphBuildException
from app.core.logger import logger
from app.models.disaster import Disaster
from app.models.graph_edge import GraphEdge
from app.models.resource_center import ResourceCenter
from app.services.route_service import route_service


class GraphService:
    """Service for graph construction and management."""

    def __init__(self, db: Session):
        self.db = db

    async def build_graph(
        self,
        disaster_ids: list[int] | None = None,
        resource_ids: list[int] | None = None,
        include_geometry: bool = True,
        max_distance_km: float = 50.0,
    ) -> tuple[list[dict], list[GraphEdge]]:
        """
        Build graph from disasters and resources.
        
        Args:
            disaster_ids: Specific disaster IDs (all if None)
            resource_ids: Specific resource IDs (all if None)
            include_geometry: Include route geometry in edges
            max_distance_km: Maximum distance for edges in km
            
        Returns:
            Tuple of (nodes list, edges list)
        """
        # Get disasters
        disaster_query = select(Disaster)
        if disaster_ids:
            disaster_query = disaster_query.where(Disaster.id.in_(disaster_ids))
        disasters = list(self.db.execute(disaster_query).scalars().all())
        
        # Get resources
        resource_query = select(ResourceCenter)
        if resource_ids:
            resource_query = resource_query.where(ResourceCenter.id.in_(resource_ids))
        resources = list(self.db.execute(resource_query).scalars().all())
        
        if not disasters:
            raise GraphBuildException(
                message="No disasters found for graph building",
            )
        
        if not resources:
            raise GraphBuildException(
                message="No resources found for graph building",
            )
        
        logger.info(
            f"Building graph with {len(disasters)} disasters and {len(resources)} resources"
        )
        
        # Clear existing edges for these nodes
        await self._clear_existing_edges(
            disaster_ids=[d.id for d in disasters],
            resource_ids=[r.id for r in resources],
        )
        
        # Build nodes
        nodes = self._build_nodes(disasters, resources)
        
        # Build edges (disaster -> resource connections)
        edges = await self._build_edges(
            disasters=disasters,
            resources=resources,
            include_geometry=include_geometry,
            max_distance_km=max_distance_km,
        )
        
        logger.info(f"Graph built: {len(nodes)} nodes, {len(edges)} edges")
        
        return nodes, edges

    def _build_nodes(
        self,
        disasters: list[Disaster],
        resources: list[ResourceCenter],
    ) -> list[dict]:
        """Build node representations."""
        nodes = []
        
        # Disaster nodes
        for disaster in disasters:
            nodes.append({
                "id": f"disaster_{disaster.id}",
                "node_type": "disaster",
                "lat": disaster.lat,
                "lng": disaster.lng,
                "label": f"{disaster.disaster_type.title()} (Severity: {disaster.severity})",
                "metadata": {
                    "disaster_type": disaster.disaster_type,
                    "severity": disaster.severity,
                    "affected_population": disaster.affected_population,
                    "priority": disaster.priority,
                },
            })
        
        # Resource nodes
        for resource in resources:
            has_inventory = resource.inventory is not None
            nodes.append({
                "id": f"resource_{resource.id}",
                "node_type": "resource",
                "lat": resource.lat,
                "lng": resource.lng,
                "label": resource.name,
                "metadata": {
                    "resource_type": resource.resource_type,
                    "has_inventory": has_inventory,
                    "osm_id": resource.osm_id,
                },
            })
        
        return nodes

    async def _build_edges(
        self,
        disasters: list[Disaster],
        resources: list[ResourceCenter],
        include_geometry: bool,
        max_distance_km: float,
    ) -> list[GraphEdge]:
        """Build edges between nodes using OSRM."""
        edges = []
        max_distance_m = max_distance_km * 1000
        
        # Build edges from each disaster to nearby resources
        for disaster in disasters:
            for resource in resources:
                try:
                    route = await route_service.get_route(
                        source_lat=disaster.lat,
                        source_lng=disaster.lng,
                        target_lat=resource.lat,
                        target_lng=resource.lng,
                        include_geometry=include_geometry,
                    )
                    
                    # Skip if distance exceeds maximum
                    if route.distance_meters > max_distance_m:
                        continue
                    
                    # Calculate edge weight
                    weight = await route_service.calculate_edge_weight(
                        distance_meters=route.distance_meters,
                        duration_seconds=route.duration_seconds,
                        priority=disaster.priority,
                    )
                    
                    edge = GraphEdge(
                        source_disaster_id=disaster.id,
                        target_resource_id=resource.id,
                        distance_meters=route.distance_meters,
                        duration_seconds=route.duration_seconds,
                        weight=weight,
                        route_geometry=route.geometry if include_geometry else None,
                        edge_type="disaster_to_resource",
                    )
                    
                    self.db.add(edge)
                    edges.append(edge)
                    
                except Exception as e:
                    logger.warning(
                        f"Failed to create edge from disaster {disaster.id} "
                        f"to resource {resource.id}: {e}"
                    )
                    continue
        
        self.db.commit()
        
        for edge in edges:
            self.db.refresh(edge)
        
        return edges

    async def _clear_existing_edges(
        self,
        disaster_ids: list[int],
        resource_ids: list[int],
    ) -> None:
        """Clear existing edges for the specified nodes."""
        # Delete edges where source or target matches
        stmt = delete(GraphEdge).where(
            (GraphEdge.source_disaster_id.in_(disaster_ids)) |
            (GraphEdge.target_disaster_id.in_(disaster_ids)) |
            (GraphEdge.source_resource_id.in_(resource_ids)) |
            (GraphEdge.target_resource_id.in_(resource_ids))
        )
        
        self.db.execute(stmt)
        self.db.commit()

    def get_graph_edges(
        self,
        disaster_ids: list[int] | None = None,
        resource_ids: list[int] | None = None,
    ) -> list[GraphEdge]:
        """
        Get existing graph edges.
        
        Args:
            disaster_ids: Filter by disaster IDs
            resource_ids: Filter by resource IDs
            
        Returns:
            List of GraphEdge models
        """
        query = select(GraphEdge)
        
        if disaster_ids:
            query = query.where(
                (GraphEdge.source_disaster_id.in_(disaster_ids)) |
                (GraphEdge.target_disaster_id.in_(disaster_ids))
            )
        
        if resource_ids:
            query = query.where(
                (GraphEdge.source_resource_id.in_(resource_ids)) |
                (GraphEdge.target_resource_id.in_(resource_ids))
            )
        
        return list(self.db.execute(query).scalars().all())

    def get_graph_stats(self) -> dict:
        """Get graph statistics."""
        from sqlalchemy import func
        
        # Count nodes
        disaster_count = self.db.execute(
            select(func.count()).select_from(Disaster)
        ).scalar() or 0
        
        resource_count = self.db.execute(
            select(func.count()).select_from(ResourceCenter)
        ).scalar() or 0
        
        # Count edges and calculate averages
        edge_stats = self.db.execute(
            select(
                func.count(GraphEdge.id),
                func.avg(GraphEdge.distance_meters),
                func.avg(GraphEdge.duration_seconds),
            )
        ).one()
        
        edge_count = edge_stats[0] or 0
        avg_distance = edge_stats[1] or 0
        avg_duration = edge_stats[2] or 0
        
        total_nodes = disaster_count + resource_count
        max_edges = total_nodes * (total_nodes - 1) / 2 if total_nodes > 1 else 1
        density = edge_count / max_edges if max_edges > 0 else 0
        
        return {
            "total_nodes": total_nodes,
            "disaster_nodes": disaster_count,
            "resource_nodes": resource_count,
            "total_edges": edge_count,
            "avg_edge_distance_km": avg_distance / 1000,
            "avg_edge_duration_min": avg_duration / 60,
            "graph_density": density,
        }
