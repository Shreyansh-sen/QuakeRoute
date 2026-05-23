"""
PHASE 4 — Global Survival Optimizer.

Maximizes total global survival probability across ALL disaster zones simultaneously.
Does NOT optimize one disaster independently.

Survival Utility:
U = sum( severity * affected_population * resource_match_score / ETA )

Higher utility = more lives saved.
"""

from dataclasses import dataclass, field
from typing import Any

from app.core.logger import logger


@dataclass
class DisasterDemand:
    """Demand from a single disaster node."""

    disaster_id: int
    disaster_type: str
    severity: float  # 0-10 dynamic severity
    affected_population: int
    priority: str


@dataclass
class ResourceSupply:
    """Supply from a single resource center."""

    resource_id: int
    resource_type: str
    inventory: dict[str, int]
    eta_seconds: float  # ETA to a specific disaster
    distance_meters: float


@dataclass
class PriorityQueueEntry:
    """An entry in the global priority queue."""

    disaster_id: int
    resource_id: int
    utility_score: float
    resource_match_score: float
    eta_seconds: float
    distance_meters: float


class SurvivalOptimizer:
    """
    Computes global survival utility across all disasters.

    Optimizes ALL disaster zones simultaneously to maximize
    total lives saved, not just individual disaster responses.
    """

    # Resource match scoring by disaster type
    RESOURCE_MATCH_RULES: dict[str, dict[str, float]] = {
        "flood": {
            "water": 0.9,
            "food": 0.8,
            "rescue_team": 1.0,
            "beds": 0.7,
            "ambulances": 0.6,
            "medicine": 0.5,
            "fire_trucks": 0.3,
        },
        "earthquake": {
            "rescue_team": 1.0,
            "ambulances": 0.95,
            "beds": 0.8,
            "doctors": 0.9,
            "medical_kits": 0.85,
            "medicine": 0.7,
            "food": 0.5,
            "water": 0.5,
        },
        "fire": {
            "fire_trucks": 1.0,
            "rescue_team": 0.9,
            "ambulances": 0.8,
            "water": 0.7,
            "beds": 0.5,
            "doctors": 0.6,
        },
        "cyclone": {
            "beds": 0.9,
            "food": 0.85,
            "water": 0.85,
            "rescue_team": 0.7,
            "medicine": 0.6,
            "ambulances": 0.5,
        },
        "landslide": {
            "rescue_team": 1.0,
            "ambulances": 0.9,
            "beds": 0.7,
            "doctors": 0.8,
            "medical_kits": 0.75,
        },
        "tsunami": {
            "rescue_team": 1.0,
            "water": 0.9,
            "food": 0.85,
            "beds": 0.8,
            "ambulances": 0.7,
            "medicine": 0.6,
        },
        "drought": {
            "water": 1.0,
            "food": 0.95,
            "medicine": 0.7,
            "doctors": 0.5,
        },
    }

    # Minimum ETA to avoid division by zero (seconds)
    MIN_ETA = 60.0

    def compute_survival_utility(
        self,
        demand: DisasterDemand,
        supply: ResourceSupply,
    ) -> float:
        """
        Compute survival utility for a single disaster-resource pair.

        U = severity * affected_population * resource_match_score / ETA

        Args:
            demand: Disaster demand info
            supply: Resource supply info

        Returns:
            Utility score (higher = more lives saved)
        """
        match_score = self.compute_resource_match_score(
            disaster_type=demand.disaster_type,
            resource_inventory=supply.inventory,
        )

        eta = max(self.MIN_ETA, supply.eta_seconds)

        # Normalize population to prevent extremely large values
        pop_factor = min(1.0, demand.affected_population / 10000.0)

        utility = (demand.severity * pop_factor * match_score) / (eta / 3600.0)

        return utility

    def compute_resource_match_score(
        self,
        disaster_type: str,
        resource_inventory: dict[str, int],
    ) -> float:
        """
        Compute how well a resource's inventory matches the disaster's needs.

        Args:
            disaster_type: Type of disaster
            resource_inventory: Available inventory dict

        Returns:
            Match score 0.0 - 1.0
        """
        rules = self.RESOURCE_MATCH_RULES.get(disaster_type.lower(), {})

        if not rules:
            # Default: any non-zero inventory gets base score
            total_inv = sum(v for v in resource_inventory.values() if v > 0)
            return min(1.0, total_inv / 100.0) if total_inv > 0 else 0.0

        # Weighted match score
        total_weight = 0.0
        matched_weight = 0.0

        for resource_field, importance in rules.items():
            total_weight += importance
            quantity = resource_inventory.get(resource_field, 0)
            if quantity > 0:
                # Sigmoid-like scaling: diminishing returns above threshold
                quantity_factor = min(1.0, quantity / 50.0)
                matched_weight += importance * quantity_factor

        if total_weight == 0:
            return 0.0

        return matched_weight / total_weight

    def rank_disaster_priority(
        self, demands: list[DisasterDemand]
    ) -> list[DisasterDemand]:
        """
        Rank disasters by priority for resource allocation order.

        Combines priority level + severity + affected population.

        Args:
            demands: List of disaster demands

        Returns:
            Sorted list (highest priority first)
        """
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}

        return sorted(
            demands,
            key=lambda d: (
                priority_order.get(d.priority.lower(), 4),
                -d.severity,
                -d.affected_population,
            ),
        )

    def generate_global_priority_queue(
        self,
        demands: list[DisasterDemand],
        supplies: dict[int, list[ResourceSupply]],
    ) -> list[PriorityQueueEntry]:
        """
        Generate a global priority queue of disaster-resource pairings.

        Evaluates ALL possible disaster-resource combos, computes utility,
        and returns them sorted by utility (highest first).

        Args:
            demands: All disaster demands
            supplies: Dict of disaster_id -> list of available ResourceSupply

        Returns:
            Global priority queue sorted by utility (descending)
        """
        queue: list[PriorityQueueEntry] = []

        for demand in demands:
            available_supplies = supplies.get(demand.disaster_id, [])

            for supply in available_supplies:
                utility = self.compute_survival_utility(demand, supply)

                if utility > 0:
                    match_score = self.compute_resource_match_score(
                        demand.disaster_type, supply.inventory
                    )

                    entry = PriorityQueueEntry(
                        disaster_id=demand.disaster_id,
                        resource_id=supply.resource_id,
                        utility_score=utility,
                        resource_match_score=match_score,
                        eta_seconds=supply.eta_seconds,
                        distance_meters=supply.distance_meters,
                    )
                    queue.append(entry)

        # Sort by utility descending (highest value allocations first)
        queue.sort(key=lambda e: e.utility_score, reverse=True)

        logger.info(
            f"Global priority queue generated: {len(queue)} entries from "
            f"{len(demands)} disasters"
        )

        return queue

