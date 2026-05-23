"""
Admin API endpoints for inventory management.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.db import get_db
from app.schemas.inventory import (
    InventoryBulkResponse,
    InventoryBulkUpdate,
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate,
)
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/inventory", response_model=InventoryResponse)
def create_or_update_inventory(
    inventory_data: InventoryCreate,
    db: Session = Depends(get_db),
):
    """
    Create or update inventory for a resource center.
    
    This is the main endpoint for admins to enrich resource centers
    with inventory data (beds, ambulances, food, etc.).
    """
    service = InventoryService(db)
    
    try:
        inventory = service.create_or_update_inventory(inventory_data)
        return InventoryResponse.model_validate(inventory)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.post("/inventory/bulk", response_model=InventoryBulkResponse)
def bulk_update_inventory(
    payload: InventoryBulkUpdate,
    db: Session = Depends(get_db),
):
    """
    Bulk update inventories for multiple resource centers.
    """
    service = InventoryService(db)
    
    try:
        inventories = service.bulk_update_inventory(payload.updates)
        return InventoryBulkResponse(
            updated=[InventoryResponse.model_validate(i) for i in inventories],
            count=len(inventories),
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)
    except ValidationException as e:
        raise HTTPException(status_code=422, detail=e.message)


@router.get("/inventory/{resource_center_id}", response_model=InventoryResponse)
def get_inventory(
    resource_center_id: int,
    db: Session = Depends(get_db),
):
    """
    Get inventory for a specific resource center.
    """
    service = InventoryService(db)
    
    try:
        inventory = service.get_inventory(resource_center_id)
        return InventoryResponse.model_validate(inventory)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.patch("/inventory/{resource_center_id}", response_model=InventoryResponse)
def update_inventory(
    resource_center_id: int,
    update_data: InventoryUpdate,
    db: Session = Depends(get_db),
):
    """
    Update inventory for a resource center.
    """
    service = InventoryService(db)
    
    try:
        inventory = service.update_inventory(resource_center_id, update_data)
        return InventoryResponse.model_validate(inventory)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.delete("/inventory/{resource_center_id}", status_code=204)
def delete_inventory(
    resource_center_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete inventory for a resource center.
    """
    service = InventoryService(db)
    
    try:
        service.delete_inventory(resource_center_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)
