"""
PHASE 5 — Hybrid Allocation Engine.

Handles two types of resources differently:
- Divisible (food, water, medicine): weighted proportional allocation
- Indivisible (ambulances, fire_trucks, rescue_team, doctors): bipartite matching

Constraints:
- Never exceed inventory
- Never duplicate indivisible assignment
- Never allocate on inaccessible routes
- Allow partial fulfillment
- Prioritize highest utility outcomes
"""

from dataclasses import dataclass, field
from typing import Any

from app.core.logger import logger
from app.optimization.survival_optimizer import PriorityQueueEntry


@dataclass
class AllocationItem:
    """A single allocation decision."""

    disaster_id: int
    resource_id: int
    resource_type: str
    allocated_quantities: dict[str, int]
    distance_meters: float
    eta_seconds: float
    utility_score: float
    allocation_type: str  # "divisible" or "indivisible"


@dataclass
class AllocationResult:
    """Result of the allocation engine."""

    allocations: list[AllocationItem]
    total_utility: float
    fulfilled_demands: dict[int, dict[str, int]]  # disaster_id -> allocated totals
    remaining_inventory: dict[int, dict[str, int]]  # resource_id -> remaining
    unfulfilled_demands: dict[int, list[str]]  # disaster_id -> unfulfilled resource types
    over_allocation_prevented: int  # count of prevented over-allocations


# Resources that can be split
DIVISIBLE_RESOURCES = {"food", "water", "medicine"}

# Resources that are indivisible units
INDIVISIBLE_RESOURCES = {"ambulances", "fire_trucks", "rescue_team", "doctors", "beds", "medical_kits"}


