"""
Resource discovery service for discovering and storing resources from OSM.
"""

from shapely.geometry import MultiPoint, Polygon
from shapely.ops import unary_union

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ResourceDiscoveryException, ValidationException
from app.core.logger import logger
from app.integrations.overpass_client import overpass_client, OSMResource
from app.models.disaster import Disaster
from app.models.resource_center import ResourceCenter


class ResourceDiscoveryService:
    """Service for discovering resources around disaster zones."""

    def __init__(self, db: Session):
        self.db = db

    def _get_disaster_coordinates(
        self,
        disaster_ids: list[int],
    ) -> list[tuple[float, float]]:
        """
        Get coordinates for specified disasters.
        
        Args:
            disaster_ids: List of disaster IDs
            
        Returns:
            List of (lat, lng) tuples
        """
        query = select(Disaster.lat, Disaster.lng).where(
            Disaster.id.in_(disaster_ids)
        )
        results = self.db.execute(query).all()
        
        if len(results) != len(disaster_ids):
            found_ids = set()
            query = select(Disaster.id).where(Disaster.id.in_(disaster_ids))
            found = self.db.execute(query).scalars().all()
            found_ids = set(found)
            missing = set(disaster_ids) - found_ids
            raise ValidationException(
                message="Some disaster IDs not found",
                details={"missing_ids": list(missing)},
            )
        
        return [(r.lat, r.lng) for r in results]

    def create_search_region(
        self,
        coordinates: list[tuple[float, float]],
        buffer_km: float | None = None,
    ) -> tuple[Polygon, tuple[float, float, float, float]]:
        """
        Create a search region from disaster coordinates.
        
        Creates a convex hull around all disaster points and buffers it
        by the search radius.
        
        Args:
            coordinates: List of (lat, lng) tuples
            buffer_km: Buffer radius in km
            
        Returns:
            Tuple of (Polygon, bbox) where bbox is (south, west, north, east)
        """
        buffer_km = buffer_km or settings.resource_search_radius_km
        
        if len(coordinates) == 1:
            # Single point - create a circular buffer
            lat, lng = coordinates[0]
            # Approximate degrees for buffer (rough conversion)
            buffer_deg = buffer_km / 111.0  # ~111km per degree
            
            # Create a square buffer around the point
            polygon = Polygon([
                (lng - buffer_deg, lat - buffer_deg),
                (lng + buffer_deg, lat - buffer_deg),
                (lng + buffer_deg, lat + buffer_deg),
                (lng - buffer_deg, lat + buffer_deg),
                (lng - buffer_deg, lat - buffer_deg),
            ])
        else:
            # Multiple points - create convex hull
            points = MultiPoint([(lng, lat) for lat, lng in coordinates])
            hull = points.convex_hull
            
            # Buffer the hull
            buffer_deg = buffer_km / 111.0
            polygon = hull.buffer(buffer_deg)
        
        # Get bounding box
        minx, miny, maxx, maxy = polygon.bounds
        bbox = (miny, minx, maxy, maxx)  # (south, west, north, east)
        
        return polygon, bbox

    async def discover_resources(
        self,
        disaster_ids: list[int],
        radius_km: float | None = None,
        resource_types: list[str] | None = None,
    ) -> tuple[list[ResourceCenter], dict]:
        """
        Discover resources around disaster zones.
        
        Args:
            disaster_ids: List of disaster IDs
            radius_km: Search radius in km
            resource_types: Filter to specific resource types
            
        Returns:
            Tuple of (discovered resources, search region GeoJSON)
        """
        radius_km = radius_km or settings.resource_search_radius_km
        
        # Get disaster coordinates
        coordinates = self._get_disaster_coordinates(disaster_ids)
        
        if not coordinates:
            raise ValidationException(
                message="No valid disaster coordinates found",
            )
        
        # Create search region
        polygon, bbox = self.create_search_region(coordinates, radius_km)
        
        logger.info(
            f"Discovering resources in bbox: {bbox}, "
            f"radius: {radius_km}km, types: {resource_types}"
        )
        
        # Discover resources from Overpass
        try:
            osm_resources = await overpass_client.discover_in_bbox(
                bbox=bbox,
                resource_types=resource_types,
            )
        except Exception as e:
            raise ResourceDiscoveryException(
                message=f"Failed to discover resources: {e}",
                details={"bbox": bbox},
            ) from e
        
        # Store discovered resources (respects RESOURCE_DISCOVERY_LIMIT)
        stored_resources = self._store_resources(osm_resources)

        # Create GeoJSON for the search region
        region_geojson = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [list(polygon.exterior.coords)],
            },
            "properties": {
                "search_radius_km": radius_km,
                "disaster_count": len(disaster_ids),
            },
        }
        
        logger.info(
            f"Discovered {len(osm_resources)} resources, "
            f"stored {len(stored_resources)} new resources"
        )
        
        return stored_resources, region_geojson

    def _store_resources(
        self,
        osm_resources: list[OSMResource],
    ) -> list[ResourceCenter]:
        """
        Store discovered resources in database, respecting the global limit.

        - If DB already has >= limit resources, no new ones are saved.
        - If DB has fewer, only enough new resources are added to reach the limit.
        - Excess old resources beyond the limit are purged.

        Args:
            osm_resources: List of discovered OSM resources
            
        Returns:
            List of stored ResourceCenter models (up to the limit)
        """
        from sqlalchemy import func, delete as sa_delete

        discovery_limit = settings.resource_discovery_limit

        # Count how many resources already exist in DB
        existing_total = self.db.execute(
            select(func.count()).select_from(ResourceCenter)
        ).scalar() or 0

        # If DB already exceeds or meets the limit, purge excess and return
        if existing_total >= discovery_limit:
            logger.info(
                f"DB already has {existing_total} resources (limit={discovery_limit}). "
                f"Purging excess and skipping new saves."
            )
            self._purge_excess_resources(discovery_limit)
            query = select(ResourceCenter).order_by(
                ResourceCenter.created_at.desc()
            ).limit(discovery_limit)
            return list(self.db.execute(query).scalars().all())

        # How many new slots are available
        slots_available = discovery_limit - existing_total

        # Get existing OSM IDs to avoid duplicates
        existing_osm_ids_query = select(ResourceCenter.osm_id).where(
            ResourceCenter.osm_id.in_([r.osm_id for r in osm_resources])
        )
        existing_osm_ids = set(
            self.db.execute(existing_osm_ids_query).scalars().all()
        )

        # Filter out already-existing resources, then cap to available slots
        new_resources = [
            r for r in osm_resources if r.osm_id not in existing_osm_ids
        ]
        new_resources = new_resources[:slots_available]

        if new_resources:
            resource_centers = [
                ResourceCenter(
                    osm_id=r.osm_id,
                    name=r.name,
                    lat=r.lat,
                    lng=r.lng,
                    resource_type=r.resource_type,
                    address=r.address,
                )
                for r in new_resources
            ]

            self.db.add_all(resource_centers)
            self.db.commit()

            for rc in resource_centers:
                self.db.refresh(rc)

            logger.info(
                f"Saved {len(resource_centers)} new resources "
                f"({existing_total} existed, limit={discovery_limit})"
            )

        # Return all resources up to the limit
        query = select(ResourceCenter).order_by(
            ResourceCenter.created_at.desc()
        ).limit(discovery_limit)
        return list(self.db.execute(query).scalars().all())

    def _purge_excess_resources(self, limit: int) -> None:
        """
        Delete resources beyond the limit, keeping the most recent ones.
        Only deletes resources that have no associated inventory or graph edges.
        """
        from sqlalchemy import func

        total = self.db.execute(
            select(func.count()).select_from(ResourceCenter)
        ).scalar() or 0

        if total <= limit:
            return

        excess = total - limit

        # Get IDs of the oldest resources to delete
        oldest_ids_query = select(ResourceCenter.id).order_by(
            ResourceCenter.created_at.asc()
        ).limit(excess)
        oldest_ids = list(self.db.execute(oldest_ids_query).scalars().all())

        if oldest_ids:
            from app.models.graph_edge import GraphEdge
            from sqlalchemy import delete as sa_delete

            # Delete associated graph edges first
            self.db.execute(
                sa_delete(GraphEdge).where(
                    (GraphEdge.target_resource_id.in_(oldest_ids)) |
                    (GraphEdge.source_resource_id.in_(oldest_ids))
                )
            )

            # Delete the excess resources
            self.db.execute(
                sa_delete(ResourceCenter).where(
                    ResourceCenter.id.in_(oldest_ids)
                )
            )
            self.db.commit()

            logger.info(
                f"Purged {len(oldest_ids)} excess resources "
                f"(kept {limit} most recent)"
            )

    def get_resources(
        self,
        resource_ids: list[int] | None = None,
        resource_types: list[str] | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[ResourceCenter], int]:
        """
        Get resource centers with optional filtering.
        Total results are capped to RESOURCE_DISCOVERY_LIMIT.

        Args:
            resource_ids: Optional list of specific IDs
            resource_types: Optional list of resource types to filter
            page: Page number
            page_size: Items per page
            
        Returns:
            Tuple of (resources list, total count)
        """
        from sqlalchemy import func

        discovery_limit = settings.resource_discovery_limit

        query = select(ResourceCenter)
        count_query = select(func.count()).select_from(ResourceCenter)
        
        if resource_ids:
            query = query.where(ResourceCenter.id.in_(resource_ids))
            count_query = count_query.where(ResourceCenter.id.in_(resource_ids))
        
        if resource_types:
            query = query.where(ResourceCenter.resource_type.in_(resource_types))
            count_query = count_query.where(
                ResourceCenter.resource_type.in_(resource_types)
            )
        
        raw_total = self.db.execute(count_query).scalar() or 0
        # Cap total to the discovery limit
        total = min(raw_total, discovery_limit)

        offset = (page - 1) * page_size
        # Ensure we never go beyond the capped total
        effective_limit = min(page_size, max(0, total - offset))
        query = query.order_by(
            ResourceCenter.created_at.desc()
        ).offset(offset).limit(effective_limit)

        resources = list(self.db.execute(query).scalars().all())
        
        return resources, total

    def get_resource(self, resource_id: int) -> ResourceCenter:
        """
        Get a single resource center.
        
        Args:
            resource_id: Resource center ID
            
        Returns:
            ResourceCenter model
        """
        from app.core.exceptions import NotFoundException
        
        resource = self.db.get(ResourceCenter, resource_id)
        
        if not resource:
            raise NotFoundException("ResourceCenter", resource_id)
        
        return resource

    def get_resource_coordinates(
        self,
        resource_ids: list[int] | None = None,
    ) -> list[tuple[int, float, float, str]]:
        """
        Get coordinates and type for resources.
        
        Args:
            resource_ids: Optional list of specific IDs
            
        Returns:
            List of (id, lat, lng, type) tuples
        """
        query = select(
            ResourceCenter.id,
            ResourceCenter.lat,
            ResourceCenter.lng,
            ResourceCenter.resource_type,
        )
        
        if resource_ids:
            query = query.where(ResourceCenter.id.in_(resource_ids))
        
        results = self.db.execute(query).all()
        return [(r.id, r.lat, r.lng, r.resource_type) for r in results]
