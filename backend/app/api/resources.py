"""
Resource API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.exceptions import (
    NotFoundException,
    ResourceDiscoveryException,
    ValidationException,
)
from app.db import get_db
from app.schemas.resource import (
    ResourceCenterResponse,
    ResourceCenterWithInventory,
    ResourceDiscoveryRequest,
    ResourceDiscoveryResponse,
    ResourceListResponse,
)
from app.services.resource_discovery_service import ResourceDiscoveryService

router = APIRouter(prefix="/resources", tags=["resources"])


@router.post("/discover", response_model=ResourceDiscoveryResponse)
async def discover_resources(
    request: ResourceDiscoveryRequest,
    db: Session = Depends(get_db),
):
    """
    Discover resources around disaster zones.
    
    This endpoint:
    1. Takes disaster IDs
    2. Creates a geographic region (convex hull + buffer)
    3. Queries OpenStreetMap for nearby resources
    4. Stores discovered resources in the database
    """
    service = ResourceDiscoveryService(db)
    
    try:
        resources, search_region = await service.discover_resources(
            disaster_ids=request.disaster_ids,
            radius_km=request.radius_km,
            resource_types=[rt.value for rt in request.resource_types]
            if request.resource_types
            else None,
        )
        
        return ResourceDiscoveryResponse(
            discovered=[ResourceCenterResponse.model_validate(r) for r in resources],
            count=len(resources),
            search_region=search_region,
        )
    except ValidationException as e:
        raise HTTPException(status_code=422, detail=e.message)
    except ResourceDiscoveryException as e:
        raise HTTPException(status_code=503, detail=e.message)


@router.get("", response_model=ResourceListResponse)
def list_resources(
    resource_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    List all resources with optional filtering.
    """
    service = ResourceDiscoveryService(db)
    
    resource_types = [resource_type] if resource_type else None
    resources, total = service.get_resources(
        resource_types=resource_types,
        page=page,
        page_size=page_size,
    )
    
    return ResourceListResponse(
        resources=[ResourceCenterResponse.model_validate(r) for r in resources],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{resource_id}", response_model=ResourceCenterWithInventory)
def get_resource(
    resource_id: int,
    db: Session = Depends(get_db),
):
    """
    Get a specific resource center by ID with inventory.
    """
    service = ResourceDiscoveryService(db)
    
    try:
        resource = service.get_resource(resource_id)
        response = ResourceCenterWithInventory.model_validate(resource)
        response.has_inventory = resource.inventory is not None
        return response
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)
