"""
Pytest configuration and fixtures.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base


@pytest.fixture
def test_db():
    """Create a test database with SQLite in memory."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    TestSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )
    
    db = TestSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sample_disaster_data():
    """Sample disaster data for testing."""
    return {
        "disasters": [
            {
                "lat": 12.97,
                "lng": 77.59,
                "disaster_type": "flood",
                "severity": 8,
                "affected_population": 1500,
                "priority": "high",
            },
            {
                "lat": 13.02,
                "lng": 77.65,
                "disaster_type": "earthquake",
                "severity": 9,
                "affected_population": 3000,
                "priority": "critical",
            },
        ]
    }


@pytest.fixture
def sample_resource_data():
    """Sample resource data for testing."""
    return {
        "osm_id": 123456789,
        "name": "City Hospital",
        "lat": 12.98,
        "lng": 77.60,
        "resource_type": "hospital",
        "address": "123 Main St, City",
    }


@pytest.fixture
def sample_inventory_data():
    """Sample inventory data for testing."""
    return {
        "beds": 100,
        "ambulances": 10,
        "doctors": 25,
        "medical_kits": 500,
        "food": 0,
        "water": 0,
        "medicine": 1000,
        "fire_trucks": 0,
        "rescue_team": 5,
        "capacity": 150,
    }


@pytest.fixture
def mock_osm_response():
    """Mock OpenStreetMap/Overpass response."""
    return {
        "elements": [
            {
                "type": "node",
                "id": 123456789,
                "lat": 12.98,
                "lon": 77.60,
                "tags": {
                    "amenity": "hospital",
                    "name": "City Hospital",
                    "addr:street": "Main Street",
                    "addr:city": "Bangalore",
                },
            },
            {
                "type": "node",
                "id": 987654321,
                "lat": 12.99,
                "lon": 77.61,
                "tags": {
                    "amenity": "fire_station",
                    "name": "Fire Station 1",
                },
            },
        ]
    }


@pytest.fixture
def mock_osrm_response():
    """Mock OSRM route response."""
    return {
        "code": "Ok",
        "routes": [
            {
                "distance": 5000.0,
                "duration": 600.0,
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [77.59, 12.97],
                        [77.60, 12.98],
                    ],
                },
            }
        ],
        "waypoints": [
            {"location": [77.59, 12.97]},
            {"location": [77.60, 12.98]},
        ],
    }
