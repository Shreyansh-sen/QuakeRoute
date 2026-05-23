"""
Graph builder utilities for constructing the resource allocation graph.
"""

from dataclasses import dataclass, field
from typing import Any

import networkx as nx

from app.core.logger import logger


@dataclass
class GraphNode:
    """Represents a node in the graph."""

    id: str
    node_type: str  # "disaster" or "resource"
    lat: float
    lng: float
    label: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class GraphEdgeData:
    """Represents edge data in the graph."""

    source_id: str
    target_id: str
    distance_meters: float
    duration_seconds: float
    weight: float
    edge_type: str
    geometry: dict | None = None


class GraphBuilder:
    """
    Builder class for constructing NetworkX graphs.
    
    Provides a fluent interface for graph construction.
    """

    def __init__(self):
        self._graph: nx.DiGraph = nx.DiGraph()
        self._nodes: dict[str, GraphNode] = {}
        self._edges: list[GraphEdgeData] = []

    def add_node(self, node: GraphNode) -> "GraphBuilder":
        """Add a node to the graph."""
        self._nodes[node.id] = node
        self._graph.add_node(
            node.id,
            node_type=node.node_type,
            lat=node.lat,
            lng=node.lng,
            label=node.label,
            **node.metadata,
        )
        return self

    def add_nodes(self, nodes: list[GraphNode]) -> "GraphBuilder":
        """Add multiple nodes to the graph."""
        for node in nodes:
            self.add_node(node)
        return self

    def add_edge(self, edge: GraphEdgeData, bidirectional: bool = True) -> "GraphBuilder":
        """
        Add an edge to the graph.
        
        Args:
            edge: Edge data
            bidirectional: If True, adds reverse edge as well
        """
        self._edges.append(edge)
        
        self._graph.add_edge(
            edge.source_id,
            edge.target_id,
            distance=edge.distance_meters,
            duration=edge.duration_seconds,
            weight=edge.weight,
            edge_type=edge.edge_type,
            geometry=edge.geometry,
        )
        
        if bidirectional:
            self._graph.add_edge(
                edge.target_id,
                edge.source_id,
                distance=edge.distance_meters,
                duration=edge.duration_seconds,
                weight=edge.weight,
                edge_type=edge.edge_type,
                geometry=edge.geometry,
            )
        
        return self

    def add_edges(
        self,
        edges: list[GraphEdgeData],
        bidirectional: bool = True,
    ) -> "GraphBuilder":
        """Add multiple edges to the graph."""
        for edge in edges:
            self.add_edge(edge, bidirectional)
        return self

    def build(self) -> nx.DiGraph:
        """Build and return the graph."""
        logger.info(
            f"Built graph with {self._graph.number_of_nodes()} nodes "
            f"and {self._graph.number_of_edges()} edges"
        )
        return self._graph

    def get_nodes(self) -> dict[str, GraphNode]:
        """Get all nodes."""
        return self._nodes.copy()

    def get_edges(self) -> list[GraphEdgeData]:
        """Get all edges."""
        return self._edges.copy()

    def reset(self) -> "GraphBuilder":
        """Reset the builder."""
        self._graph = nx.DiGraph()
        self._nodes = {}
        self._edges = []
        return self


class GraphAnalyzer:
    """Utilities for analyzing graphs."""

    def __init__(self, graph: nx.DiGraph):
        self.graph = graph

    def get_density(self) -> float:
        """Calculate graph density."""
        return nx.density(self.graph)

    def get_connected_components(self) -> int:
        """Get number of weakly connected components."""
        return nx.number_weakly_connected_components(self.graph)

    def get_node_degrees(self) -> dict[str, int]:
        """Get degree of each node."""
        return dict(self.graph.degree())

    def get_shortest_path(
        self,
        source: str,
        target: str,
        weight: str = "weight",
    ) -> tuple[list[str], float]:
        """
        Find shortest path between nodes.
        
        Returns:
            Tuple of (path, total_weight)
        """
        try:
            path = nx.shortest_path(self.graph, source, target, weight=weight)
            length = nx.shortest_path_length(self.graph, source, target, weight=weight)
            return path, length
        except nx.NetworkXNoPath:
            return [], float("inf")

    def get_all_shortest_paths(
        self,
        source: str,
        weight: str = "weight",
    ) -> dict[str, tuple[list[str], float]]:
        """
        Find shortest paths from source to all reachable nodes.
        
        Returns:
            Dict of target -> (path, total_weight)
        """
        try:
            paths = nx.single_source_dijkstra(self.graph, source, weight=weight)
            # paths returns (distances, paths)
            distances, path_dict = paths
            return {
                target: (path, distances[target])
                for target, path in path_dict.items()
            }
        except nx.NetworkXError:
            return {}

    def get_centrality(self, method: str = "degree") -> dict[str, float]:
        """
        Calculate node centrality.
        
        Args:
            method: "degree", "betweenness", or "closeness"
        """
        if method == "degree":
            return nx.degree_centrality(self.graph)
        elif method == "betweenness":
            return nx.betweenness_centrality(self.graph)
        elif method == "closeness":
            return nx.closeness_centrality(self.graph)
        else:
            raise ValueError(f"Unknown centrality method: {method}")

    def find_critical_nodes(self, top_n: int = 5) -> list[tuple[str, float]]:
        """
        Find the most critical nodes by betweenness centrality.
        
        These are nodes whose removal would most affect connectivity.
        """
        centrality = nx.betweenness_centrality(self.graph)
        sorted_nodes = sorted(
            centrality.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        return sorted_nodes[:top_n]

    def to_dict(self) -> dict:
        """Convert graph to dictionary representation."""
        return {
            "nodes": [
                {
                    "id": node,
                    **self.graph.nodes[node],
                }
                for node in self.graph.nodes()
            ],
            "edges": [
                {
                    "source": u,
                    "target": v,
                    **data,
                }
                for u, v, data in self.graph.edges(data=True)
            ],
            "stats": {
                "node_count": self.graph.number_of_nodes(),
                "edge_count": self.graph.number_of_edges(),
                "density": self.get_density(),
                "components": self.get_connected_components(),
            },
        }
