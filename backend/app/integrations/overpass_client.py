"""
Overpass API client for discovering real-world resources from OpenStreetMap.
"""

import time
from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalServiceException
from app.core.logger import log_external_api_call, logger


@dataclass
class OSMResource:
    """Represents a resource discovered from OpenStreetMap."""

    osm_id: int
    name: str
    lat: float
    lng: float
    resource_type: str
    address: str | None = None
    tags: dict | None = None


# Mapping of our resource types to OSM amenity/tags
OSM_RESOURCE_MAPPING: dict[str, list[str]] = {
    "hospital": ['amenity="hospital"'],
    "fire_station": ['amenity="fire_station"'],
    "police": ['amenity="police"'],
    "shelter": ['amenity="shelter"', 'social_facility="shelter"'],
    "pharmacy": ['amenity="pharmacy"'],
    "warehouse": ['building="warehouse"', 'industrial="warehouse"'],
    "ngo_center": ['office="ngo"', 'amenity="social_facility"'],
}


class OverpassClient:
    """
    Client for interacting with Overpass API.
    
    Discovers real-world resources (hospitals, fire stations, etc.)
    within a geographic region.
    """

    def __init__(
        self,
        base_url: str | None = None,
        timeout: float = 60.0,
    ):
        self.base_url = base_url or settings.overpass_url
        self.timeout = timeout
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

    def _build_query(
        self,
        bbox: tuple[float, float, float, float],
        resource_types: list[str] | None = None,
    ) -> str:
        """
        Build Overpass QL query for resource discovery.
        
        Args:
            bbox: Bounding box (south, west, north, east)
            resource_types: List of resource types to search for
            
        Returns:
            Overpass QL query string
        """
        south, west, north, east = bbox
        
        if resource_types is None:
            resource_types = list(OSM_RESOURCE_MAPPING.keys())

        # Build query parts for each resource type
        query_parts = []
        for rtype in resource_types:
            if rtype in OSM_RESOURCE_MAPPING:
                for osm_tag in OSM_RESOURCE_MAPPING[rtype]:
                    query_parts.append(
                        f'  node[{osm_tag}]({south},{west},{north},{east});'
                    )
                    query_parts.append(
                        f'  way[{osm_tag}]({south},{west},{north},{east});'
                    )

        query = f"""
[out:json][timeout:{int(self.timeout)}];
(
{chr(10).join(query_parts)}
);
out center;
"""
        return query

    def _build_radius_query(
        self,
        lat: float,
        lng: float,
        radius_meters: float,
        resource_types: list[str] | None = None,
    ) -> str:
        """
        Build Overpass QL query for radius-based resource discovery.
        
        Args:
            lat: Center latitude
            lng: Center longitude
            radius_meters: Search radius in meters
            resource_types: List of resource types to search for
            
        Returns:
            Overpass QL query string
        """
        if resource_types is None:
            resource_types = list(OSM_RESOURCE_MAPPING.keys())

        # Build query parts for each resource type
        query_parts = []
        for rtype in resource_types:
            if rtype in OSM_RESOURCE_MAPPING:
                for osm_tag in OSM_RESOURCE_MAPPING[rtype]:
                    query_parts.append(
                        f'  node[{osm_tag}](around:{radius_meters},{lat},{lng});'
                    )
                    query_parts.append(
                        f'  way[{osm_tag}](around:{radius_meters},{lat},{lng});'
                    )

        query = f"""
[out:json][timeout:{int(self.timeout)}];
(
{chr(10).join(query_parts)}
);
out center;
"""
        return query

    def _parse_response(
        self,
        data: dict,
        resource_types: list[str] | None = None,
    ) -> list[OSMResource]:
        """
        Parse Overpass API response into OSMResource objects.
        
        Args:
            data: Raw API response
            resource_types: Filter to specific types
            
        Returns:
            List of OSMResource objects
        """
        resources = []
        seen_ids: set[int] = set()

        for element in data.get("elements", []):
            osm_id = element.get("id")
            if not osm_id or osm_id in seen_ids:
                continue

            tags = element.get("tags", {})
            
            # Get coordinates (handle both nodes and ways)
            if element.get("type") == "way":
                center = element.get("center", {})
                lat = center.get("lat")
                lng = center.get("lon")
            else:
                lat = element.get("lat")
                lng = element.get("lon")

            if lat is None or lng is None:
                continue

            # Determine resource type from tags
            resource_type = self._determine_resource_type(tags)
            if resource_type is None:
                continue

            if resource_types and resource_type not in resource_types:
                continue

            # Get name (with fallback)
            name = (
                tags.get("name")
                or tags.get("name:en")
                or tags.get("operator")
                or f"{resource_type.title()} #{osm_id}"
            )

            # Build address
            address = self._build_address(tags)

            resources.append(
                OSMResource(
                    osm_id=osm_id,
                    name=name,
                    lat=lat,
                    lng=lng,
                    resource_type=resource_type,
                    address=address,
                    tags=tags,
                )
            )
            seen_ids.add(osm_id)

        return resources

    def _determine_resource_type(self, tags: dict) -> str | None:
        """Determine resource type from OSM tags."""
        amenity = tags.get("amenity")
        building = tags.get("building")
        office = tags.get("office")
        industrial = tags.get("industrial")
        social_facility = tags.get("social_facility")

        if amenity == "hospital":
            return "hospital"
        elif amenity == "fire_station":
            return "fire_station"
        elif amenity == "police":
            return "police"
        elif amenity == "pharmacy":
            return "pharmacy"
        elif amenity == "shelter" or social_facility == "shelter":
            return "shelter"
        elif amenity == "social_facility" or office == "ngo":
            return "ngo_center"
        elif building == "warehouse" or industrial == "warehouse":
            return "warehouse"

        return None

    def _build_address(self, tags: dict) -> str | None:
        """Build address string from OSM tags."""
        parts = []
        
        if tags.get("addr:housenumber"):
            parts.append(tags["addr:housenumber"])
        if tags.get("addr:street"):
            parts.append(tags["addr:street"])
        if tags.get("addr:city"):
            parts.append(tags["addr:city"])
        if tags.get("addr:postcode"):
            parts.append(tags["addr:postcode"])

        return ", ".join(parts) if parts else None

    async def discover_in_bbox(
        self,
        bbox: tuple[float, float, float, float],
        resource_types: list[str] | None = None,
    ) -> list[OSMResource]:
        """
        Discover resources within a bounding box.
        
        Args:
            bbox: Bounding box (south, west, north, east)
            resource_types: Filter to specific resource types
            
        Returns:
            List of discovered resources
        """
        query = self._build_query(bbox, resource_types)
        return await self._execute_query(query, resource_types)

    async def discover_around_point(
        self,
        lat: float,
        lng: float,
        radius_km: float | None = None,
        resource_types: list[str] | None = None,
    ) -> list[OSMResource]:
        """
        Discover resources around a point.
        
        Args:
            lat: Center latitude
            lng: Center longitude
            radius_km: Search radius in kilometers
            resource_types: Filter to specific resource types
            
        Returns:
            List of discovered resources
        """
        radius_km = radius_km or settings.resource_search_radius_km
        radius_meters = radius_km * 1000
        
        query = self._build_radius_query(lat, lng, radius_meters, resource_types)
        return await self._execute_query(query, resource_types)

    async def _execute_query(
        self,
        query: str,
        resource_types: list[str] | None = None,
    ) -> list[OSMResource]:
        """Execute Overpass query and parse results."""
        client = await self._get_client()
        
        start_time = time.perf_counter()
        
        try:
            logger.debug(f"Executing Overpass query: {query[:200]}...")
            
            response = await client.post(
                self.base_url,
                data={"data": query},
            )
            
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            if response.status_code != 200:
                log_external_api_call(
                    service="Overpass",
                    endpoint=self.base_url,
                    duration_ms=duration_ms,
                    status="error",
                    extra={"status_code": response.status_code},
                )
                raise ExternalServiceException(
                    service="Overpass",
                    message=f"Overpass API returned {response.status_code}",
                    details={"response": response.text[:500]},
                )

            data = response.json()
            resources = self._parse_response(data, resource_types)
            
            log_external_api_call(
                service="Overpass",
                endpoint=self.base_url,
                duration_ms=duration_ms,
                status="success",
                extra={"resource_count": len(resources)},
            )
            
            logger.info(f"Discovered {len(resources)} resources from Overpass")
            return resources

        except httpx.TimeoutException as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            log_external_api_call(
                service="Overpass",
                endpoint=self.base_url,
                duration_ms=duration_ms,
                status="timeout",
            )
            raise ExternalServiceException(
                service="Overpass",
                message="Overpass API request timed out",
            ) from e
        except httpx.RequestError as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            log_external_api_call(
                service="Overpass",
                endpoint=self.base_url,
                duration_ms=duration_ms,
                status="error",
                extra={"error": str(e)},
            )
            raise ExternalServiceException(
                service="Overpass",
                message=f"Overpass API request failed: {e}",
            ) from e


# Singleton instance
overpass_client = OverpassClient()
