"""
Disaster service for business logic related to disasters.
"""

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.core.logger import logger
from app.models.disaster import Disaster
from app.schemas.disaster import DisasterCreate, DisasterUpdate


class DisasterService:
    """Service for managing disaster nodes."""

    def __init__(self, db: Session):
        self.db = db

    def create_disaster(self, disaster_data: DisasterCreate) -> Disaster:
        """
        Create a single disaster node.
        
        Args:
            disaster_data: Disaster creation data
            
        Returns:
            Created Disaster model
        """
        disaster = Disaster(
            lat=disaster_data.lat,
            lng=disaster_data.lng,
            disaster_type=disaster_data.disaster_type.value,
            severity=disaster_data.severity,
            affected_population=disaster_data.affected_population,
            priority=disaster_data.priority.value,
            notes=disaster_data.notes,
        )
        
        self.db.add(disaster)
        self.db.commit()
        self.db.refresh(disaster)
        
        logger.info(f"Created disaster: id={disaster.id}, type={disaster.disaster_type}")
        return disaster

    def create_disasters_bulk(
        self,
        disasters_data: list[DisasterCreate],
    ) -> list[Disaster]:
        """
        Create multiple disaster nodes.
        
        Args:
            disasters_data: List of disaster creation data
            
        Returns:
            List of created Disaster models
        """
        disasters = [
            Disaster(
                lat=d.lat,
                lng=d.lng,
                disaster_type=d.disaster_type.value,
                severity=d.severity,
                affected_population=d.affected_population,
                priority=d.priority.value,
                notes=d.notes,
            )
            for d in disasters_data
        ]
        
        self.db.add_all(disasters)
        self.db.commit()
        
        for disaster in disasters:
            self.db.refresh(disaster)
        
        logger.info(f"Created {len(disasters)} disasters in bulk")
        return disasters

    def get_disaster(self, disaster_id: int) -> Disaster:
        """
        Get a disaster by ID.
        
        Args:
            disaster_id: Disaster ID
            
        Returns:
            Disaster model
            
        Raises:
            NotFoundException: If disaster not found
        """
        disaster = self.db.get(Disaster, disaster_id)
        
        if not disaster:
            raise NotFoundException("Disaster", disaster_id)
        
        return disaster

    def get_disasters(
        self,
        disaster_ids: list[int] | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[Disaster], int]:
        """
        Get disasters with optional filtering.
        
        Args:
            disaster_ids: Optional list of specific IDs to fetch
            page: Page number (1-indexed)
            page_size: Number of items per page
            
        Returns:
            Tuple of (disasters list, total count)
        """
        query = select(Disaster)
        count_query = select(func.count()).select_from(Disaster)
        
        if disaster_ids:
            query = query.where(Disaster.id.in_(disaster_ids))
            count_query = count_query.where(Disaster.id.in_(disaster_ids))
        
        # Get total count
        total = self.db.execute(count_query).scalar() or 0
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size).order_by(Disaster.created_at.desc())
        
        disasters = list(self.db.execute(query).scalars().all())
        
        return disasters, total

    def update_disaster(
        self,
        disaster_id: int,
        update_data: DisasterUpdate,
    ) -> Disaster:
        """
        Update a disaster.
        
        Args:
            disaster_id: Disaster ID
            update_data: Update data
            
        Returns:
            Updated Disaster model
        """
        disaster = self.get_disaster(disaster_id)
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        for field, value in update_dict.items():
            if value is not None:
                # Convert enums to values
                if hasattr(value, "value"):
                    value = value.value
                setattr(disaster, field, value)
        
        self.db.commit()
        self.db.refresh(disaster)
        
        logger.info(f"Updated disaster: id={disaster_id}")
        return disaster

    def delete_disaster(self, disaster_id: int) -> None:
        """
        Delete a disaster.
        
        Args:
            disaster_id: Disaster ID
        """
        disaster = self.get_disaster(disaster_id)
        
        self.db.delete(disaster)
        self.db.commit()
        
        logger.info(f"Deleted disaster: id={disaster_id}")

    def get_disaster_coordinates(
        self,
        disaster_ids: list[int] | None = None,
    ) -> list[tuple[int, float, float]]:
        """
        Get coordinates for disasters.
        
        Args:
            disaster_ids: Optional list of specific IDs
            
        Returns:
            List of (id, lat, lng) tuples
        """
        query = select(Disaster.id, Disaster.lat, Disaster.lng)
        
        if disaster_ids:
            query = query.where(Disaster.id.in_(disaster_ids))
        
        results = self.db.execute(query).all()
        return [(r.id, r.lat, r.lng) for r in results]
