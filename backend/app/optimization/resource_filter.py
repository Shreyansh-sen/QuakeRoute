"""
PHASE 3 — Feasible Resource Filter.

Reduces the search space before optimization by rejecting resources that:
- Have no relevant inventory available
- Are incompatible with the disaster type
- Have ETA exceeding a threshold
- Are on inaccessible routes
- Are operationally disabled
"""

from dataclasses import dataclass, field
from typing import Any

from app.core.logger import logger


@dataclass
class ResourceCandidate:
    """A resource center being considered for allocation."""

    resource_id: int
    resource_type: str
    lat: float
    lng: float
    name: str
    inventory: dict[str, int]  # field -> quantity
    distance_meters: float = 0.0
    eta_seconds: float = 0.0
    route_risk: float = 0.0
    is_operational: bool = True


@dataclass
class FilterConfig:
    """Configuration for resource filtering."""

    max_eta_seconds: float = 7200.0  # 2 hours max
    max_route_risk: float = 0.9  # reject if risk > 0.9
    min_inventory_threshold: int = 1  # must have at least 1 unit of something relevant
    required_resource_types: dict[str, list[str]] = field(default_factory=dict)

    def __post_init__(self):
        if not self.required_resource_types:
            # Map disaster_type -> required resource fields
            self.required_resource_types = {
                "flood": ["water", "food", "rescue_team", "beds"],
                "earthquake": ["rescue_team", "ambulances", "beds", "doctors", "medical_kits"],
                "fire": ["fire_trucks", "rescue_team", "ambulances", "water"],
                "cyclone": ["food", "water", "beds", "rescue_team"],
                "landslide": ["rescue_team", "ambulances", "beds"],
                "tsunami": ["water", "food", "rescue_team", "beds"],
                "drought": ["food", "water", "medicine"],
                "other": ["beds", "food", "water", "medicine"],
            }


@dataclass
class FilterResult:
    """Result of resource filtering."""

    feasible: list[ResourceCandidate]
    rejected: list[tuple[ResourceCandidate, str]]  # (candidate, rejection_reason)
    total_candidates: int
    feasible_count: int
    rejection_reasons: dict[str, int] = field(default_factory=dict)


class ResourceFilter:
    """
    Filters resources to reduce the optimization search space.

    Only feasible, reachable, and inventory-sufficient resources
    pass through to the optimizer.
    """

    def __init__(self, config: FilterConfig | None = None):
        self.config = config or FilterConfig()

    def filter_feasible_resources(
        self,
        candidates: list[ResourceCandidate],
        disaster_type: str,
    ) -> FilterResult:
        """
        Filter resources based on feasibility criteria.

        Args:
            candidates: All resource candidates
            disaster_type: Type of disaster requiring resources

        Returns:
            FilterResult with feasible and rejected lists
        """
        feasible = []
        rejected = []
        reasons: dict[str, int] = {}

        for candidate in candidates:
            reason = self._evaluate_candidate(candidate, disaster_type)
            if reason is None:
                feasible.append(candidate)
            else:
                rejected.append((candidate, reason))
                reasons[reason] = reasons.get(reason, 0) + 1

        result = FilterResult(
            feasible=feasible,
            rejected=rejected,
            total_candidates=len(candidates),
            feasible_count=len(feasible),
            rejection_reasons=reasons,
        )

        logger.info(
            f"Resource filter: {result.feasible_count}/{result.total_candidates} feasible "
            f"for disaster_type={disaster_type}"
        )

        return result

    def _evaluate_candidate(
        self,
        candidate: ResourceCandidate,
        disaster_type: str,
    ) -> str | None:
        """
        Evaluate a single candidate. Returns rejection reason or None if feasible.
        """
        # Check operational status
        if not candidate.is_operational:
            return "operational_status_disabled"

        # Check route accessibility
        if not self.check_route_feasibility(candidate):
            return "route_inaccessible"

        # Check ETA threshold
        if candidate.eta_seconds > self.config.max_eta_seconds:
            return "eta_exceeds_threshold"

        # Check inventory feasibility
        if not self.check_inventory_feasibility(candidate, disaster_type):
            return "inventory_unavailable"

        # Check capacity constraints
        if not self.check_capacity_constraints(candidate, disaster_type):
            return "resource_incompatible"

        return None

    def check_inventory_feasibility(
        self,
        candidate: ResourceCandidate,
        disaster_type: str,
    ) -> bool:
        """
        Check if the resource has relevant inventory for this disaster type.

        Args:
            candidate: Resource candidate
            disaster_type: Type of disaster

        Returns:
            True if inventory is sufficient
        """
        required_fields = self.config.required_resource_types.get(
            disaster_type.lower(), ["beds", "food", "water"]
        )

        # Check if the resource has ANY relevant inventory
        for field_name in required_fields:
            quantity = candidate.inventory.get(field_name, 0)
            if quantity >= self.config.min_inventory_threshold:
                return True

        # No relevant inventory at all
        return False

    def check_route_feasibility(self, candidate: ResourceCandidate) -> bool:
        """
        Check if the route to this resource is accessible.

        Args:
            candidate: Resource candidate

        Returns:
            True if route is feasible
        """
        return candidate.route_risk < self.config.max_route_risk

    def check_capacity_constraints(
        self,
        candidate: ResourceCandidate,
        disaster_type: str,
    ) -> bool:
        """
        Check if the resource type is compatible with the disaster type.

        Args:
            candidate: Resource candidate
            disaster_type: Type of disaster

        Returns:
            True if resource type is compatible
        """
        # Define which resource types can serve which disaster types
        compatibility_map: dict[str, list[str]] = {
            "flood": ["hospital", "shelter", "warehouse", "fire_station", "ngo_center"],
            "earthquake": ["hospital", "fire_station", "shelter", "warehouse", "ngo_center"],
            "fire": ["fire_station", "hospital", "shelter", "warehouse"],
            "cyclone": ["shelter", "hospital", "warehouse", "ngo_center"],
            "landslide": ["hospital", "fire_station", "shelter"],
            "tsunami": ["hospital", "shelter", "warehouse", "ngo_center"],
            "drought": ["warehouse", "hospital", "pharmacy", "ngo_center"],
            "other": ["hospital", "shelter", "warehouse", "fire_station", "pharmacy", "ngo_center"],
        }

        compatible_types = compatibility_map.get(disaster_type.lower(), [])

        # If no map defined, allow all
        if not compatible_types:
            return True

        return candidate.resource_type.lower() in compatible_types