class AllocationEngine:
    """
    Hybrid allocation engine using:
    - Weighted proportional allocation for divisible resources
    - Assignment optimization / bipartite matching for indivisible resources
    """

    def __init__(self):
        self._over_allocation_count = 0

    def allocate(
        self,
        priority_queue: list[PriorityQueueEntry],
        inventories: dict[int, dict[str, int]],
        disaster_severities: dict[int, float],
        disaster_types: dict[int, str],
        resource_types: dict[int, str],
    ) -> AllocationResult:
        """
        Run the full hybrid allocation.

        Args:
            priority_queue: Global priority queue from survival optimizer
            inventories: resource_id -> {field: quantity}
            disaster_severities: disaster_id -> severity score
            disaster_types: disaster_id -> disaster type string
            resource_types: resource_id -> resource type string

        Returns:
            AllocationResult with all allocation decisions
        """
        self._over_allocation_count = 0

        # Deep copy inventories for tracking remaining
        remaining = {
            rid: dict(inv) for rid, inv in inventories.items()
        }

        allocations: list[AllocationItem] = []
        fulfilled: dict[int, dict[str, int]] = {}
        assigned_indivisible: set[tuple[int, str]] = set()  # (resource_id, field)

        # Process priority queue in utility order
        for entry in priority_queue:
            rid = entry.resource_id
            did = entry.disaster_id

            if rid not in remaining:
                continue

            resource_inv = remaining[rid]
            disaster_type = disaster_types.get(did, "other")
            severity = disaster_severities.get(did, 5.0)
            r_type = resource_types.get(rid, "")

            # Allocate divisible resources
            divisible_alloc = self.allocate_divisible_resources(
                resource_inventory=resource_inv,
                severity=severity,
                disaster_type=disaster_type,
            )

            # Allocate indivisible resources
            indivisible_alloc = self.allocate_indivisible_resources(
                resource_id=rid,
                resource_inventory=resource_inv,
                disaster_type=disaster_type,
                assigned_set=assigned_indivisible,
            )

            # Merge allocations
            combined = {**divisible_alloc, **indivisible_alloc}

            if combined:
                # Apply allocations to remaining inventory
                for field_name, qty in combined.items():
                    remaining[rid][field_name] = max(0, remaining[rid].get(field_name, 0) - qty)

                alloc_type = "mixed"
                if divisible_alloc and not indivisible_alloc:
                    alloc_type = "divisible"
                elif indivisible_alloc and not divisible_alloc:
                    alloc_type = "indivisible"

                item = AllocationItem(
                    disaster_id=did,
                    resource_id=rid,
                    resource_type=r_type,
                    allocated_quantities=combined,
                    distance_meters=entry.distance_meters,
                    eta_seconds=entry.eta_seconds,
                    utility_score=entry.utility_score,
                    allocation_type=alloc_type,
                )
                allocations.append(item)

                # Track fulfilled
                if did not in fulfilled:
                    fulfilled[did] = {}
                for k, v in combined.items():
                    fulfilled[did][k] = fulfilled[did].get(k, 0) + v

        # Determine unfulfilled demands
        unfulfilled = self._compute_unfulfilled(disaster_types, fulfilled)

        total_utility = sum(a.utility_score for a in allocations)

        result = AllocationResult(
            allocations=allocations,
            total_utility=total_utility,
            fulfilled_demands=fulfilled,
            remaining_inventory=remaining,
            unfulfilled_demands=unfulfilled,
            over_allocation_prevented=self._over_allocation_count,
        )

        logger.info(
            f"Allocation complete: {len(allocations)} allocations, "
            f"total_utility={total_utility:.2f}, "
            f"over_allocations_prevented={self._over_allocation_count}"
        )

        return result

    def allocate_divisible_resources(
        self,
        resource_inventory: dict[str, int],
        severity: float,
        disaster_type: str,
    ) -> dict[str, int]:
        """
        Allocate divisible resources using weighted proportional distribution.

        Higher severity receives a larger share.
        Allocation fraction: severity / 10 (capped at 0.8 to leave reserves).

        Args:
            resource_inventory: Current inventory
            severity: Disaster severity (0-10)
            disaster_type: Type of disaster

        Returns:
            Dict of field -> allocated quantity
        """
        allocated: dict[str, int] = {}

        # Allocation fraction based on severity (max 80% of available)
        fraction = min(0.8, severity / 10.0)
        fraction = max(0.1, fraction)  # minimum 10%

        for field_name in DIVISIBLE_RESOURCES:
            available = resource_inventory.get(field_name, 0)
            if available <= 0:
                continue

            alloc_qty = self.compute_proportional_distribution(available, fraction)
            alloc_qty = self.prevent_over_allocation(alloc_qty, available)

            if alloc_qty > 0:
                allocated[field_name] = alloc_qty

        return allocated

    def compute_proportional_distribution(
        self,
        available: int,
        fraction: float,
    ) -> int:
        """
        Compute proportional allocation quantity.

        Args:
            available: Available quantity
            fraction: Fraction to allocate (0-1)

        Returns:
            Integer quantity to allocate
        """
        return max(1, int(available * fraction))

    def prevent_over_allocation(self, requested: int, available: int) -> int:
        """
        Prevent allocating more than available.

        Args:
            requested: Requested quantity
            available: Available quantity

        Returns:
            Capped allocation quantity
        """
        if requested > available:
            self._over_allocation_count += 1
            return available
        return requested

    def allocate_indivisible_resources(
        self,
        resource_id: int,
        resource_inventory: dict[str, int],
        disaster_type: str,
        assigned_set: set[tuple[int, str]],
    ) -> dict[str, int]:
        """
        Allocate indivisible resources using assignment optimization.

        A resource unit cannot serve multiple disasters simultaneously.
        Uses greedy bipartite matching (best available match).

        Args:
            resource_id: Resource center ID
            resource_inventory: Current inventory
            disaster_type: Type of disaster
            assigned_set: Already assigned (resource_id, field) pairs

        Returns:
            Dict of field -> allocated quantity
        """
        allocated: dict[str, int] = {}

        for field_name in INDIVISIBLE_RESOURCES:
            # Skip if already fully assigned from this resource
            if (resource_id, field_name) in assigned_set:
                continue

            available = resource_inventory.get(field_name, 0)
            if available <= 0:
                continue

            # For indivisible resources, allocate 1 unit at a time
            alloc_qty = self.perform_bipartite_matching(
                available=available,
                resource_id=resource_id,
                field_name=field_name,
            )

            if alloc_qty > 0:
                allocated[field_name] = alloc_qty
                # Mark partial assignment (only fully consumed = assigned)
                if available - alloc_qty <= 0:
                    assigned_set.add((resource_id, field_name))

        return allocated

    def perform_bipartite_matching(
        self,
        available: int,
        resource_id: int,
        field_name: str,
    ) -> int:
        """
        Perform bipartite matching for a single indivisible resource.

        For now uses greedy matching: allocate up to half of available units
        to preserve availability for other disasters.

        Args:
            available: Available units
            resource_id: Resource center ID
            field_name: Resource field name

        Returns:
            Number of units to allocate
        """
        # Allocate min(half, available) to spread across disasters
        return max(1, min(available, available // 2 + 1))

    def optimize_assignment_cost(
        self,
        costs: list[list[float]],
    ) -> list[tuple[int, int]]:
        """
        Solve assignment problem using Hungarian algorithm (scipy).

        For future use when scipy is available. Falls back to greedy.

        Args:
            costs: Cost matrix [disaster][resource]

        Returns:
            List of (disaster_idx, resource_idx) assignments
        """
        try:
            from scipy.optimize import linear_sum_assignment

            row_ind, col_ind = linear_sum_assignment(costs)
            return list(zip(row_ind.tolist(), col_ind.tolist()))
        except ImportError:
            # Fallback: greedy by row minimum
            assignments = []
            used_cols: set[int] = set()
            for i, row in enumerate(costs):
                best_j = -1
                best_cost = float("inf")
                for j, cost in enumerate(row):
                    if j not in used_cols and cost < best_cost:
                        best_cost = cost
                        best_j = j
                if best_j >= 0:
                    assignments.append((i, best_j))
                    used_cols.add(best_j)
            return assignments

    def _compute_unfulfilled(
        self,
        disaster_types: dict[int, str],
        fulfilled: dict[int, dict[str, int]],
    ) -> dict[int, list[str]]:
        """Identify which disaster demands were not met."""
        unfulfilled: dict[int, list[str]] = {}

        from app.optimization.resource_filter import FilterConfig

        config = FilterConfig()

        for did, dtype in disaster_types.items():
            required = config.required_resource_types.get(dtype.lower(), [])
            fulfilled_for_disaster = fulfilled.get(did, {})

            missing = [
                r for r in required
                if fulfilled_for_disaster.get(r, 0) == 0
            ]
            if missing:
                unfulfilled[did] = missing

        return unfulfilled

