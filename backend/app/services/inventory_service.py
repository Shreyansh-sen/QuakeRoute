"""
Inventory service for managing resource inventories.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.core.logger import logger
from app.models.resource_center import ResourceCenter
from app.models.resource_inventory import ResourceInventory
from app.schemas.inventory import InventoryCreate, InventoryUpdate


class InventoryService:
    """Service for managing resource inventories."""

    def __init__(self, db: Session):
        self.db = db

    def create_or_update_inventory(
        self,
        inventory_data: InventoryCreate,
    ) -> ResourceInventory:
        """
        Create or update inventory for a resource center.
        
        Args:
            inventory_data: Inventory data
            
        Returns:
            ResourceInventory model
        """
        # Verify resource center exists
        resource_center = self.db.get(
            ResourceCenter,
            inventory_data.resource_center_id,
        )
        
        if not resource_center:
            raise NotFoundException(
                "ResourceCenter",
                inventory_data.resource_center_id,
            )
        
        # Check if inventory already exists
        query = select(ResourceInventory).where(
            ResourceInventory.resource_center_id == inventory_data.resource_center_id
        )
        existing = self.db.execute(query).scalar_one_or_none()
        
        if existing:
            # Update existing inventory
            return self._update_inventory(existing, inventory_data)
        
        # Create new inventory
        inventory = ResourceInventory(
            resource_center_id=inventory_data.resource_center_id,
            beds=inventory_data.beds,
            ambulances=inventory_data.ambulances,
            doctors=inventory_data.doctors,
            medical_kits=inventory_data.medical_kits,
            food=inventory_data.food,
            water=inventory_data.water,
            medicine=inventory_data.medicine,
            fire_trucks=inventory_data.fire_trucks,
            rescue_team=inventory_data.rescue_team,
            capacity=inventory_data.capacity,
            extra_inventory=inventory_data.extra_inventory,
        )
        
        self.db.add(inventory)
        self.db.commit()
        self.db.refresh(inventory)
        
        logger.info(
            f"Created inventory for resource center: {inventory_data.resource_center_id}"
        )
        return inventory

    def _update_inventory(
        self,
        inventory: ResourceInventory,
        inventory_data: InventoryCreate | InventoryUpdate,
    ) -> ResourceInventory:
        """
        Update existing inventory.
        
        Args:
            inventory: Existing inventory model
            inventory_data: Update data
            
        Returns:
            Updated ResourceInventory model
        """
        update_dict = inventory_data.model_dump(
            exclude_unset=True,
            exclude={"resource_center_id"},
        )
        
        for field, value in update_dict.items():
            if value is not None:
                setattr(inventory, field, value)
        
        self.db.commit()
        self.db.refresh(inventory)
        
        logger.info(f"Updated inventory: id={inventory.id}")
        return inventory

    def get_inventory(self, resource_center_id: int) -> ResourceInventory:
        """
        Get inventory for a resource center.
        
        Args:
            resource_center_id: Resource center ID
            
        Returns:
            ResourceInventory model
        """
        query = select(ResourceInventory).where(
            ResourceInventory.resource_center_id == resource_center_id
        )
        inventory = self.db.execute(query).scalar_one_or_none()
        
        if not inventory:
            raise NotFoundException("Inventory", resource_center_id)
        
        return inventory

    def get_inventory_by_id(self, inventory_id: int) -> ResourceInventory:
        """
        Get inventory by its ID.
        
        Args:
            inventory_id: Inventory ID
            
        Returns:
            ResourceInventory model
        """
        inventory = self.db.get(ResourceInventory, inventory_id)
        
        if not inventory:
            raise NotFoundException("Inventory", inventory_id)
        
        return inventory

    def update_inventory(
        self,
        resource_center_id: int,
        update_data: InventoryUpdate,
    ) -> ResourceInventory:
        """
        Update inventory for a resource center.
        
        Args:
            resource_center_id: Resource center ID
            update_data: Update data
            
        Returns:
            Updated ResourceInventory model
        """
        inventory = self.get_inventory(resource_center_id)
        return self._update_inventory(inventory, update_data)

    def bulk_update_inventory(
        self,
        updates: list[InventoryCreate],
    ) -> list[ResourceInventory]:
        """
        Bulk create/update inventories.
        
        Args:
            updates: List of inventory updates
            
        Returns:
            List of updated ResourceInventory models
        """
        results = []
        
        for update in updates:
            try:
                inventory = self.create_or_update_inventory(update)
                results.append(inventory)
            except Exception as e:
                logger.error(
                    f"Failed to update inventory for resource {update.resource_center_id}: {e}"
                )
                raise
        
        return results

    def delete_inventory(self, resource_center_id: int) -> None:
        """
        Delete inventory for a resource center.
        
        Args:
            resource_center_id: Resource center ID
        """
        inventory = self.get_inventory(resource_center_id)
        
        self.db.delete(inventory)
        self.db.commit()
        
        logger.info(f"Deleted inventory for resource center: {resource_center_id}")

    def get_all_inventories(
        self,
        resource_types: list[str] | None = None,
    ) -> list[ResourceInventory]:
        """
        Get all inventories with optional filtering by resource type.
        
        Args:
            resource_types: Optional list of resource types to filter
            
        Returns:
            List of ResourceInventory models
        """
        if resource_types:
            # Join with resource_centers to filter by type
            query = (
                select(ResourceInventory)
                .join(ResourceCenter)
                .where(ResourceCenter.resource_type.in_(resource_types))
            )
        else:
            query = select(ResourceInventory)
        
        return list(self.db.execute(query).scalars().all())

    def get_available_capacity(
        self,
        resource_center_id: int,
    ) -> dict[str, int]:
        """
        Get available capacity for a resource center.
        
        Args:
            resource_center_id: Resource center ID
            
        Returns:
            Dict of resource -> available quantity
        """
        try:
            inventory = self.get_inventory(resource_center_id)
        except NotFoundException:
            return {}
        
        return {
            "beds": inventory.beds or 0,
            "ambulances": inventory.ambulances or 0,
            "doctors": inventory.doctors or 0,
            "medical_kits": inventory.medical_kits or 0,
            "food": inventory.food or 0,
            "water": inventory.water or 0,
            "medicine": inventory.medicine or 0,
            "fire_trucks": inventory.fire_trucks or 0,
            "rescue_team": inventory.rescue_team or 0,
            "capacity": inventory.capacity or 0,
        }
