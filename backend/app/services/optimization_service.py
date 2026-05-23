"""
Optimization service for resource allocation optimization.

This service is designed to be extensible for adding new algorithms.
Currently supports classical algorithms, with hooks for quantum (QAOA) integration.
"""

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

import networkx as nx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import OptimizationException
from app.core.logger import logger
from app.models.disaster import Disaster
from app.models.graph_edge import GraphEdge
from app.models.resource_center import ResourceCenter
from app.models.resource_inventory import ResourceInventory
from app.schemas.optimize import (
    OptimizationAlgorithm,
    OptimizationObjective,
    ResourceAllocation,
)


@dataclass
class OptimizationContext:
    """Context for optimization algorithms."""

    graph: nx.DiGraph
    disasters: list[Disaster]
    resources: list[ResourceCenter]
    inventories: dict[int, ResourceInventory]  # resource_id -> inventory
    objective: OptimizationObjective
    constraints: dict[str, Any] = field(default_factory=dict)


@dataclass
class OptimizationOutput:
    """Output from optimization algorithms."""

    allocations: list[ResourceAllocation]
    total_distance: float
    total_time: float
    coverage_percentage: float
    unmet_demands: dict[int, dict[str, int]]
    iterations: int
    computation_time_ms: float


class BaseOptimizer(ABC):
    """Base class for optimization algorithms."""

    @property
    @abstractmethod
    def algorithm(self) -> OptimizationAlgorithm:
        """Return the algorithm type."""
        pass

    @abstractmethod
    def optimize(
        self,
        context: OptimizationContext,
        max_iterations: int = 1000,
    ) -> OptimizationOutput:
        """
        Run the optimization algorithm.
        
        Args:
            context: Optimization context with graph and data
            max_iterations: Maximum iterations for iterative algorithms
            
        Returns:
            OptimizationOutput with allocations and metrics
        """
        pass


