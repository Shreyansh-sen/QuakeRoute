"""
Route generator for creating graph edges from route data.
"""

from dataclasses import dataclass
from typing import Any

from app.core.logger import logger
from app.graph.builder import GraphEdgeData
from app.integrations.osrm_client import RouteResult


@dataclass
class RouteGeneratorConfig:
    """Configuration for route generation."""

    max_distance_km: float = 50.0
    include_geometry: bool = True
    weight_distance_factor: float = 0.4
    weight_time_factor: float = 0.6
    priority_multipliers: dict[str, float] | None = None

    def __post_init__(self):
        if self.priority_multipliers is None:
            self.priority_multipliers = {
                "critical": 0.5,
                "high": 0.75,
                "medium": 1.0,
                "low": 1.5,
            }


class RouteGenerator:
    """
    Generates graph edges from route calculations.
    
    Transforms OSRM route results into graph edge data with
    calculated weights for optimization.
    """

    def __init__(self, config: RouteGeneratorConfig | None = None):
        self.config = config or RouteGeneratorConfig()

    def calculate_weight(
        self,
        distance_meters: float,
        duration_seconds: float,
        priority: str = "medium",
    ) -> float:
        """
        Calculate edge weight for optimization.
        
        Args:
            distance_meters: Distance in meters
            duration_seconds: Duration in seconds
            priority: Priority level
            
        Returns:
            Calculated weight
        """
        # Normalize distance and time
        distance_km = distance_meters / 1000
        duration_min = duration_seconds / 60
        
        # Combined weight
        base_weight = (
            self.config.weight_time_factor * duration_min
            + self.config.weight_distance_factor * distance_km
        )
        
        # Apply priority multiplier
        multiplier = self.config.priority_multipliers.get(priority.lower(), 1.0)
        weight = base_weight * multiplier
        
        return max(0.1, weight)

    def route_to_edge(
        self,
        route: RouteResult,
        source_id: str,
        target_id: str,
        edge_type: str = "disaster_to_resource",
        priority: str = "medium",
    ) -> GraphEdgeData | None:
        """
        Convert a route result to a graph edge.
        
        Args:
            route: OSRM route result
            source_id: Source node ID
            target_id: Target node ID
            edge_type: Type of edge
            priority: Priority for weight calculation
            
        Returns:
            GraphEdgeData or None if route exceeds max distance
        """
        # Check max distance
        if route.distance_meters > (self.config.max_distance_km * 1000):
            logger.debug(
                f"Route {source_id} -> {target_id} exceeds max distance: "
                f"{route.distance_meters/1000:.2f}km"
            )
            return None
        
        weight = self.calculate_weight(
            route.distance_meters,
            route.duration_seconds,
            priority,
        )
        
        return GraphEdgeData(
            source_id=source_id,
            target_id=target_id,
            distance_meters=route.distance_meters,
            duration_seconds=route.duration_seconds,
            weight=weight,
            edge_type=edge_type,
            geometry=route.geometry if self.config.include_geometry else None,
        )

    def create_edge_from_matrix(
        self,
        source_id: str,
        target_id: str,
        distance_meters: float,
        duration_seconds: float,
        edge_type: str = "disaster_to_resource",
        priority: str = "medium",
    ) -> GraphEdgeData | None:
        """
        Create edge from distance matrix data.
        
        Args:
            source_id: Source node ID
            target_id: Target node ID
            distance_meters: Distance in meters
            duration_seconds: Duration in seconds
            edge_type: Type of edge
            priority: Priority for weight calculation
            
        Returns:
            GraphEdgeData or None if exceeds max distance
        """
        if distance_meters > (self.config.max_distance_km * 1000):
            return None
        
        if distance_meters == float("inf") or duration_seconds == float("inf"):
            return None
        
        weight = self.calculate_weight(
            distance_meters,
            duration_seconds,
            priority,
        )
        
        return GraphEdgeData(
            source_id=source_id,
            target_id=target_id,
            distance_meters=distance_meters,
            duration_seconds=duration_seconds,
            weight=weight,
            edge_type=edge_type,
            geometry=None,
        )

    def generate_edges_from_routes(
        self,
        routes: list[tuple[str, str, RouteResult, str]],
    ) -> list[GraphEdgeData]:
        """
        Generate edges from multiple routes.
        
        Args:
            routes: List of (source_id, target_id, route, priority) tuples
            
        Returns:
            List of GraphEdgeData objects
        """
        edges = []
        
        for source_id, target_id, route, priority in routes:
            edge = self.route_to_edge(
                route=route,
                source_id=source_id,
                target_id=target_id,
                priority=priority,
            )
            if edge:
                edges.append(edge)
        
        logger.info(f"Generated {len(edges)} edges from {len(routes)} routes")
        return edges
