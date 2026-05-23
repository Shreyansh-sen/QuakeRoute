"""
PHASE 6 — Routing Optimization Engine.

Computes optimal delivery paths using:
- Primary: A* algorithm
- Fallback: Dijkstra

Inputs:
- Traffic-aware edge weights
- OSRM route metadata
- Accessibility penalties
- Road blockages

Outputs:
- Shortest ETA
- Optimal route (node sequence)
- Reroute recommendations
"""

from dataclasses import dataclass, field
from typing import Any

import networkx as nx

from app.core.logger import logger


@dataclass
class RouteOutput:
    """Output from routing optimization."""

    disaster_id: int
    resource_id: int
    path: list[str]  # node IDs in order
    total_distance_meters: float
    total_eta_seconds: float
    route_geometry: list[dict] | None = None  # optional per-edge geometry


@dataclass
class RerouteRecommendation:
    """A recommendation to reroute a delivery."""

    disaster_id: int
    resource_id: int
    original_path: list[str]
    new_path: list[str]
    reason: str
    eta_savings_seconds: float


@dataclass
class RoutingCacheEntry:
    """Cached route metadata."""

    source_id: str
    target_id: str
    path: list[str]
    distance_meters: float
    eta_seconds: float
    timestamp: float = 0.0


class RoutingEngine:
    """
    Computes optimal delivery routes from resources to disasters.

    Uses A* (with lat/lng heuristic) as primary algorithm,
    falls back to Dijkstra if A* fails.
    """

    def __init__(self):
        self._route_cache: dict[str, RoutingCacheEntry] = {}

    def compute_optimal_route(
        self,
        graph: nx.DiGraph,
        source_id: str,
        target_id: str,
        weight: str = "weight",
    ) -> RouteOutput | None:
        """
        Compute optimal route using A* with Dijkstra fallback.

        Args:
            graph: Optimization graph
            source_id: Source node ID (e.g., "resource_5")
            target_id: Target node ID (e.g., "disaster_1")
            weight: Edge weight attribute to use

        Returns:
            RouteOutput or None if no path exists
        """
        if source_id not in graph or target_id not in graph:
            return None

        # Try A* first (with haversine heuristic if lat/lng available)
        path = self._try_astar(graph, source_id, target_id, weight)

        # Fallback to Dijkstra
        if path is None:
            path = self._try_dijkstra(graph, source_id, target_id, weight)

        if path is None:
            return None

        # Calculate totals along path
        total_distance, total_eta = self._compute_path_metrics(graph, path)

        # Extract disaster/resource IDs
        disaster_id = self._extract_id(target_id, "disaster")
        resource_id = self._extract_id(source_id, "resource")

        route = RouteOutput(
            disaster_id=disaster_id,
            resource_id=resource_id,
            path=path,
            total_distance_meters=total_distance,
            total_eta_seconds=total_eta,
        )

        # Cache the route
        cache_key = f"{source_id}_{target_id}"
        self._route_cache[cache_key] = RoutingCacheEntry(
            source_id=source_id,
            target_id=target_id,
            path=path,
            distance_meters=total_distance,
            eta_seconds=total_eta,
        )

        return route

    def compute_shortest_eta(
        self,
        graph: nx.DiGraph,
        disaster_id: str,
        resource_ids: list[str],
    ) -> tuple[str | None, float]:
        """
        Find the resource with shortest ETA to a disaster.

        Args:
            graph: Optimization graph
            disaster_id: Target disaster node ID
            resource_ids: List of candidate resource node IDs

        Returns:
            Tuple of (best_resource_id, eta_seconds) or (None, inf)
        """
        best_resource = None
        best_eta = float("inf")

        for resource_id in resource_ids:
            route = self.compute_optimal_route(graph, resource_id, disaster_id)
            if route and route.total_eta_seconds < best_eta:
                best_eta = route.total_eta_seconds
                best_resource = resource_id

        return best_resource, best_eta

    def reroute_if_blocked(
        self,
        graph: nx.DiGraph,
        original_route: RouteOutput,
        blocked_edges: list[tuple[str, str]],
    ) -> RerouteRecommendation | None:
        """
        Reroute if original path passes through blocked edges.

        Args:
            graph: Optimization graph
            original_route: The original route
            blocked_edges: List of (source, target) edge pairs that are blocked

        Returns:
            RerouteRecommendation or None if reroute not needed/possible
        """
        # Check if original path uses any blocked edge
        path = original_route.path
        needs_reroute = False

        for i in range(len(path) - 1):
            edge = (path[i], path[i + 1])
            if edge in blocked_edges or (edge[1], edge[0]) in blocked_edges:
                needs_reroute = True
                break

        if not needs_reroute:
            return None

        # Create modified graph without blocked edges
        modified_graph = graph.copy()
        for u, v in blocked_edges:
            if modified_graph.has_edge(u, v):
                modified_graph.remove_edge(u, v)
            if modified_graph.has_edge(v, u):
                modified_graph.remove_edge(v, u)

        # Find new route
        source_id = f"resource_{original_route.resource_id}"
        target_id = f"disaster_{original_route.disaster_id}"

        new_route = self.compute_optimal_route(modified_graph, source_id, target_id)

        if new_route is None:
            logger.warning(
                f"Cannot reroute from resource_{original_route.resource_id} "
                f"to disaster_{original_route.disaster_id} — all paths blocked"
            )
            return None

        eta_savings = original_route.total_eta_seconds - new_route.total_eta_seconds

        return RerouteRecommendation(
            disaster_id=original_route.disaster_id,
            resource_id=original_route.resource_id,
            original_path=original_route.path,
            new_path=new_route.path,
            reason="Road blockage detected on original route",
            eta_savings_seconds=eta_savings,
        )

    def cache_route_metadata(self, route: RouteOutput) -> None:
        """Cache route for quick retrieval."""
        cache_key = f"resource_{route.resource_id}_disaster_{route.disaster_id}"
        self._route_cache[cache_key] = RoutingCacheEntry(
            source_id=f"resource_{route.resource_id}",
            target_id=f"disaster_{route.disaster_id}",
            path=route.path,
            distance_meters=route.total_distance_meters,
            eta_seconds=route.total_eta_seconds,
        )

    def get_cached_route(self, source_id: str, target_id: str) -> RoutingCacheEntry | None:
        """Retrieve a cached route."""
        cache_key = f"{source_id}_{target_id}"
        return self._route_cache.get(cache_key)

    def clear_cache(self) -> None:
        """Clear the route cache."""
        self._route_cache.clear()

    # --- Private helpers ---

    def _try_astar(
        self,
        graph: nx.DiGraph,
        source: str,
        target: str,
        weight: str,
    ) -> list[str] | None:
        """Try A* with lat/lng heuristic."""
        try:
            # Build heuristic using haversine on node lat/lng
            def heuristic(u: str, v: str) -> float:
                u_data = graph.nodes.get(u, {})
                v_data = graph.nodes.get(v, {})
                u_lat = u_data.get("lat", 0)
                u_lng = u_data.get("lng", 0)
                v_lat = v_data.get("lat", 0)
                v_lng = v_data.get("lng", 0)

                if not (u_lat and u_lng and v_lat and v_lng):
                    return 0.0

                # Approximate haversine in km (simplified for speed)
                dlat = abs(u_lat - v_lat)
                dlng = abs(u_lng - v_lng)
                return (dlat + dlng) * 111.0  # rough km

            path = nx.astar_path(graph, source, target, heuristic=heuristic, weight=weight)
            return path
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

    def _try_dijkstra(
        self,
        graph: nx.DiGraph,
        source: str,
        target: str,
        weight: str,
    ) -> list[str] | None:
        """Fallback to Dijkstra."""
        try:
            path = nx.shortest_path(graph, source, target, weight=weight)
            return path
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

    def _compute_path_metrics(
        self,
        graph: nx.DiGraph,
        path: list[str],
    ) -> tuple[float, float]:
        """Compute total distance and ETA for a path."""
        total_distance = 0.0
        total_duration = 0.0

        for i in range(len(path) - 1):
            edge_data = graph.get_edge_data(path[i], path[i + 1]) or {}
            total_distance += edge_data.get("distance", 0)
            total_duration += edge_data.get("duration", 0)

        return total_distance, total_duration

    def _extract_id(self, node_id: str, prefix: str) -> int:
        """Extract numeric ID from node ID string."""
        try:
            if node_id.startswith(f"{prefix}_"):
                return int(node_id.split("_")[1])
        except (ValueError, IndexError):
            pass
        return 0