class GreedyOptimizer(BaseOptimizer):
    """
    Greedy optimization algorithm.
    
    Allocates resources to disasters based on:
    1. Disaster priority (critical first)
    2. Nearest available resource
    3. Resource capacity
    """

    @property
    def algorithm(self) -> OptimizationAlgorithm:
        return OptimizationAlgorithm.GREEDY

    def optimize(
        self,
        context: OptimizationContext,
        max_iterations: int = 1000,
    ) -> OptimizationOutput:
        start_time = time.perf_counter()
        
        # Sort disasters by priority
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        sorted_disasters = sorted(
            context.disasters,
            key=lambda d: (priority_order.get(d.priority, 4), -d.severity),
        )
        
        allocations = []
        total_distance = 0.0
        total_time = 0.0
        unmet_demands: dict[int, dict[str, int]] = {}
        
        # Track available resources (copy of inventories)
        available = {
            rid: {
                "beds": inv.beds or 0,
                "ambulances": inv.ambulances or 0,
                "doctors": inv.doctors or 0,
                "food": inv.food or 0,
                "water": inv.water or 0,
                "medicine": inv.medicine or 0,
                "fire_trucks": inv.fire_trucks or 0,
                "rescue_team": inv.rescue_team or 0,
            }
            for rid, inv in context.inventories.items()
        }
        
        iterations = 0
        
        for disaster in sorted_disasters:
            disaster_node = f"disaster_{disaster.id}"
            
            if disaster_node not in context.graph:
                continue
            
            # Find connected resources sorted by edge weight
            edges = []
            for _, target, data in context.graph.out_edges(disaster_node, data=True):
                if target.startswith("resource_"):
                    resource_id = int(target.split("_")[1])
                    edges.append((resource_id, data))
            
            edges.sort(key=lambda x: x[1].get("weight", float("inf")))
            
            # Allocate from nearest resources
            for resource_id, edge_data in edges:
                iterations += 1
                if iterations > max_iterations:
                    break
                
                if resource_id not in available:
                    continue
                
                # Find resource type
                resource = next(
                    (r for r in context.resources if r.id == resource_id),
                    None,
                )
                if not resource:
                    continue
                
                # Allocate what's available
                allocated = {}
                for resource_key, amount in available[resource_id].items():
                    if amount > 0:
                        # Allocate a portion based on severity
                        allocate_amount = min(
                            amount,
                            max(1, amount // 2),  # Allocate up to half
                        )
                        allocated[resource_key] = allocate_amount
                        available[resource_id][resource_key] -= allocate_amount
                
                if allocated:
                    allocation = ResourceAllocation(
                        disaster_id=disaster.id,
                        resource_center_id=resource_id,
                        resource_type=resource.resource_type,
                        allocated_quantity=allocated,
                        distance_meters=edge_data.get("distance", 0),
                        eta_seconds=edge_data.get("duration", 0),
                        priority_score=edge_data.get("weight", 1.0),
                    )
                    allocations.append(allocation)
                    total_distance += allocation.distance_meters
                    total_time += allocation.eta_seconds
        
        computation_time_ms = (time.perf_counter() - start_time) * 1000
        
        # Calculate coverage
        covered_disasters = len(set(a.disaster_id for a in allocations))
        coverage = (covered_disasters / len(context.disasters) * 100) if context.disasters else 0
        
        return OptimizationOutput(
            allocations=allocations,
            total_distance=total_distance,
            total_time=total_time,
            coverage_percentage=coverage,
            unmet_demands=unmet_demands,
            iterations=iterations,
            computation_time_ms=computation_time_ms,
        )


class DijkstraOptimizer(BaseOptimizer):
    """
    Dijkstra-based shortest path optimizer.
    
    Finds optimal paths from disasters to resources using shortest path.
    """

    @property
    def algorithm(self) -> OptimizationAlgorithm:
        return OptimizationAlgorithm.DIJKSTRA

    def optimize(
        self,
        context: OptimizationContext,
        max_iterations: int = 1000,
    ) -> OptimizationOutput:
        start_time = time.perf_counter()
        
        allocations = []
        total_distance = 0.0
        total_time = 0.0
        iterations = 0
        
        for disaster in context.disasters:
            disaster_node = f"disaster_{disaster.id}"
            
            if disaster_node not in context.graph:
                continue
            
            # Find shortest paths to all resources
            try:
                paths = nx.single_source_dijkstra_path_length(
                    context.graph,
                    disaster_node,
                    weight="weight",
                )
            except nx.NetworkXError:
                continue
            
            # Filter to resource nodes
            resource_paths = [
                (node, length)
                for node, length in paths.items()
                if node.startswith("resource_")
            ]
            
            # Sort by path length
            resource_paths.sort(key=lambda x: x[1])
            
            # Allocate from nearest resource
            for resource_node, _ in resource_paths[:3]:  # Top 3 nearest
                iterations += 1
                if iterations > max_iterations:
                    break
                
                resource_id = int(resource_node.split("_")[1])
                
                # Get edge data
                edge_data = context.graph.get_edge_data(disaster_node, resource_node) or {}
                
                resource = next(
                    (r for r in context.resources if r.id == resource_id),
                    None,
                )
                if not resource:
                    continue
                
                # Get available inventory
                if resource_id in context.inventories:
                    inv = context.inventories[resource_id]
                    allocated = {
                        "beds": inv.beds or 0,
                        "ambulances": inv.ambulances or 0,
                    }
                else:
                    allocated = {"general": 1}
                
                allocation = ResourceAllocation(
                    disaster_id=disaster.id,
                    resource_center_id=resource_id,
                    resource_type=resource.resource_type,
                    allocated_quantity=allocated,
                    distance_meters=edge_data.get("distance", 0),
                    eta_seconds=edge_data.get("duration", 0),
                    priority_score=edge_data.get("weight", 1.0),
                )
                allocations.append(allocation)
                total_distance += allocation.distance_meters
                total_time += allocation.eta_seconds
        
        computation_time_ms = (time.perf_counter() - start_time) * 1000
        
        covered = len(set(a.disaster_id for a in allocations))
        coverage = (covered / len(context.disasters) * 100) if context.disasters else 0
        
        return OptimizationOutput(
            allocations=allocations,
            total_distance=total_distance,
            total_time=total_time,
            coverage_percentage=coverage,
            unmet_demands={},
            iterations=iterations,
            computation_time_ms=computation_time_ms,
        )


class QAOASimulatedOptimizer(BaseOptimizer):
    """
    Simulated QAOA (Quantum Approximate Optimization Algorithm) optimizer.

    Simulates quantum-inspired optimization by:
    1. Using random perturbations (simulating quantum superposition)
    2. Running multiple rounds (simulating QAOA layers/depth)
    3. Selecting the globally best allocation across all rounds
    """

    @property
    def algorithm(self) -> OptimizationAlgorithm:
        return OptimizationAlgorithm.QAOA

    def optimize(
        self,
        context: OptimizationContext,
        max_iterations: int = 1000,
    ) -> OptimizationOutput:
        import math
        import random

        start_time = time.perf_counter()
        random.seed(42)  # Reproducible

        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        sorted_disasters = sorted(
            context.disasters,
            key=lambda d: (priority_order.get(d.priority, 4), -d.severity),
        )

        best_allocations: list[ResourceAllocation] = []
        best_cost = float("inf")
        best_distance = 0.0
        best_time = 0.0
        total_iterations = 0

        num_rounds = min(max_iterations, 50)  # QAOA "layers"

        for layer in range(num_rounds):
            # Simulated annealing temperature (quantum tunneling analog)
            temperature = 1.0 - (layer / num_rounds)
            gamma = math.pi * temperature  # QAOA mixing angle
            beta = math.pi * (1 - temperature) / 2  # QAOA phase angle

            layer_allocations: list[ResourceAllocation] = []
            layer_distance = 0.0
            layer_time = 0.0

            available = {
                rid: {
                    "beds": inv.beds or 0,
                    "ambulances": inv.ambulances or 0,
                    "doctors": inv.doctors or 0,
                    "food": inv.food or 0,
                    "water": inv.water or 0,
                    "medicine": inv.medicine or 0,
                    "fire_trucks": inv.fire_trucks or 0,
                    "rescue_team": inv.rescue_team or 0,
                }
                for rid, inv in context.inventories.items()
            }

            for disaster in sorted_disasters:
                disaster_node = f"disaster_{disaster.id}"
                if disaster_node not in context.graph:
                    continue

                edges = []
                for _, target, data in context.graph.out_edges(disaster_node, data=True):
                    if target.startswith("resource_"):
                        resource_id = int(target.split("_")[1])
                        edges.append((resource_id, data))

                if not edges:
                    continue

                # Quantum-inspired scoring: weight + random perturbation scaled by gamma
                scored_edges = []
                for rid, edata in edges:
                    base_weight = edata.get("weight", float("inf"))
                    perturbation = random.gauss(0, gamma * base_weight * 0.3)
                    quantum_score = base_weight + perturbation
                    scored_edges.append((rid, edata, quantum_score))

                scored_edges.sort(key=lambda x: x[2])

                # Acceptance probability for sub-optimal choices (quantum tunneling)
                for resource_id, edge_data, score in scored_edges:
                    total_iterations += 1
                    if resource_id not in available:
                        continue

                    resource = next(
                        (r for r in context.resources if r.id == resource_id),
                        None,
                    )
                    if not resource:
                        continue

                    # Quantum-inspired allocation: allocate proportional to beta
                    allocated = {}
                    alloc_fraction = max(0.3, math.cos(beta) ** 2)  # Born rule analog
                    for key, amount in available[resource_id].items():
                        if amount > 0:
                            alloc_amount = max(1, int(amount * alloc_fraction))
                            allocated[key] = alloc_amount
                            available[resource_id][key] -= alloc_amount

                    if allocated:
                        allocation = ResourceAllocation(
                            disaster_id=disaster.id,
                            resource_center_id=resource_id,
                            resource_type=resource.resource_type,
                            allocated_quantity=allocated,
                            distance_meters=edge_data.get("distance", 0),
                            eta_seconds=edge_data.get("duration", 0),
                            priority_score=score,
                        )
                        layer_allocations.append(allocation)
                        layer_distance += allocation.distance_meters
                        layer_time += allocation.eta_seconds
                        break  # Allocated for this disaster

            # Evaluate this layer's cost (lower = better)
            covered = len(set(a.disaster_id for a in layer_allocations))
            coverage = (covered / len(context.disasters)) if context.disasters else 0
            cost = layer_distance * (1 - coverage + 0.01)  # Penalize low coverage

            if cost < best_cost or (cost == best_cost and layer_distance < best_distance):
                best_cost = cost
                best_allocations = layer_allocations
                best_distance = layer_distance
                best_time = layer_time

        computation_time_ms = (time.perf_counter() - start_time) * 1000
        covered = len(set(a.disaster_id for a in best_allocations))
        coverage = (covered / len(context.disasters) * 100) if context.disasters else 0

        return OptimizationOutput(
            allocations=best_allocations,
            total_distance=best_distance,
            total_time=best_time,
            coverage_percentage=coverage,
            unmet_demands={},
            iterations=total_iterations,
            computation_time_ms=computation_time_ms,
        )


class OptimizationService:
    """Service for running optimization algorithms."""

    # Registry of available optimizers
    OPTIMIZERS: dict[OptimizationAlgorithm, type[BaseOptimizer]] = {
        OptimizationAlgorithm.GREEDY: GreedyOptimizer,
        OptimizationAlgorithm.DIJKSTRA: DijkstraOptimizer,
        OptimizationAlgorithm.QAOA: QAOASimulatedOptimizer,
    }

    def __init__(self, db: Session):
        self.db = db

    @classmethod
    def register_optimizer(
        cls,
        algorithm: OptimizationAlgorithm,
        optimizer_class: type[BaseOptimizer],
    ) -> None:
        """
        Register a new optimizer.
        
        This allows adding new algorithms (e.g., QAOA) without modifying
        existing code.
        
        Args:
            algorithm: Algorithm enum value
            optimizer_class: Optimizer class to register
        """
        cls.OPTIMIZERS[algorithm] = optimizer_class
        logger.info(f"Registered optimizer: {algorithm.value}")

    def _build_networkx_graph(
        self,
        edges: list[GraphEdge],
    ) -> nx.DiGraph:
        """Convert database edges to NetworkX graph."""
        G = nx.DiGraph()
        
        for edge in edges:
            source = edge.source_node_id
            target = edge.target_node_id
            
            G.add_edge(
                source,
                target,
                weight=edge.weight,
                distance=edge.distance_meters,
                duration=edge.duration_seconds,
                edge_id=edge.id,
            )
            
            # Add reverse edge for undirected connectivity
            G.add_edge(
                target,
                source,
                weight=edge.weight,
                distance=edge.distance_meters,
                duration=edge.duration_seconds,
                edge_id=edge.id,
            )
        
        return G

    def _load_context(
        self,
        disaster_ids: list[int] | None = None,
        objective: OptimizationObjective = OptimizationObjective.BALANCED,
        constraints: dict[str, Any] | None = None,
    ) -> OptimizationContext:
        """Load optimization context from database."""
        # Load disasters
        disaster_query = select(Disaster)
        if disaster_ids:
            disaster_query = disaster_query.where(Disaster.id.in_(disaster_ids))
        disasters = list(self.db.execute(disaster_query).scalars().all())
        
        if not disasters:
            raise OptimizationException(
                message="No disasters found for optimization",
            )
        
        # Load resources
        resources = list(
            self.db.execute(select(ResourceCenter)).scalars().all()
        )
        
        if not resources:
            raise OptimizationException(
                message="No resources found for optimization",
            )
        
        # Load inventories
        inventories_list = list(
            self.db.execute(select(ResourceInventory)).scalars().all()
        )
        inventories = {inv.resource_center_id: inv for inv in inventories_list}
        
        # Load graph edges
        edges = list(self.db.execute(select(GraphEdge)).scalars().all())
        
        if not edges:
            raise OptimizationException(
                message="No graph edges found. Please build the graph first.",
            )
        
        # Build NetworkX graph
        graph = self._build_networkx_graph(edges)
        
        return OptimizationContext(
            graph=graph,
            disasters=disasters,
            resources=resources,
            inventories=inventories,
            objective=objective,
            constraints=constraints or {},
        )

    def optimize(
        self,
        algorithm: OptimizationAlgorithm = OptimizationAlgorithm.GREEDY,
        disaster_ids: list[int] | None = None,
        objective: OptimizationObjective = OptimizationObjective.BALANCED,
        constraints: dict[str, Any] | None = None,
        max_iterations: int = 1000,
    ) -> OptimizationOutput:
        """
        Run optimization.
        
        Args:
            algorithm: Algorithm to use
            disaster_ids: Specific disaster IDs (all if None)
            objective: Optimization objective
            constraints: Additional constraints
            max_iterations: Maximum iterations
            
        Returns:
            OptimizationOutput with results
        """
        # Check if algorithm is supported
        if algorithm not in self.OPTIMIZERS:
            raise OptimizationException(
                message=f"Unknown algorithm: {algorithm}",
            )
        
        # Load context
        context = self._load_context(
            disaster_ids=disaster_ids,
            objective=objective,
            constraints=constraints,
        )
        
        logger.info(
            f"Running {algorithm.value} optimization with "
            f"{len(context.disasters)} disasters and {len(context.resources)} resources"
        )
        
        # Create optimizer instance
        optimizer_class = self.OPTIMIZERS[algorithm]
        optimizer = optimizer_class()
        
        # Run optimization
        result = optimizer.optimize(context, max_iterations)
        
        logger.info(
            f"Optimization complete: {len(result.allocations)} allocations, "
            f"{result.coverage_percentage:.1f}% coverage, "
            f"{result.computation_time_ms:.2f}ms"
        )
        
        return result

    def find_shortest_path(
        self,
        source_node_id: str,
        target_node_id: str,
    ) -> tuple[list[str], float, float]:
        """
        Find shortest path between two nodes.
        
        Args:
            source_node_id: Source node ID (e.g., "disaster_1")
            target_node_id: Target node ID (e.g., "resource_5")
            
        Returns:
            Tuple of (path, total_distance, total_duration)
        """
        edges = list(self.db.execute(select(GraphEdge)).scalars().all())
        graph = self._build_networkx_graph(edges)
        
        if source_node_id not in graph:
            raise OptimizationException(
                message=f"Source node not found: {source_node_id}",
            )
        
        if target_node_id not in graph:
            raise OptimizationException(
                message=f"Target node not found: {target_node_id}",
            )
        
        try:
            path = nx.shortest_path(
                graph,
                source_node_id,
                target_node_id,
                weight="weight",
            )
        except nx.NetworkXNoPath:
            raise OptimizationException(
                message=f"No path found between {source_node_id} and {target_node_id}",
            )
        
        # Calculate total distance and duration
        total_distance = 0.0
        total_duration = 0.0
        
        for i in range(len(path) - 1):
            edge_data = graph.get_edge_data(path[i], path[i + 1]) or {}
            total_distance += edge_data.get("distance", 0)
            total_duration += edge_data.get("duration", 0)
        
        return path, total_distance, total_duration

    def _run_haqra(
        self,
        disaster_ids: list[int] | None = None,
    ) -> OptimizationOutput:
        """
        Run HAQRA pipeline and convert result to OptimizationOutput
        for compatibility with the standard optimization endpoint.
        """
        from app.optimization.haqra_pipeline import HAQRAPipeline
        from app.schemas.optimize import ResourceAllocation

        pipeline = HAQRAPipeline(db=self.db)
        haqra_result = pipeline.run(disaster_ids=disaster_ids)

        # Convert HAQRA allocations to standard ResourceAllocation format
        allocations = []
        for alloc in haqra_result.allocations:
            allocations.append(
                ResourceAllocation(
                    disaster_id=alloc["disaster_id"],
                    resource_center_id=alloc["resource_id"],
                    resource_type=alloc["resource_type"],
                    allocated_quantity=alloc["allocated_quantities"],
                    distance_meters=alloc["distance_meters"],
                    eta_seconds=alloc["eta_seconds"],
                    priority_score=alloc["utility_score"],
                )
            )

        total_distance = sum(r.get("total_distance_meters", 0) for r in haqra_result.routes)
        total_time = sum(r.get("total_eta_seconds", 0) for r in haqra_result.routes)
        covered = len(set(a["disaster_id"] for a in haqra_result.allocations))
        # Estimate total disasters from severity_scores keys
        total_disasters = len(haqra_result.severity_scores) or 1
        coverage = (covered / total_disasters) * 100

        return OptimizationOutput(
            allocations=allocations,
            total_distance=total_distance,
            total_time=total_time,
            coverage_percentage=coverage,
            unmet_demands={
                int(k): {"missing": v}
                for k, v in haqra_result.unfulfilled_demands.items()
            },
            iterations=len(haqra_result.allocations),
            computation_time_ms=haqra_result.computation_time_ms,
        )

