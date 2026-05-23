"""
Tests for inventory service.
"""

import pytest

from app.models.resource_center import ResourceCenter
from app.models.resource_inventory import ResourceInventory
from app.schemas.inventory import InventoryCreate, InventoryUpdate
from app.services.inventory_service import InventoryService


class TestInventoryService:
    """Test cases for InventoryService."""

    def test_create_inventory(self, test_db, sample_resource_data, sample_inventory_data):
        """Test creating inventory for a resource center."""
        # First create a resource center
        resource = ResourceCenter(**sample_resource_data)
        test_db.add(resource)
        test_db.commit()
        test_db.refresh(resource)
        
        service = InventoryService(test_db)
        
        inventory_data = InventoryCreate(
            resource_center_id=resource.id,
            **sample_inventory_data,
        )
        
        inventory = service.create_or_update_inventory(inventory_data)
        
        assert inventory.id is not None
        assert inventory.resource_center_id == resource.id
        assert inventory.beds == 100
        assert inventory.ambulances == 10

    def test_update_inventory(self, test_db, sample_resource_data, sample_inventory_data):
        """Test updating existing inventory."""
        # Create resource center
        resource = ResourceCenter(**sample_resource_data)
        test_db.add(resource)
        test_db.commit()
        test_db.refresh(resource)
        
        service = InventoryService(test_db)
        
        # Create initial inventory
        inventory_data = InventoryCreate(
            resource_center_id=resource.id,
            **sample_inventory_data,
        )
        service.create_or_update_inventory(inventory_data)
        
        # Update inventory
        update_data = InventoryUpdate(beds=150, doctors=30)
        updated = service.update_inventory(resource.id, update_data)
        
        assert updated.beds == 150
        assert updated.doctors == 30
        assert updated.ambulances == 10  # Unchanged

    def test_get_inventory_not_found(self, test_db):
        """Test getting inventory for non-existent resource."""
        from app.core.exceptions import NotFoundException
        
        service = InventoryService(test_db)
        
        with pytest.raises(NotFoundException):
            service.get_inventory(99999)

    def test_get_available_capacity(self, test_db, sample_resource_data, sample_inventory_data):
        """Test getting available capacity."""
        # Create resource center with inventory
        resource = ResourceCenter(**sample_resource_data)
        test_db.add(resource)
        test_db.commit()
        test_db.refresh(resource)
        
        service = InventoryService(test_db)
        
        inventory_data = InventoryCreate(
            resource_center_id=resource.id,
            **sample_inventory_data,
        )
        service.create_or_update_inventory(inventory_data)
        
        # Get capacity
        capacity = service.get_available_capacity(resource.id)
        
        assert capacity["beds"] == 100
        assert capacity["ambulances"] == 10
        assert capacity["doctors"] == 25

    def test_get_available_capacity_no_inventory(self, test_db, sample_resource_data):
        """Test getting capacity when no inventory exists."""
        # Create resource center without inventory
        resource = ResourceCenter(**sample_resource_data)
        test_db.add(resource)
        test_db.commit()
        test_db.refresh(resource)
        
        service = InventoryService(test_db)
        
        capacity = service.get_available_capacity(resource.id)
        
        assert capacity == {}
