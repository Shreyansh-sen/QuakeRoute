"""
OSRM client for route calculation and distance/duration retrieval.
"""

import time
from dataclasses import dataclass, field

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalServiceException, RouteGenerationException
from app.core.logger import log_external_api_call, logger


@dataclass
class RouteResult:
    """Represents a route calculation result."""

    distance_meters: float
    duration_seconds: float
    geometry: dict | None = None
    source: tuple[float, float] = field(default_factory=tuple)  # (lat, lng)
    target: tuple[float, float] = field(default_factory=tuple)  # (lat, lng)
    waypoints: list[dict] = field(default_factory=list)


@dataclass
class DistanceMatrixResult:
    """Represents a distance matrix calculation result."""

    distances: list[list[float]]  # Matrix of distances in meters
    durations: list[list[float]]  # Matrix of durations in seconds
    sources: list[tuple[float, float]]
    destinations: list[tuple[float, float]]


class OSRMClient:
    """
    Client for interacting with OSRM (Open Source Routing Machine).
    
    Calculates routes, distances, and durations between points.
    """

    def __init__(
        self,
        base_url: str | None = None,
        timeout: float = 30.0,
        profile: str = "driving",
    ):
        self.base_url = (base_url or settings.osrm_base_url).rstrip("/")
        self.timeout = timeout
        self.profile = profile
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout),
                headers={"User-Agent": "QuakeRoute/1.0"},
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

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
            RouteResult with distance, duration, and optionally geometry
        """
        # OSRM uses lng,lat format
        coordinates = f"{source_lng},{source_lat};{target_lng},{target_lat}"
        
        params = {
            "overview": "full" if include_geometry else "false",
            "geometries": "geojson",
            "steps": "false",
        }
        
        url = f"{self.base_url}/route/v1/{self.profile}/{coordinates}"
        
        client = await self._get_client()
        start_time = time.perf_counter()
        
        try:
            response = await client.get(url, params=params)
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            if response.status_code != 200:
                log_external_api_call(
                    service="OSRM",
                    endpoint=url,
                    duration_ms=duration_ms,
                    status="error",
                    extra={"status_code": response.status_code},
                )
                raise RouteGenerationException(
                    message=f"OSRM API returned {response.status_code}",
                    details={"response": response.text[:500]},
                )

            data = response.json()
            
            if data.get("code") != "Ok":
                log_external_api_call(
                    service="OSRM",
                    endpoint=url,
                    duration_ms=duration_ms,
                    status="error",
                    extra={"code": data.get("code"), "message": data.get("message")},
                )
                raise RouteGenerationException(
                    message=f"OSRM routing failed: {data.get('message', 'Unknown error')}",
                    details={"code": data.get("code")},
                )

            routes = data.get("routes", [])
            if not routes:
                raise RouteGenerationException(
                    message="No route found between points",
                )

            route = routes[0]
            
            geometry = None
            if include_geometry and "geometry" in route:
                geometry = route["geometry"]

            log_external_api_call(
                service="OSRM",
                endpoint=url,
                duration_ms=duration_ms,
                status="success",
                extra={"distance": route["distance"], "duration": route["duration"]},
            )

            return RouteResult(
                distance_meters=route["distance"],
                duration_seconds=route["duration"],
                geometry=geometry,
                source=(source_lat, source_lng),
                target=(target_lat, target_lng),
                waypoints=data.get("waypoints", []),
            )

        except httpx.TimeoutException as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            log_external_api_call(
                service="OSRM",
                endpoint=url,
                duration_ms=duration_ms,
                status="timeout",
            )
            raise ExternalServiceException(
                service="OSRM",
                message="OSRM API request timed out",
            ) from e
        except httpx.RequestError as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            log_external_api_call(
                service="OSRM",
                endpoint=url,
                duration_ms=duration_ms,
                status="error",
                extra={"error": str(e)},
            )
            raise ExternalServiceException(
                service="OSRM",
                message=f"OSRM API request failed: {e}",
            ) from e

    async def get_distance_matrix(
        self,
        sources: list[tuple[float, float]],
        destinations: list[tuple[float, float]] | None = None,
    ) -> DistanceMatrixResult:
        """
        Calculate distance/duration matrix between multiple points.
        
        Args:
            sources: List of (lat, lng) tuples for source points
            destinations: List of (lat, lng) tuples for destination points
                         If None, calculates all-to-all matrix
                         
        Returns:
            DistanceMatrixResult with distance and duration matrices
        """
        if destinations is None:
            destinations = sources

        # Build coordinates string (OSRM uses lng,lat)
        all_points = sources + [d for d in destinations if d not in sources]
        coordinates = ";".join(f"{lng},{lat}" for lat, lng in all_points)
        
        # Build source and destination indices
        source_indices = list(range(len(sources)))
        dest_start = len(sources)
        dest_indices = []
        
        for dest in destinations:
            if dest in sources:
                dest_indices.append(sources.index(dest))
            else:
                dest_indices.append(dest_start)
                dest_start += 1

        params = {
            "sources": ";".join(map(str, source_indices)),
            "destinations": ";".join(map(str, dest_indices)),
            "annotations": "distance,duration",
        }
        
        url = f"{self.base_url}/table/v1/{self.profile}/{coordinates}"
        
        client = await self._get_client()
        start_time = time.perf_counter()
        
        try:
            response = await client.get(url, params=params)
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            if response.status_code != 200:
                log_external_api_call(
                    service="OSRM",
                    endpoint=url,
                    duration_ms=duration_ms,
                    status="error",
                    extra={"status_code": response.status_code},
                )
                raise ExternalServiceException(
                    service="OSRM",
                    message=f"OSRM API returned {response.status_code}",
                )

            data = response.json()
            
            if data.get("code") != "Ok":
                log_external_api_call(
                    service="OSRM",
                    endpoint=url,
                    duration_ms=duration_ms,
                    status="error",
                    extra={"code": data.get("code")},
                )
                raise ExternalServiceException(
                    service="OSRM",
                    message=f"OSRM table failed: {data.get('message', 'Unknown error')}",
                )

            log_external_api_call(
                service="OSRM",
                endpoint=url,
                duration_ms=duration_ms,
                status="success",
                extra={
                    "sources": len(sources),
                    "destinations": len(destinations),
                },
            )

            # Handle null values in the matrix (unreachable points)
            distances = data.get("distances", [])
            durations = data.get("durations", [])
            
            # Replace None with infinity for unreachable points
            distances = [
                [float("inf") if d is None else d for d in row]
                for row in distances
            ]
            durations = [
                [float("inf") if d is None else d for d in row]
                for row in durations
            ]

            return DistanceMatrixResult(
                distances=distances,
                durations=durations,
                sources=sources,
                destinations=destinations,
            )

        except httpx.TimeoutException as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            log_external_api_call(
                service="OSRM",
                endpoint=url,
                duration_ms=duration_ms,
                status="timeout",
            )
            raise ExternalServiceException(
                service="OSRM",
                message="OSRM API request timed out",
            ) from e
        except httpx.RequestError as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            log_external_api_call(
                service="OSRM",
                endpoint=url,
                duration_ms=duration_ms,
                status="error",
                extra={"error": str(e)},
            )
            raise ExternalServiceException(
                service="OSRM",
                message=f"OSRM API request failed: {e}",
            ) from e

    async def get_simple_distance(
        self,
        source_lat: float,
        source_lng: float,
        target_lat: float,
        target_lng: float,
    ) -> tuple[float, float]:
        """
        Get simple distance and duration between two points.
        
        Returns:
            Tuple of (distance_meters, duration_seconds)
        """
        result = await self.get_route(
            source_lat,
            source_lng,
            target_lat,
            target_lng,
            include_geometry=False,
        )
        return result.distance_meters, result.duration_seconds


# Singleton instance
osrm_client = OSRMClient()
