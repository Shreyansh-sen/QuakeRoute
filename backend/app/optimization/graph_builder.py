"""
PHASE 2 — Geo-Spatial Graph Engine (graph_builder for HAQRA).

Builds a compact weighted optimization graph from disasters and resources.
Uses the existing app/graph/builder.py GraphBuilder but adds HAQRA-specific
edge cost functions and node creation logic.

Target: 20–50 optimization nodes maximum.
"""

from dataclasses import dataclass, field
from typing import Any

import networkx as nx

from app.core.logger import logger
from app.graph.builder import GraphBuilder, GraphNode, GraphEdgeData


@dataclass
class EdgeCostConfig:
    """Configuration for edge cost computation."""

    alpha: float = 0.5  # distance weight
    beta: float = 0.3   # traffic delay weight
    gamma: float = 0.2  # route risk weight
    # Speed assumptions for ETA (m/s)
    avg_speed_mps: float = 13.9  # ~50 km/h urban


@dataclass
class HAQRAGraphNode:
    """Extended graph node with HAQRA-specific metadata."""

    id: str
    node_type: str  # "disaster" or "resource"
    lat: float
    lng: float
    label: str
    severity: float = 0.0  # for disaster nodes
    resource_type: str = ""  # for resource nodes
    inventory_summary: dict[str, int] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


class HAQRAGraphEngine:
    """
    Builds the compact optimization graph for HAQRA.

    Nodes: disasters + resource centers only (no road intersections).
    Edges: weighted by distance, traffic penalty, and accessibility risk.
    """

    def __init__(self, config: EdgeCostConfig | None = None):
        self.config = config or EdgeCostConfig()
        self._builder = GraphBuilder()

    def build_optimization_graph(
        self,
        disaster_nodes: list[HAQRAGraphNode],
        resource_nodes: list[HAQRAGraphNode],
        edge_data: list[dict[str, Any]],
    ) -> nx.DiGraph:
        """
        Build the complete optimization graph.

        Args:
            disaster_nodes: List of disaster graph nodes
            resource_nodes: List of resource graph nodes
            edge_data: List of dicts with keys:
                source_id, target_id, distance_meters, duration_seconds,
                traffic_penalty (0-1), route_risk (0-1)

        Returns:
            NetworkX DiGraph ready for optimization
        """
        self._builder.reset()

        # Add disaster nodes
        self._create_disaster_nodes(disaster_nodes)

        # Add resource nodes
        self._create_resource_nodes(resource_nodes)

        # Connect edges
        self._connect_graph_edges(edge_data)

        graph = self._builder.build()

        logger.info(
            f"HAQRA graph built: {graph.number_of_nodes()} nodes, "
            f"{graph.number_of_edges()} edges"
        )

        return graph

    def _create_disaster_nodes(self, nodes: list[HAQRAGraphNode]) -> None:
        """Add disaster nodes to the graph."""
        for node in nodes:
            gn = GraphNode(
                id=node.id,
                node_type="disaster",
                lat=node.lat,
                lng=node.lng,
                label=node.label,
                metadata={
                    "severity": node.severity,
                    "disaster_type": node.metadata.get("disaster_type", ""),
                    "affected_population": node.metadata.get("affected_population", 0),
                    "priority": node.metadata.get("priority", "medium"),
                },
            )
            self._builder.add_node(gn)

    def _create_resource_nodes(self, nodes: list[HAQRAGraphNode]) -> None:
        """Add resource nodes to the graph."""
        for node in nodes:
            gn = GraphNode(
                id=node.id,
                node_type="resource",
                lat=node.lat,
                lng=node.lng,
                label=node.label,
                metadata={
                    "resource_type": node.resource_type,
                    "inventory": node.inventory_summary,
                },
            )
            self._builder.add_node(gn)

    def _connect_graph_edges(self, edge_data: list[dict[str, Any]]) -> None:
        """Connect nodes with weighted edges."""
        for ed in edge_data:
            cost = self.compute_edge_cost(
                distance_meters=ed["distance_meters"],
                traffic_penalty=ed.get("traffic_penalty", 0.0),
                route_risk=ed.get("route_risk", 0.0),
            )

            edge = GraphEdgeData(
                source_id=ed["source_id"],
                target_id=ed["target_id"],
                distance_meters=ed["distance_meters"],
                duration_seconds=ed["duration_seconds"],
                weight=cost,
                edge_type=ed.get("edge_type", "disaster_to_resource"),
                geometry=ed.get("geometry"),
            )
            self._builder.add_edge(edge, bidirectional=True)

    def compute_edge_cost(
        self,
        distance_meters: float,
        traffic_penalty: float = 0.0,
        route_risk: float = 0.0,
    ) -> float:
        """
        Compute edge cost using the formula:
        E_ij = alpha * distance + beta * traffic_delay + gamma * route_risk

        All components are normalized to comparable scales.

        Args:
            distance_meters: Raw distance in meters
            traffic_penalty: Traffic delay factor (0-1, 0 = no traffic)
            route_risk: Route risk factor (0-1, 0 = safe, 1 = very risky/blocked)

        Returns:
            Edge cost (lower = better route)
        """
        # Normalize distance to km
        distance_km = distance_meters / 1000.0

        # Traffic adds proportional delay
        traffic_cost = traffic_penalty * distance_km

        # Route risk (flood on road, damaged road, etc.)
        risk_cost = route_risk * distance_km

        cost = (
            self.config.alpha * distance_km
            + self.config.beta * traffic_cost
            + self.config.gamma * risk_cost
        )

        return max(0.01, cost)

    def compute_route_risk(
        self,
        disaster_type: str,
        distance_meters: float,
        is_road_flooded: bool = False,
        is_road_blocked: bool = False,
    ) -> float:
        """
        Compute route risk based on disaster type and road conditions.

        Args:
            disaster_type: Type of disaster affecting the area
            distance_meters: Distance of the route
            is_road_flooded: Whether route passes through flooded areas
            is_road_blocked: Whether route is physically blocked

        Returns:
            Risk score 0-1
        """
        if is_road_blocked:
            return 1.0

        base_risk = 0.0

        if is_road_flooded:
            base_risk = 0.8

        # Disaster type proximity risks
        disaster_risk_factor = {
            "flood": 0.4,
            "earthquake": 0.5,
            "fire": 0.3,
            "landslide": 0.7,
            "cyclone": 0.4,
            "tsunami": 0.6,
        }
        base_risk = max(base_risk, disaster_risk_factor.get(disaster_type, 0.1))

        # Reduce risk for longer routes (unlikely to all be affected)
        if distance_meters > 10_000:
            base_risk *= 0.7

        return min(1.0, base_risk)

    def compute_eta(
        self,
        distance_meters: float,
        duration_seconds: float,
        traffic_penalty: float = 0.0,
    ) -> float:
        """
        Compute estimated time of arrival.

        Args:
            distance_meters: Route distance
            duration_seconds: Base OSRM duration
            traffic_penalty: Additional traffic delay factor (0-1)

        Returns:
            ETA in seconds
        """
        # Base ETA from OSRM
        eta = duration_seconds

        # Add traffic penalty (up to 2x delay)
        eta *= (1.0 + traffic_penalty)

        return eta

