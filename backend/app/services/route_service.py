"""
Route service for calculating routes between points.
"""

from app.core.exceptions import RouteGenerationException
from app.core.logger import logger
from app.integrations.osrm_client import osrm_client, RouteResult, DistanceMatrixResult


class RouteService:
    """Service for route calculations using OSRM."""

    async def get_route(
        self,
        source_lat: float,
        source_lng: float,
        target_lat: float,
        target_lng: float,
        include_geometry: bool = True,
    ) -> RouteResult:
        """
        Calculate route between two points.
        
        Args:
            source_lat: Source latitude
            source_lng: Source longitude
            target_lat: Target latitude
            target_lng: Target longitude
            include_geometry: Whether to include route geometry
            
        Returns:
            RouteResult with distance, duration, and geometry
        """
        try:
            result = await osrm_client.get_route(
                source_lat=source_lat,
                source_lng=source_lng,
                target_lat=target_lat,
                target_lng=target_lng,
                include_geometry=include_geometry,
            )
            return result
        except Exception as e:
            logger.error(f"Route calculation failed: {e}")
            raise RouteGenerationException(
                message=f"Failed to calculate route: {e}",
                details={
                    "source": (source_lat, source_lng),
                    "target": (target_lat, target_lng),
                },
            ) from e

    async def get_distance_matrix(
        self,
        points: list[tuple[float, float]],
    ) -> DistanceMatrixResult:
        """
        Calculate distance matrix between multiple points.
        
        Args:
            points: List of (lat, lng) tuples
            
        Returns:
            DistanceMatrixResult with distance and duration matrices
        """
        if len(points) < 2:
            raise RouteGenerationException(
                message="At least 2 points required for distance matrix",
            )
        
        try:
            result = await osrm_client.get_distance_matrix(
                sources=points,
                destinations=points,
            )
            return result
        except Exception as e:
            logger.error(f"Distance matrix calculation failed: {e}")
            raise RouteGenerationException(
                message=f"Failed to calculate distance matrix: {e}",
            ) from e

    async def get_routes_from_point(
        self,
        source_lat: float,
        source_lng: float,
        targets: list[tuple[float, float]],
        include_geometry: bool = False,
    ) -> list[RouteResult]:
        """
        Calculate routes from a single source to multiple targets.
        
        Args:
            source_lat: Source latitude
            source_lng: Source longitude
            targets: List of (lat, lng) target tuples
            include_geometry: Whether to include route geometry
            
        Returns:
            List of RouteResult objects
        """
        results = []
        
        for target_lat, target_lng in targets:
            try:
                result = await self.get_route(
                    source_lat=source_lat,
                    source_lng=source_lng,
                    target_lat=target_lat,
                    target_lng=target_lng,
                    include_geometry=include_geometry,
                )
                results.append(result)
            except Exception as e:
                logger.warning(
                    f"Failed to calculate route to ({target_lat}, {target_lng}): {e}"
                )
                # Continue with other routes
        
        return results

    async def calculate_edge_weight(
        self,
        distance_meters: float,
        duration_seconds: float,
        priority: str = "medium",
    ) -> float:
        """
        Calculate edge weight for graph optimization.
        
        Combines distance, time, and priority into a single weight.
        
        Args:
            distance_meters: Distance in meters
            duration_seconds: Duration in seconds
            priority: Priority level (critical, high, medium, low)
            
        Returns:
            Calculated weight
        """
        # Priority multipliers (lower = more important)
        priority_weights = {
            "critical": 0.5,
            "high": 0.75,
            "medium": 1.0,
            "low": 1.5,
        }
        
        priority_mult = priority_weights.get(priority.lower(), 1.0)
        
        # Normalize distance and time
        # Using a weighted combination
        distance_weight = distance_meters / 1000  # Convert to km
        time_weight = duration_seconds / 60  # Convert to minutes
        
        # Combined weight: prioritize time but consider distance
        weight = (0.6 * time_weight + 0.4 * distance_weight) * priority_mult
        
        return max(0.1, weight)  # Minimum weight of 0.1


# Singleton instance
route_service = RouteService()
