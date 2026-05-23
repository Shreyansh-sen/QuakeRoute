"""
PHASE 8 — Quantum-Ready Optimization Layer (QAOA Adapter).

Prepares future quantum optimization integration.
Isolated from classical optimization — never tightly coupled.

Functions:
- convert_graph_to_qubo()
- build_cost_matrix()
- build_constraint_matrix()
- prepare_qaoa_input()

Future QAOA minimizes:
  distance + delay + shortage_penalty + mismatch_penalty
"""

from dataclasses import dataclass, field
from typing import Any

import networkx as nx
import numpy as np

from app.core.logger import logger


@dataclass
class QUBOInput:
    """Input prepared for QAOA / quantum solver."""

    num_variables: int
    cost_matrix: list[list[float]]  # Quadratic cost matrix (QUBO Q)
    linear_terms: list[float]  # Linear cost terms
    constraint_matrix: list[list[float]]  # Constraint coefficients
    constraint_rhs: list[float]  # Constraint right-hand-side values
    variable_labels: list[str]  # Human-readable variable names
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class QAOAInput:
    """Full input package for QAOA engine."""

    qubo: QUBOInput
    num_layers: int = 2  # QAOA p parameter
    penalty_coefficient: float = 10.0
    graph_summary: dict[str, Any] = field(default_factory=dict)


