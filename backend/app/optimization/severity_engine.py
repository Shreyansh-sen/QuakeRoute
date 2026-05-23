"""
PHASE 1 — Dynamic Severity Engine.

Computes adaptive disaster urgency scores that update dynamically based on:
- People affected (normalized)
- Death risk / criticality
- Accessibility difficulty
- Resource shortage in the area
- Time delay since disaster began

Severity is normalized to 0–10 and increases if aid is delayed or resources are depleted.
"""

import time
from dataclasses import dataclass, field
from typing import Any

from app.core.logger import logger


@dataclass
class SeverityWeights:
    """Configurable weights for the severity formula."""

    people_affected: float = 0.25
    death_risk: float = 0.30
    accessibility_difficulty: float = 0.15
    resource_shortage: float = 0.15
    time_delay: float = 0.15

    def __post_init__(self):
        total = (
            self.people_affected
            + self.death_risk
            + self.accessibility_difficulty
            + self.resource_shortage
            + self.time_delay
        )
        if abs(total - 1.0) > 0.01:
            logger.warning(
                f"Severity weights do not sum to 1.0 (sum={total:.3f}). Normalizing."
            )
            self.people_affected /= total
            self.death_risk /= total
            self.accessibility_difficulty /= total
            self.resource_shortage /= total
            self.time_delay /= total


@dataclass
class DisasterSeverityInput:
    """Input data for severity computation."""

    disaster_id: int
    affected_population: int
    base_severity: int  # 1-10 from user input
    priority: str  # critical, high, medium, low
    disaster_type: str
    elapsed_minutes: float = 0.0  # time since disaster was reported
    nearby_resource_count: int = 0
    available_inventory_ratio: float = 1.0  # 0.0 = no resources, 1.0 = fully stocked
    road_accessibility_score: float = 1.0  # 0.0 = blocked, 1.0 = fully accessible


@dataclass
class SeverityResult:
    """Result of severity computation."""

    disaster_id: int
    dynamic_severity: float  # 0-10 normalized
    component_scores: dict[str, float] = field(default_factory=dict)
    urgency_rank: int = 0


class SeverityEngine:
    """
    Computes dynamic severity scores for disaster nodes.

    S_i = w1(PeopleAffected) * w2(DeathRisk) * w3(AccessibilityDifficulty)
          * w4(ResourceShortage) * w5(TimeDelay)

    In additive form for stability:
    S_i = w1*f1 + w2*f2 + w3*f3 + w4*f4 + w5*f5
    """

    # Maximum population for normalization
    MAX_POPULATION_REFERENCE = 100_000
    # Time thresholds in minutes
    CRITICAL_DELAY_MINUTES = 360  # 6 hours
    # Priority base multipliers
    PRIORITY_DEATH_RISK = {
        "critical": 1.0,
        "high": 0.8,
        "medium": 0.5,
        "low": 0.25,
    }
    # Disaster type criticality multipliers
    DISASTER_CRITICALITY = {
        "earthquake": 1.0,
        "tsunami": 1.0,
        "fire": 0.9,
        "flood": 0.8,
        "cyclone": 0.85,
        "landslide": 0.9,
        "drought": 0.4,
        "other": 0.6,
    }

    def __init__(self, weights: SeverityWeights | None = None):
        self.weights = weights or SeverityWeights()

    def compute_dynamic_severity(
        self, inputs: list[DisasterSeverityInput]
    ) -> list[SeverityResult]:
        """
        Compute dynamic severity for all disaster nodes.

        Args:
            inputs: List of disaster severity inputs

        Returns:
            List of SeverityResult, sorted by dynamic_severity descending
        """
        results = []

        for inp in inputs:
            scores = self._compute_components(inp)
            dynamic_severity = self._aggregate_score(scores)
            dynamic_severity = self.normalize_severity_score(dynamic_severity)

            results.append(
                SeverityResult(
                    disaster_id=inp.disaster_id,
                    dynamic_severity=dynamic_severity,
                    component_scores=scores,
                )
            )

        # Sort by severity descending and assign ranks
        results.sort(key=lambda r: r.dynamic_severity, reverse=True)
        for rank, result in enumerate(results, start=1):
            result.urgency_rank = rank

        logger.info(
            f"Computed severity for {len(results)} disasters. "
            f"Top severity: {results[0].dynamic_severity:.2f}" if results else ""
        )

        return results

    def update_severity_over_time(
        self,
        existing_results: list[SeverityResult],
        inputs: list[DisasterSeverityInput],
        time_elapsed_minutes: float,
    ) -> list[SeverityResult]:
        """
        Update severity scores as time progresses.

        Severity increases if:
        - Aid is delayed (time factor grows)
        - Local resources are depleted (shortage grows)

        Args:
            existing_results: Previous severity results
            inputs: Updated disaster inputs
            time_elapsed_minutes: Additional time elapsed

        Returns:
            Updated severity results
        """
        # Update elapsed time in inputs
        for inp in inputs:
            inp.elapsed_minutes += time_elapsed_minutes

        # Recompute
        return self.compute_dynamic_severity(inputs)

    def normalize_severity_score(self, raw_score: float) -> float:
        """
        Normalize severity to 0-10 scale.

        Args:
            raw_score: Raw computed score

        Returns:
            Normalized score in [0, 10]
        """
        return max(0.0, min(10.0, raw_score * 10.0))

    def _compute_components(self, inp: DisasterSeverityInput) -> dict[str, float]:
        """Compute individual severity component scores (each 0-1)."""

        # 1. People Affected (normalized by reference population)
        people_score = min(1.0, inp.affected_population / self.MAX_POPULATION_REFERENCE)

        # 2. Death Risk (based on priority + disaster type criticality)
        priority_risk = self.PRIORITY_DEATH_RISK.get(inp.priority.lower(), 0.5)
        type_criticality = self.DISASTER_CRITICALITY.get(inp.disaster_type.lower(), 0.6)
        # Combine with base severity
        death_risk = (priority_risk * 0.4 + type_criticality * 0.3 + (inp.base_severity / 10.0) * 0.3)

        # 3. Accessibility Difficulty (inverted: lower accessibility = higher difficulty)
        accessibility_difficulty = 1.0 - inp.road_accessibility_score

        # 4. Resource Shortage (inverted: lower availability = higher shortage)
        resource_shortage = 1.0 - inp.available_inventory_ratio
        # Amplify if very few resources nearby
        if inp.nearby_resource_count <= 2:
            resource_shortage = min(1.0, resource_shortage * 1.5)

        # 5. Time Delay (logarithmic growth, saturates at critical threshold)
        if inp.elapsed_minutes <= 0:
            time_delay = 0.0
        else:
            # Normalized: approaches 1.0 as time approaches critical threshold
            time_delay = min(1.0, inp.elapsed_minutes / self.CRITICAL_DELAY_MINUTES)
            # Apply slight exponential curve for urgency
            time_delay = time_delay ** 0.7  # sub-linear growth for early urgency

        return {
            "people_affected": people_score,
            "death_risk": death_risk,
            "accessibility_difficulty": accessibility_difficulty,
            "resource_shortage": resource_shortage,
            "time_delay": time_delay,
        }

    def _aggregate_score(self, components: dict[str, float]) -> float:
        """Aggregate component scores using configured weights."""
        return (
            self.weights.people_affected * components["people_affected"]
            + self.weights.death_risk * components["death_risk"]
            + self.weights.accessibility_difficulty * components["accessibility_difficulty"]
            + self.weights.resource_shortage * components["resource_shortage"]
            + self.weights.time_delay * components["time_delay"]
        )

