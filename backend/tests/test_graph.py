"""
Tests for graph module.
"""

import pytest
import networkx as nx

from app.graph.builder import GraphBuilder, GraphAnalyzer, GraphNode, GraphEdgeData
from app.graph.route_generator import RouteGenerator, RouteGeneratorConfig


class TestGraphBuilder:
    """Test cases for GraphBuilder."""

    def test_add_node(self):
        """Test adding a single node."""
        builder = GraphBuilder()
        
        node = GraphNode(
            id="disaster_1",
            node_type="disaster",
            lat=12.97,
            lng=77.59,
            label="Flood Zone",
        )
        
        builder.add_node(node)
        graph = builder.build()
        
        assert graph.number_of_nodes() == 1
        assert "disaster_1" in graph.nodes()

    def test_add_edge(self):
        """Test adding edges."""
        builder = GraphBuilder()
        
        # Add nodes
        builder.add_node(GraphNode(
            id="disaster_1",
            node_type="disaster",
            lat=12.97,
            lng=77.59,
            label="Flood Zone",
        ))
        builder.add_node(GraphNode(
            id="resource_1",
            node_type="resource",
            lat=12.98,
            lng=77.60,
            label="Hospital",
        ))
        
        # Add edge
        edge = GraphEdgeData(
            source_id="disaster_1",
            target_id="resource_1",
            distance_meters=5000.0,
            duration_seconds=600.0,
            weight=10.0,
            edge_type="disaster_to_resource",
        )
        builder.add_edge(edge, bidirectional=True)
        
        graph = builder.build()
        
        assert graph.number_of_edges() == 2  # Bidirectional
        assert graph.has_edge("disaster_1", "resource_1")
        assert graph.has_edge("resource_1", "disaster_1")

    def test_build_graph(self):
        """Test building complete graph."""
        builder = GraphBuilder()
        
        # Add multiple nodes
        nodes = [
            GraphNode(id="disaster_1", node_type="disaster", lat=12.97, lng=77.59, label="D1"),
            GraphNode(id="disaster_2", node_type="disaster", lat=13.02, lng=77.65, label="D2"),
            GraphNode(id="resource_1", node_type="resource", lat=12.98, lng=77.60, label="R1"),
        ]
        builder.add_nodes(nodes)
        
        # Add edges
        edges = [
            GraphEdgeData("disaster_1", "resource_1", 5000, 600, 10, "d2r"),
            GraphEdgeData("disaster_2", "resource_1", 8000, 900, 15, "d2r"),
        ]
        builder.add_edges(edges, bidirectional=True)
        
        graph = builder.build()
        
        assert graph.number_of_nodes() == 3
        assert graph.number_of_edges() == 4  # 2 edges * 2 directions


class TestGraphAnalyzer:
    """Test cases for GraphAnalyzer."""

    def test_get_shortest_path(self):
        """Test finding shortest path."""
        # Create a simple graph
        G = nx.DiGraph()
        G.add_edge("A", "B", weight=1)
        G.add_edge("B", "C", weight=2)
        G.add_edge("A", "C", weight=5)
        
        analyzer = GraphAnalyzer(G)
        path, length = analyzer.get_shortest_path("A", "C")
        
        assert path == ["A", "B", "C"]
        assert length == 3

    def test_get_density(self):
        """Test calculating graph density."""
        G = nx.DiGraph()
        G.add_edges_from([("A", "B"), ("B", "C"), ("C", "A")])
        
        analyzer = GraphAnalyzer(G)
        density = analyzer.get_density()
        
        assert 0 <= density <= 1


class TestRouteGenerator:
    """Test cases for RouteGenerator."""

    def test_calculate_weight(self):
        """Test weight calculation."""
        config = RouteGeneratorConfig(
            weight_distance_factor=0.4,
            weight_time_factor=0.6,
        )
        generator = RouteGenerator(config)
        
        weight = generator.calculate_weight(
            distance_meters=5000,  # 5 km
            duration_seconds=600,  # 10 minutes
            priority="high",
        )
        
        # (0.6 * 10 + 0.4 * 5) * 0.75 = (6 + 2) * 0.75 = 6
        assert weight == pytest.approx(6.0, rel=0.01)

    def test_calculate_weight_critical_priority(self):
        """Test weight with critical priority."""
        generator = RouteGenerator()
        
        weight_medium = generator.calculate_weight(5000, 600, "medium")
        weight_critical = generator.calculate_weight(5000, 600, "critical")
        
        assert weight_critical < weight_medium

    def test_create_edge_from_matrix_exceeds_max(self):
        """Test edge creation with distance exceeding max."""
        config = RouteGeneratorConfig(max_distance_km=10)
        generator = RouteGenerator(config)
        
        edge = generator.create_edge_from_matrix(
            source_id="A",
            target_id="B",
            distance_meters=15000,  # 15 km > 10 km max
            duration_seconds=1000,
        )
        
        assert edge is None

    def test_create_edge_from_matrix_within_limit(self):
        """Test edge creation within distance limit."""
        config = RouteGeneratorConfig(max_distance_km=50)
        generator = RouteGenerator(config)
        
        edge = generator.create_edge_from_matrix(
            source_id="disaster_1",
            target_id="resource_1",
            distance_meters=5000,
            duration_seconds=600,
        )
        
        assert edge is not None
        assert edge.source_id == "disaster_1"
        assert edge.target_id == "resource_1"
        assert edge.distance_meters == 5000