class QAOAAdapter:
    """
    Adapter for converting the HAQRA problem into quantum-ready format.

    This adapter:
    1. Takes the optimization graph + resource data
    2. Converts to QUBO formulation
    3. Outputs data ready for Qiskit QAOA or other quantum solvers

    Isolation principle: This class has ZERO dependency on quantum libraries.
    It only prepares the mathematical formulation.
    """

    # Weight factors for the objective function
    DISTANCE_WEIGHT = 0.3
    DELAY_WEIGHT = 0.3
    SHORTAGE_WEIGHT = 0.25
    MISMATCH_WEIGHT = 0.15

    def convert_graph_to_qubo(
        self,
        graph: nx.DiGraph,
        disaster_ids: list[int],
        resource_ids: list[int],
        severities: dict[int, float],
        inventories: dict[int, dict[str, int]],
        disaster_types: dict[int, str],
    ) -> QUBOInput:
        """
        Convert the resource allocation graph into a QUBO formulation.

        Decision variables: x[i,j] = 1 if resource j is allocated to disaster i

        Args:
            graph: Optimization graph
            disaster_ids: List of disaster IDs
            resource_ids: List of resource center IDs
            severities: disaster_id -> severity score
            inventories: resource_id -> inventory dict
            disaster_types: disaster_id -> type string

        Returns:
            QUBOInput ready for quantum solver
        """
        n_disasters = len(disaster_ids)
        n_resources = len(resource_ids)
        n_vars = n_disasters * n_resources

        # Variable labels
        labels = []
        for d in disaster_ids:
            for r in resource_ids:
                labels.append(f"x_{d}_{r}")

        # Build cost matrix
        cost_matrix = self.build_cost_matrix(
            graph=graph,
            disaster_ids=disaster_ids,
            resource_ids=resource_ids,
            severities=severities,
            disaster_types=disaster_types,
            inventories=inventories,
        )

        # Build linear terms (diagonal of QUBO)
        linear_terms = [cost_matrix[i][i] for i in range(n_vars)]

        # Build constraint matrix
        constraint_matrix, constraint_rhs = self.build_constraint_matrix(
            n_disasters=n_disasters,
            n_resources=n_resources,
            inventories=inventories,
            resource_ids=resource_ids,
        )

        qubo = QUBOInput(
            num_variables=n_vars,
            cost_matrix=cost_matrix,
            linear_terms=linear_terms,
            constraint_matrix=constraint_matrix,
            constraint_rhs=constraint_rhs,
            variable_labels=labels,
            metadata={
                "n_disasters": n_disasters,
                "n_resources": n_resources,
                "disaster_ids": disaster_ids,
                "resource_ids": resource_ids,
            },
        )

        logger.info(
            f"QUBO generated: {n_vars} variables, "
            f"{len(constraint_rhs)} constraints"
        )

        return qubo

    def build_cost_matrix(
        self,
        graph: nx.DiGraph,
        disaster_ids: list[int],
        resource_ids: list[int],
        severities: dict[int, float],
        disaster_types: dict[int, str],
        inventories: dict[int, dict[str, int]],
    ) -> list[list[float]]:
        """
        Build the quadratic cost matrix for QUBO.

        Objective: minimize distance + delay + shortage + mismatch

        Args:
            graph: Optimization graph
            disaster_ids: Disaster IDs
            resource_ids: Resource IDs
            severities: Severity scores
            disaster_types: Disaster types
            inventories: Resource inventories

        Returns:
            n_vars x n_vars cost matrix
        """
        n_disasters = len(disaster_ids)
        n_resources = len(resource_ids)
        n_vars = n_disasters * n_resources

        # Initialize cost matrix
        Q = [[0.0] * n_vars for _ in range(n_vars)]

        for i, did in enumerate(disaster_ids):
            for j, rid in enumerate(resource_ids):
                var_idx = i * n_resources + j

                # Get edge data
                source_node = f"disaster_{did}"
                target_node = f"resource_{rid}"

                edge_data = graph.get_edge_data(source_node, target_node) or {}
                distance = edge_data.get("distance", 50000.0)  # default 50km
                duration = edge_data.get("duration", 3600.0)  # default 1hr

                # Normalize costs
                distance_cost = distance / 50000.0  # normalize by max expected
                delay_cost = duration / 7200.0  # normalize by 2 hours

                # Shortage penalty: inverse of inventory richness
                inv = inventories.get(rid, {})
                total_inv = sum(v for v in inv.values() if v > 0)
                shortage_cost = 1.0 / (1.0 + total_inv / 100.0)

                # Mismatch penalty
                mismatch_cost = self._compute_mismatch(
                    disaster_types.get(did, "other"),
                    inv,
                )

                # Combined linear cost (diagonal)
                severity = severities.get(did, 5.0) / 10.0
                cost = (
                    self.DISTANCE_WEIGHT * distance_cost
                    + self.DELAY_WEIGHT * delay_cost
                    + self.SHORTAGE_WEIGHT * shortage_cost
                    + self.MISMATCH_WEIGHT * mismatch_cost
                )

                # Weight by inverse severity (prioritize high severity)
                cost *= (1.0 - severity * 0.5)

                Q[var_idx][var_idx] = cost

        return Q

    def build_constraint_matrix(
        self,
        n_disasters: int,
        n_resources: int,
        inventories: dict[int, dict[str, int]],
        resource_ids: list[int],
    ) -> tuple[list[list[float]], list[float]]:
        """
        Build constraint matrix for the optimization.

        Constraints:
        1. Each disaster must be served by at least one resource
        2. Resource capacity limits (can't over-allocate)

        Args:
            n_disasters: Number of disasters
            n_resources: Number of resources
            inventories: Resource inventories
            resource_ids: Resource IDs

        Returns:
            Tuple of (constraint_matrix, constraint_rhs)
        """
        n_vars = n_disasters * n_resources
        constraints: list[list[float]] = []
        rhs: list[float] = []

        # Constraint 1: Each disaster gets at least 1 resource
        for i in range(n_disasters):
            row = [0.0] * n_vars
            for j in range(n_resources):
                row[i * n_resources + j] = 1.0
            constraints.append(row)
            rhs.append(1.0)  # >= 1

        # Constraint 2: Each resource serves limited disasters
        # (capacity-based: max allocations proportional to total inventory)
        for j, rid in enumerate(resource_ids):
            row = [0.0] * n_vars
            for i in range(n_disasters):
                row[i * n_resources + j] = 1.0

            inv = inventories.get(rid, {})
            total_inv = sum(v for v in inv.values() if v > 0)
            # Max assignments based on capacity (at least 1, at most n_disasters)
            max_assignments = max(1, min(n_disasters, total_inv // 50 + 1))

            constraints.append(row)
            rhs.append(float(max_assignments))

        return constraints, rhs

    def prepare_qaoa_input(
        self,
        graph: nx.DiGraph,
        disaster_ids: list[int],
        resource_ids: list[int],
        severities: dict[int, float],
        inventories: dict[int, dict[str, int]],
        disaster_types: dict[int, str],
        num_layers: int = 2,
        penalty_coefficient: float = 10.0,
    ) -> QAOAInput:
        """
        Prepare complete QAOA input package.

        This is the main entry point for quantum integration.

        Args:
            graph: Optimization graph
            disaster_ids: Disaster IDs
            resource_ids: Resource IDs
            severities: Severity scores
            inventories: Resource inventories
            disaster_types: Disaster types
            num_layers: QAOA circuit layers (p)
            penalty_coefficient: Penalty for constraint violations

        Returns:
            QAOAInput ready to be consumed by a quantum backend
        """
        qubo = self.convert_graph_to_qubo(
            graph=graph,
            disaster_ids=disaster_ids,
            resource_ids=resource_ids,
            severities=severities,
            inventories=inventories,
            disaster_types=disaster_types,
        )

        qaoa_input = QAOAInput(
            qubo=qubo,
            num_layers=num_layers,
            penalty_coefficient=penalty_coefficient,
            graph_summary={
                "nodes": graph.number_of_nodes(),
                "edges": graph.number_of_edges(),
                "disasters": len(disaster_ids),
                "resources": len(resource_ids),
            },
        )

        logger.info(
            f"QAOA input prepared: {qubo.num_variables} qubits required, "
            f"{num_layers} layers"
        )

        return qaoa_input

    def _compute_mismatch(
        self,
        disaster_type: str,
        inventory: dict[str, int],
    ) -> float:
        """Compute resource type mismatch penalty (0 = perfect match, 1 = total mismatch)."""
        from app.optimization.survival_optimizer import SurvivalOptimizer

        optimizer = SurvivalOptimizer()
        match_score = optimizer.compute_resource_match_score(disaster_type, inventory)

        # Invert: high match = low mismatch penalty
        return 1.0 - match_score

