"""
Tests for disaster service.
"""

import pytest

from app.models.disaster import Disaster
from app.schemas.disaster import DisasterCreate, Priority, DisasterType
from app.services.disaster_service import DisasterService


class TestDisasterService:
    """Test cases for DisasterService."""

    def test_create_disaster(self, test_db):
        """Test creating a single disaster."""
        service = DisasterService(test_db)
        
        disaster_data = DisasterCreate(
            lat=12.97,
            lng=77.59,
            disaster_type=DisasterType.FLOOD,
            severity=8,
            affected_population=1500,
            priority=Priority.HIGH,
        )
        
        disaster = service.create_disaster(disaster_data)
        
        assert disaster.id is not None
        assert disaster.lat == 12.97
        assert disaster.lng == 77.59
        assert disaster.disaster_type == "flood"
        assert disaster.severity == 8
        assert disaster.priority == "high"

    def test_create_disasters_bulk(self, test_db, sample_disaster_data):
        """Test creating multiple disasters."""
        service = DisasterService(test_db)
        
        disasters_data = [
            DisasterCreate(**d) for d in sample_disaster_data["disasters"]
        ]
        
        disasters = service.create_disasters_bulk(disasters_data)
        
        assert len(disasters) == 2
        assert all(d.id is not None for d in disasters)

    def test_get_disaster(self, test_db):
        """Test getting a disaster by ID."""
        service = DisasterService(test_db)
        
        # Create a disaster first
        disaster_data = DisasterCreate(
            lat=12.97,
            lng=77.59,
            disaster_type=DisasterType.FLOOD,
            severity=8,
            affected_population=1500,
            priority=Priority.HIGH,
        )
        created = service.create_disaster(disaster_data)
        
        # Get the disaster
        disaster = service.get_disaster(created.id)
        
        assert disaster.id == created.id
        assert disaster.lat == 12.97

    def test_get_disaster_not_found(self, test_db):
        """Test getting a non-existent disaster."""
        from app.core.exceptions import NotFoundException
        
        service = DisasterService(test_db)
        
        with pytest.raises(NotFoundException):
            service.get_disaster(99999)

    def test_get_disasters_pagination(self, test_db, sample_disaster_data):
        """Test listing disasters with pagination."""
        service = DisasterService(test_db)
        
        # Create disasters
        disasters_data = [
            DisasterCreate(**d) for d in sample_disaster_data["disasters"]
        ]
        service.create_disasters_bulk(disasters_data)
        
        # Get with pagination
        disasters, total = service.get_disasters(page=1, page_size=1)
        
        assert len(disasters) == 1
        assert total == 2

    def test_get_disaster_coordinates(self, test_db, sample_disaster_data):
        """Test getting disaster coordinates."""
        service = DisasterService(test_db)
        
        # Create disasters
        disasters_data = [
            DisasterCreate(**d) for d in sample_disaster_data["disasters"]
        ]
        created = service.create_disasters_bulk(disasters_data)
        
        # Get coordinates
        coords = service.get_disaster_coordinates([d.id for d in created])
        
        assert len(coords) == 2
        assert all(len(c) == 3 for c in coords)  # (id, lat, lng)
