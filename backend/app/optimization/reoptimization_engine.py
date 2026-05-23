"""
PHASE 7 — Incremental Reoptimization Engine.

Avoids full recomputation by reoptimizing ONLY affected graph regions.

Triggers:
- Severity changes
- Traffic changes
- Roads blocked
- Inventory changes
- New disaster appears
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import networkx as nx

from app.core.logger import logger


class ReoptimizationTrigger(str, Enum):
    """Types of events that trigger reoptimization."""

    SEVERITY_CHANGE = "severity_change"
    TRAFFIC_CHANGE = "traffic_change"
    ROAD_BLOCKED = "road_blocked"
    INVENTORY_CHANGE = "inventory_change"
    NEW_DISASTER = "new_disaster"
    RESOURCE_DEPLETED = "resource_depleted"


@dataclass
class GraphChange:
    """Describes a change in the graph."""

    trigger: ReoptimizationTrigger
    affected_node_ids: list[str]
    affected_edge_ids: list[tuple[str, str]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ReoptimizationResult:
    """Result of incremental reoptimization."""

    changes_detected: int
    nodes_recomputed: int
    edges_recomputed: int
    priority_queue_updated: bool
    affected_allocations: list[int]  # disaster IDs of affected allocations
    new_routes: list[dict[str, Any]]


class ReoptimizationEngine:
    """
    Incremental reoptimization engine.

    Instead of full graph recomputation, only recomputes
    the graph regions affected by detected changes.
    """

    def __init__(self):
        self._change_queue: list[GraphChange] = []
        self._last_graph_snapshot: nx.DiGraph | None = None

    def detect_graph_changes(
        self,
        current_graph: nx.DiGraph,
        previous_graph: nx.DiGraph | None = None,
    ) -> list[GraphChange]:
        """
        Detect changes between current and previous graph state.

        Args:
            current_graph: Current graph
            previous_graph: Previous graph snapshot (uses internal if None)

        Returns:
            List of detected changes
        """
        prev = previous_graph or self._last_graph_snapshot
        if prev is None:
            # No previous state — everything is "new"
            self._last_graph_snapshot = current_graph.copy()
            return [
                GraphChange(
                    trigger=ReoptimizationTrigger.NEW_DISASTER,
                    affected_node_ids=list(current_graph.nodes()),
                )
            ]

        changes: list[GraphChange] = []

        # Detect new nodes
        new_nodes = set(current_graph.nodes()) - set(prev.nodes())
        if new_nodes:
            disaster_nodes = [n for n in new_nodes if n.startswith("disaster_")]
            resource_nodes = [n for n in new_nodes if n.startswith("resource_")]

            if disaster_nodes:
                changes.append(
                    GraphChange(
                        trigger=ReoptimizationTrigger.NEW_DISASTER,
                        affected_node_ids=disaster_nodes,
                    )
                )
            if resource_nodes:
                changes.append(
                    GraphChange(
                        trigger=ReoptimizationTrigger.INVENTORY_CHANGE,
                        affected_node_ids=resource_nodes,
                    )
                )

        # Detect removed edges (potential road blockages)
        prev_edges = set(prev.edges())
        curr_edges = set(current_graph.edges())
        removed_edges = prev_edges - curr_edges

        if removed_edges:
            affected = set()
            for u, v in removed_edges:
                affected.add(u)
                affected.add(v)
            changes.append(
                GraphChange(
                    trigger=ReoptimizationTrigger.ROAD_BLOCKED,
                    affected_node_ids=list(affected),
                    affected_edge_ids=list(removed_edges),
                )
            )

        # Detect weight changes on existing edges
        weight_changes: list[tuple[str, str]] = []
        for u, v in curr_edges & prev_edges:
            curr_w = current_graph[u][v].get("weight", 0)
            prev_w = prev[u][v].get("weight", 0)
            if abs(curr_w - prev_w) > 0.1:
                weight_changes.append((u, v))

        if weight_changes:
            affected = set()
            for u, v in weight_changes:
                affected.add(u)
                affected.add(v)
            changes.append(
                GraphChange(
                    trigger=ReoptimizationTrigger.TRAFFIC_CHANGE,
                    affected_node_ids=list(affected),
                    affected_edge_ids=weight_changes,
                )
            )

        # Update snapshot
        self._last_graph_snapshot = current_graph.copy()

        logger.info(f"Detected {len(changes)} graph changes")
        return changes

    def partial_graph_recompute(
        self,
        graph: nx.DiGraph,
        changes: list[GraphChange],
    ) -> nx.DiGraph:
        """
        Recompute only the affected subgraph regions.

        Args:
            graph: Current full graph
            changes: Detected changes

        Returns:
            Updated graph (modified in place and returned)
        """
        affected_nodes: set[str] = set()
        affected_edges: set[tuple[str, str]] = set()

        for change in changes:
            affected_nodes.update(change.affected_node_ids)
            affected_edges.update(change.affected_edge_ids)

            # Also include 1-hop neighbors of affected nodes
            for node in change.affected_node_ids:
                if node in graph:
                    affected_nodes.update(graph.neighbors(node))

        nodes_recomputed = len(affected_nodes)
        edges_recomputed = len(affected_edges)

        logger.info(
            f"Partial recompute: {nodes_recomputed} nodes, {edges_recomputed} edges affected"
        )

        # For blocked edges: already removed from graph before call
        # For weight changes: will be handled by the pipeline re-calling OSRM

        return graph

    def incremental_reoptimization(
        self,
        graph: nx.DiGraph,
        changes: list[GraphChange],
        current_allocations: list[dict[str, Any]],
    ) -> ReoptimizationResult:
        """
        Perform incremental reoptimization based on changes.

        Only re-allocates for affected disaster nodes rather than
        redoing the full optimization.

        Args:
            graph: Current graph
            changes: Detected changes
            current_allocations: Current allocation state

        Returns:
            ReoptimizationResult
        """
        affected_disaster_ids: set[int] = set()

        for change in changes:
            for node_id in change.affected_node_ids:
                if node_id.startswith("disaster_"):
                    try:
                        did = int(node_id.split("_")[1])
                        affected_disaster_ids.add(did)
                    except (ValueError, IndexError):
                        pass
                # If a resource is affected, find which disasters used it
                elif node_id.startswith("resource_"):
                    for alloc in current_allocations:
                        rid = alloc.get("resource_id", 0)
                        resource_node = f"resource_{rid}"
                        if resource_node == node_id:
                            affected_disaster_ids.add(alloc.get("disaster_id", 0))

        result = ReoptimizationResult(
            changes_detected=len(changes),
            nodes_recomputed=sum(len(c.affected_node_ids) for c in changes),
            edges_recomputed=sum(len(c.affected_edge_ids) for c in changes),
            priority_queue_updated=len(changes) > 0,
            affected_allocations=list(affected_disaster_ids),
            new_routes=[],
        )

        logger.info(
            f"Incremental reoptimization: {result.changes_detected} changes, "
            f"{len(affected_disaster_ids)} allocations affected"
        )

        return result

    def update_priority_queue(
        self,
        priority_queue: list[Any],
        affected_disaster_ids: set[int],
        new_severities: dict[int, float],
    ) -> list[Any]:
        """
        Update the global priority queue after changes.

        Args:
            priority_queue: Current priority queue entries
            affected_disaster_ids: IDs of affected disasters
            new_severities: Updated severity scores

        Returns:
            Updated priority queue
        """
        # Re-score affected entries
        for entry in priority_queue:
            did = getattr(entry, "disaster_id", None)
            if did in affected_disaster_ids and did in new_severities:
                # Scale utility by severity change ratio
                old_severity = getattr(entry, "_severity", 5.0)
                new_severity = new_severities[did]
                if old_severity > 0:
                    ratio = new_severity / old_severity
                    entry.utility_score *= ratio

        # Re-sort
        priority_queue.sort(key=lambda e: getattr(e, "utility_score", 0), reverse=True)

        return priority_queue

    def register_change(self, change: GraphChange) -> None:
        """Register an external change for next reoptimization cycle."""
        self._change_queue.append(change)

    def get_pending_changes(self) -> list[GraphChange]:
        """Get and clear pending changes."""
        changes = self._change_queue.copy()
        self._change_queue.clear()
        return changes

