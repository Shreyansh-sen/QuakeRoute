"""
HAQRA Pipeline — Hybrid Adaptive Quantum-Ready Resource Allocation.

Orchestrates the full optimization pipeline:
1. Compute dynamic severity
2. Build optimization graph
3. Filter feasible resources
4. Compute survival utility
5. Generate global priority queue
6. Allocate divisible resources
7. Allocate indivisible resources
8. Compute optimized routes
9. Return allocation plan
10. Monitor for reoptimization triggers

Final Output:
{
    "allocations": [],
    "routes": [],
    "eta_predictions": [],
    "survival_utility_score": float,
    "resource_shortages": [],
    "reroute_recommendations": [],
    "unfulfilled_demands": []
}
"""

import time
from dataclasses import dataclass, field
from typing import Any

import networkx as nx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import OptimizationException
from app.core.logger import logger
from app.models.disaster import Disaster
from app.models.graph_edge import GraphEdge
from app.models.resource_center import ResourceCenter
from app.models.resource_inventory import ResourceInventory

from app.optimization.severity_engine import (
    SeverityEngine,
    SeverityWeights,
    DisasterSeverityInput,
    SeverityResult,
)
from app.optimization.graph_builder import HAQRAGraphEngine, HAQRAGraphNode, EdgeCostConfig
from app.optimization.resource_filter import ResourceFilter, ResourceCandidate, FilterConfig
from app.optimization.survival_optimizer import (
    SurvivalOptimizer,
    DisasterDemand,
    ResourceSupply,
    PriorityQueueEntry,
)
from app.optimization.allocation_engine import AllocationEngine, AllocationResult
from app.optimization.routing_engine import RoutingEngine, RouteOutput, RerouteRecommendation
from app.optimization.reoptimization_engine import ReoptimizationEngine
from app.optimization.qaoa_adapter import QAOAAdapter, QAOAInput


@dataclass
class HAQRAConfig:
    """Configuration for the HAQRA pipeline."""

    severity_weights: SeverityWeights = field(default_factory=SeverityWeights)
    edge_cost_config: EdgeCostConfig = field(default_factory=EdgeCostConfig)
    filter_config: FilterConfig = field(default_factory=FilterConfig)
    max_distance_km: float = 50.0
    enable_rerouting: bool = True
    enable_quantum_prep: bool = False  # Set True when quantum is ready


@dataclass
class HAQRAResult:
    """Final output of the HAQRA pipeline."""

    allocations: list[dict[str, Any]]
    routes: list[dict[str, Any]]
    eta_predictions: list[dict[str, Any]]
    survival_utility_score: float
    resource_shortages: list[dict[str, Any]]
    reroute_recommendations: list[dict[str, Any]]
    unfulfilled_demands: dict[int, list[str]]
    # Metadata
    computation_time_ms: float = 0.0
    severity_scores: dict[int, float] = field(default_factory=dict)
    graph_stats: dict[str, Any] = field(default_factory=dict)
    quantum_input: QAOAInput | None = None
    # Performance metrics
    metrics: dict[str, Any] = field(default_factory=dict)


