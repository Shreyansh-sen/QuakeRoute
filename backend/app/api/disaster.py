"""
Disaster API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, QuakeRouteException
from app.db import get_db
from app.schemas.disaster import (
    DisasterBulkCreate,
    DisasterBulkResponse,
    DisasterCreate,
    DisasterListResponse,
    DisasterResponse,
    DisasterUpdate,
)
from app.services.disaster_service import DisasterService

router = APIRouter(prefix="/disasters", tags=["disasters"])


@router.post("", response_model=DisasterBulkResponse)
def create_disasters(
    payload: DisasterBulkCreate,
    db: Session = Depends(get_db),
):
    """
    Create multiple disaster nodes.
    
    This endpoint accepts a list of disasters and stores them in the database.
    """
    service = DisasterService(db)
    disasters = service.create_disasters_bulk(payload.disasters)
    
    return DisasterBulkResponse(
        created=[DisasterResponse.model_validate(d) for d in disasters],
        count=len(disasters),
    )


@router.get("", response_model=DisasterListResponse)
def list_disasters(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    List all disasters with pagination.
    """
    service = DisasterService(db)
    disasters, total = service.get_disasters(page=page, page_size=page_size)
    
    return DisasterListResponse(
        disasters=[DisasterResponse.model_validate(d) for d in disasters],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{disaster_id}", response_model=DisasterResponse)
def get_disaster(
    disaster_id: int,
    db: Session = Depends(get_db),
):
    """
    Get a specific disaster by ID.
    """
    service = DisasterService(db)
    
    try:
        disaster = service.get_disaster(disaster_id)
        return DisasterResponse.model_validate(disaster)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.patch("/{disaster_id}", response_model=DisasterResponse)
def update_disaster(
    disaster_id: int,
    update_data: DisasterUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a disaster.
    """
    service = DisasterService(db)
    
    try:
        disaster = service.update_disaster(disaster_id, update_data)
        return DisasterResponse.model_validate(disaster)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.delete("/{disaster_id}", status_code=204)
def delete_disaster(
    disaster_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete a disaster.
    """
    service = DisasterService(db)
    
    try:
        service.delete_disaster(disaster_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)