class HAQRAPipeline:
    """
    Main orchestration pipeline for HAQRA algorithm.

    Ties together all 8 phases into a single coherent execution flow.
    """

    def __init__(self, db: Session, config: HAQRAConfig | None = None):
        self.db = db
        self.config = config or HAQRAConfig()

        # Initialize engines
        self.severity_engine = SeverityEngine(self.config.severity_weights)
        self.graph_engine = HAQRAGraphEngine(self.config.edge_cost_config)
        self.resource_filter = ResourceFilter(self.config.filter_config)
        self.survival_optimizer = SurvivalOptimizer()
        self.allocation_engine = AllocationEngine()
        self.routing_engine = RoutingEngine()
        self.reoptimization_engine = ReoptimizationEngine()
        self.qaoa_adapter = QAOAAdapter()

    def run(
        self,
        disaster_ids: list[int] | None = None,
    ) -> HAQRAResult:
        """
        Execute the full HAQRA optimization pipeline.

        Args:
            disaster_ids: Specific disaster IDs to optimize (all if None)

        Returns:
            HAQRAResult with complete allocation plan
        """
        start_time = time.perf_counter()

        try:
            phase_timings: dict[str, float] = {}

            # --- Load data from DB ---
            t0 = time.perf_counter()
            disasters, resources, inventories, edges = self._load_data(disaster_ids)
            phase_timings["data_loading_ms"] = (time.perf_counter() - t0) * 1000

            # --- PHASE 1: Compute dynamic severity ---
            t0 = time.perf_counter()
            severity_inputs = self._build_severity_inputs(disasters, resources, inventories)
            severity_results = self.severity_engine.compute_dynamic_severity(severity_inputs)
            severity_map = {r.disaster_id: r.dynamic_severity for r in severity_results}
            phase_timings["severity_computation_ms"] = (time.perf_counter() - t0) * 1000

            # --- PHASE 2: Build optimization graph ---
            t0 = time.perf_counter()
            graph = self._build_graph(disasters, resources, edges, severity_map)
            phase_timings["graph_construction_ms"] = (time.perf_counter() - t0) * 1000

            # --- PHASE 3: Filter feasible resources ---
            t0 = time.perf_counter()
            feasible_resources = self._filter_resources(
                disasters, resources, inventories, edges
            )
            phase_timings["resource_filtering_ms"] = (time.perf_counter() - t0) * 1000

            # --- PHASE 4: Compute survival utility + priority queue ---
            t0 = time.perf_counter()
            demands, supplies = self._build_demands_and_supplies(
                disasters, feasible_resources, inventories, edges, severity_map
            )
            priority_queue = self.survival_optimizer.generate_global_priority_queue(
                demands, supplies
            )
            phase_timings["survival_utility_ms"] = (time.perf_counter() - t0) * 1000

            # --- PHASE 5: Hybrid allocation ---
            t0 = time.perf_counter()
            inv_dict = self._inventories_to_dict(inventories)
            disaster_severities = severity_map
            disaster_types = {d.id: d.disaster_type for d in disasters}
            resource_types = {r.id: r.resource_type for r in resources}

            allocation_result = self.allocation_engine.allocate(
                priority_queue=priority_queue,
                inventories=inv_dict,
                disaster_severities=disaster_severities,
                disaster_types=disaster_types,
                resource_types=resource_types,
            )
            phase_timings["allocation_ms"] = (time.perf_counter() - t0) * 1000

            # --- PHASE 6: Routing optimization ---
            t0 = time.perf_counter()
            routes = self._compute_routes(graph, allocation_result)
            phase_timings["routing_ms"] = (time.perf_counter() - t0) * 1000

            # --- PHASE 7: Check for reroute recommendations ---
            t0 = time.perf_counter()
            reroute_recs: list[RerouteRecommendation] = []
            if self.config.enable_rerouting:
                reroute_recs = self._check_reroutes(graph, routes)
            phase_timings["rerouting_ms"] = (time.perf_counter() - t0) * 1000

            # --- PHASE 8: Prepare quantum input (optional) ---
            t0 = time.perf_counter()
            quantum_input = None
            if self.config.enable_quantum_prep:
                quantum_input = self.qaoa_adapter.prepare_qaoa_input(
                    graph=graph,
                    disaster_ids=[d.id for d in disasters],
                    resource_ids=[r.id for r in resources],
                    severities=severity_map,
                    inventories=inv_dict,
                    disaster_types=disaster_types,
                )
            phase_timings["quantum_prep_ms"] = (time.perf_counter() - t0) * 1000

            # --- Build final result ---
            computation_time_ms = (time.perf_counter() - start_time) * 1000

            # Assemble performance metrics
            metrics = {
                "phase_timings": phase_timings,
                "total_computation_ms": computation_time_ms,
                "data_stats": {
                    "disasters_count": len(disasters),
                    "resources_count": len(resources),
                    "resources_limit_applied": settings.resource_discovery_limit,
                    "inventories_count": len(inventories),
                    "edges_count": len(edges),
                },
                "optimization_stats": {
                    "total_allocations": len(allocation_result.allocations),
                    "total_routes_computed": len(routes),
                    "priority_queue_size": len(priority_queue),
                    "feasible_resources_per_disaster": {
                        did: len(candidates)
                        for did, candidates in feasible_resources.items()
                    },
                    "total_utility_score": allocation_result.total_utility,
                    "unfulfilled_disaster_count": len(allocation_result.unfulfilled_demands),
                },
                "graph_metrics": {
                    "nodes": graph.number_of_nodes(),
                    "edges": graph.number_of_edges(),
                    "density": nx.density(graph),
                    "is_connected": nx.is_weakly_connected(graph) if graph.number_of_nodes() > 0 else False,
                },
                "throughput": {
                    "allocations_per_second": (
                        len(allocation_result.allocations) / (computation_time_ms / 1000)
                        if computation_time_ms > 0 else 0
                    ),
                    "routes_per_second": (
                        len(routes) / (computation_time_ms / 1000)
                        if computation_time_ms > 0 else 0
                    ),
                },
            }

            result = self._build_result(
                allocation_result=allocation_result,
                routes=routes,
                severity_map=severity_map,
                reroute_recs=reroute_recs,
                graph=graph,
                quantum_input=quantum_input,
                computation_time_ms=computation_time_ms,
                metrics=metrics,
            )

            logger.info(
                f"HAQRA pipeline complete: {len(result.allocations)} allocations, "
                f"utility={result.survival_utility_score:.2f}, "
                f"time={computation_time_ms:.2f}ms"
            )

            return result

        except Exception as e:
            logger.exception(f"HAQRA pipeline failed: {e}")
            raise OptimizationException(
                message=f"HAQRA optimization failed: {str(e)}",
                details={"disaster_ids": disaster_ids},
            ) from e

    # ======== Private Methods ========

    def _load_data(
        self, disaster_ids: list[int] | None
    ) -> tuple[list[Disaster], list[ResourceCenter], list[ResourceInventory], list[GraphEdge]]:
        """Load all required data from database."""
        # Disasters
        query = select(Disaster)
        if disaster_ids:
            query = query.where(Disaster.id.in_(disaster_ids))
        disasters = list(self.db.execute(query).scalars().all())

        if not disasters:
            raise OptimizationException(message="No disasters found for HAQRA optimization")

        # Resources (apply discovery limit)
        resource_query = select(ResourceCenter).limit(settings.resource_discovery_limit)
        resources = list(self.db.execute(resource_query).scalars().all())
        if not resources:
            raise OptimizationException(message="No resources found for HAQRA optimization")

        # Inventories
        inventories = list(self.db.execute(select(ResourceInventory)).scalars().all())

        # Graph edges
        edges = list(self.db.execute(select(GraphEdge)).scalars().all())
        if not edges:
            raise OptimizationException(
                message="No graph edges found. Build the graph first (POST /graph/build)."
            )

        return disasters, resources, inventories, edges

    def _build_severity_inputs(
        self,
        disasters: list[Disaster],
        resources: list[ResourceCenter],
        inventories: list[ResourceInventory],
    ) -> list[DisasterSeverityInput]:
        """Build severity engine inputs from DB data."""
        inv_map = {inv.resource_center_id: inv for inv in inventories}
        total_resources = len(resources)

        inputs = []
        for d in disasters:
            # Count nearby resources (simplified: all resources for now)
            nearby_count = total_resources

            # Compute available inventory ratio
            total_inv = 0
            total_possible = 0
            for r in resources:
                inv = inv_map.get(r.id)
                if inv:
                    total_inv += inv.get_total_capacity()
                    total_possible += 500  # reference capacity

            inv_ratio = total_inv / max(1, total_possible)

            # Time since creation (approximate)
            elapsed = 0.0
            if d.created_at:
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc)
                if d.created_at.tzinfo is None:
                    from datetime import timezone as tz
                    d_created = d.created_at.replace(tzinfo=tz.utc)
                else:
                    d_created = d.created_at
                elapsed = (now - d_created).total_seconds() / 60.0

            inputs.append(
                DisasterSeverityInput(
                    disaster_id=d.id,
                    affected_population=d.affected_population,
                    base_severity=d.severity,
                    priority=d.priority,
                    disaster_type=d.disaster_type,
                    elapsed_minutes=elapsed,
                    nearby_resource_count=nearby_count,
                    available_inventory_ratio=inv_ratio,
                    road_accessibility_score=0.8,  # default; could use route data
                )
            )

        return inputs

    def _build_graph(
        self,
        disasters: list[Disaster],
        resources: list[ResourceCenter],
        edges: list[GraphEdge],
        severity_map: dict[int, float],
    ) -> nx.DiGraph:
        """Build NetworkX graph from DB edges."""
        G = nx.DiGraph()

        # Add disaster nodes
        for d in disasters:
            node_id = f"disaster_{d.id}"
            G.add_node(
                node_id,
                node_type="disaster",
                lat=d.lat,
                lng=d.lng,
                severity=severity_map.get(d.id, d.severity),
                disaster_type=d.disaster_type,
                affected_population=d.affected_population,
                priority=d.priority,
            )

        # Add resource nodes
        for r in resources:
            node_id = f"resource_{r.id}"
            G.add_node(
                node_id,
                node_type="resource",
                lat=r.lat,
                lng=r.lng,
                resource_type=r.resource_type,
                name=r.name,
            )

        # Add edges (bidirectional)
        for edge in edges:
            source = edge.source_node_id
            target = edge.target_node_id

            G.add_edge(
                source, target,
                weight=edge.weight,
                distance=edge.distance_meters,
                duration=edge.duration_seconds,
                edge_id=edge.id,
            )
            G.add_edge(
                target, source,
                weight=edge.weight,
                distance=edge.distance_meters,
                duration=edge.duration_seconds,
                edge_id=edge.id,
            )

        return G

    def _filter_resources(
        self,
        disasters: list[Disaster],
        resources: list[ResourceCenter],
        inventories: list[ResourceInventory],
        edges: list[GraphEdge],
    ) -> dict[int, list[ResourceCandidate]]:
        """Filter feasible resources per disaster."""
        inv_map = {inv.resource_center_id: inv for inv in inventories}
        edge_map: dict[tuple[int, int], GraphEdge] = {}
        for e in edges:
            if e.source_disaster_id and e.target_resource_id:
                edge_map[(e.source_disaster_id, e.target_resource_id)] = e

        result: dict[int, list[ResourceCandidate]] = {}

        for d in disasters:
            candidates = []
            for r in resources:
                inv = inv_map.get(r.id)
                inventory_dict = self._inventory_to_dict(inv) if inv else {}

                edge = edge_map.get((d.id, r.id))
                distance = edge.distance_meters if edge else 99999.0
                eta = edge.duration_seconds if edge else 9999.0

                candidates.append(
                    ResourceCandidate(
                        resource_id=r.id,
                        resource_type=r.resource_type,
                        lat=r.lat,
                        lng=r.lng,
                        name=r.name,
                        inventory=inventory_dict,
                        distance_meters=distance,
                        eta_seconds=eta,
                        route_risk=0.1,  # default low risk
                        is_operational=True,
                    )
                )

            filter_result = self.resource_filter.filter_feasible_resources(
                candidates, d.disaster_type
            )
            result[d.id] = filter_result.feasible

        return result

    def _build_demands_and_supplies(
        self,
        disasters: list[Disaster],
        feasible_resources: dict[int, list[ResourceCandidate]],
        inventories: list[ResourceInventory],
        edges: list[GraphEdge],
        severity_map: dict[int, float],
    ) -> tuple[list[DisasterDemand], dict[int, list[ResourceSupply]]]:
        """Build demand and supply structures for survival optimizer."""
        demands = []
        supplies: dict[int, list[ResourceSupply]] = {}

        for d in disasters:
            demands.append(
                DisasterDemand(
                    disaster_id=d.id,
                    disaster_type=d.disaster_type,
                    severity=severity_map.get(d.id, float(d.severity)),
                    affected_population=d.affected_population,
                    priority=d.priority,
                )
            )

            # Build supply list from feasible resources
            supply_list = []
            for candidate in feasible_resources.get(d.id, []):
                supply_list.append(
                    ResourceSupply(
                        resource_id=candidate.resource_id,
                        resource_type=candidate.resource_type,
                        inventory=candidate.inventory,
                        eta_seconds=candidate.eta_seconds,
                        distance_meters=candidate.distance_meters,
                    )
                )
            supplies[d.id] = supply_list

        return demands, supplies

    def _inventories_to_dict(
        self, inventories: list[ResourceInventory]
    ) -> dict[int, dict[str, int]]:
        """Convert inventory models to plain dicts keyed by resource center ID."""
        result = {}
        for inv in inventories:
            result[inv.resource_center_id] = self._inventory_to_dict(inv)
        return result

    def _inventory_to_dict(self, inv: ResourceInventory) -> dict[str, int]:
        """Convert single inventory model to dict."""
        return {
            "beds": inv.beds or 0,
            "ambulances": inv.ambulances or 0,
            "doctors": inv.doctors or 0,
            "medical_kits": inv.medical_kits or 0,
            "food": inv.food or 0,
            "water": inv.water or 0,
            "medicine": inv.medicine or 0,
            "fire_trucks": inv.fire_trucks or 0,
            "rescue_team": inv.rescue_team or 0,
        }

    def _compute_routes(
        self,
        graph: nx.DiGraph,
        allocation_result: AllocationResult,
    ) -> list[RouteOutput]:
        """Compute optimal routes for all allocations."""
        routes = []

        for alloc in allocation_result.allocations:
            source_id = f"resource_{alloc.resource_id}"
            target_id = f"disaster_{alloc.disaster_id}"

            route = self.routing_engine.compute_optimal_route(
                graph, source_id, target_id
            )
            if route:
                routes.append(route)

        return routes

    def _check_reroutes(
        self,
        graph: nx.DiGraph,
        routes: list[RouteOutput],
    ) -> list[RerouteRecommendation]:
        """Check if any routes need rerouting (placeholder for live blockage data)."""
        # In production, this would check real-time road blockage data
        # For now, return empty — no blockages detected without real-time feed
        return []

    def _build_result(
        self,
        allocation_result: AllocationResult,
        routes: list[RouteOutput],
        severity_map: dict[int, float],
        reroute_recs: list[RerouteRecommendation],
        graph: nx.DiGraph,
        quantum_input: QAOAInput | None,
        computation_time_ms: float,
        metrics: dict[str, Any] | None = None,
    ) -> HAQRAResult:
        """Assemble the final HAQRA result."""

        # Convert allocations to dicts
        allocations_out = []
        for alloc in allocation_result.allocations:
            allocations_out.append({
                "disaster_id": alloc.disaster_id,
                "resource_id": alloc.resource_id,
                "resource_type": alloc.resource_type,
                "allocated_quantities": alloc.allocated_quantities,
                "distance_meters": alloc.distance_meters,
                "eta_seconds": alloc.eta_seconds,
                "utility_score": alloc.utility_score,
                "allocation_type": alloc.allocation_type,
            })

        # Convert routes
        routes_out = []
        for route in routes:
            routes_out.append({
                "disaster_id": route.disaster_id,
                "resource_id": route.resource_id,
                "path": route.path,
                "total_distance_meters": route.total_distance_meters,
                "total_eta_seconds": route.total_eta_seconds,
            })

        # ETA predictions
        eta_predictions = []
        for route in routes:
            eta_predictions.append({
                "disaster_id": route.disaster_id,
                "resource_id": route.resource_id,
                "eta_seconds": route.total_eta_seconds,
                "eta_minutes": route.total_eta_seconds / 60.0,
            })

        # Resource shortages
        resource_shortages = []
        for did, missing in allocation_result.unfulfilled_demands.items():
            resource_shortages.append({
                "disaster_id": did,
                "missing_resources": missing,
            })

        # Reroute recommendations
        reroute_out = []
        for rec in reroute_recs:
            reroute_out.append({
                "disaster_id": rec.disaster_id,
                "resource_id": rec.resource_id,
                "reason": rec.reason,
                "eta_savings_seconds": rec.eta_savings_seconds,
                "new_path": rec.new_path,
            })

        return HAQRAResult(
            allocations=allocations_out,
            routes=routes_out,
            eta_predictions=eta_predictions,
            survival_utility_score=allocation_result.total_utility,
            resource_shortages=resource_shortages,
            reroute_recommendations=reroute_out,
            unfulfilled_demands=allocation_result.unfulfilled_demands,
            computation_time_ms=computation_time_ms,
            severity_scores=severity_map,
            graph_stats={
                "nodes": graph.number_of_nodes(),
                "edges": graph.number_of_edges(),
            },
            quantum_input=quantum_input,
            metrics=metrics or {},
        )

