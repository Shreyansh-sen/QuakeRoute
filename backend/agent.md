# AGENT.md

# Quantum Disaster Resource Allocation System
Backend Engineering Specification

## Project Goal

Build a backend system for a disaster-response platform where users create disaster nodes on a live map and the system automatically discovers nearby real-world resource centers (hospitals, fire stations, shelters, etc.), enriches them with resource inventories through an admin panel, constructs a graph, and later performs optimization using classical + quantum methods.

This backend should be:

- Modular
- Environment-driven
- Service-oriented
- Extensible
- Easy to wire
- Future-proof for QAOA integration
- Cleanly separated by responsibility

DO NOT tightly couple routes, database logic, optimization logic, external APIs, or graph construction.

---

# Core User Flow

Step 1:

Frontend allows users to select multiple disaster locations on a live map.

For each selected disaster node:

User inputs:

- disaster_type
- severity
- affected_population
- priority
- optional notes

Frontend sends a parent payload:

```json
{
  "disasters":[
    {
      "lat":12.97,
      "lng":77.59,
      "disaster_type":"flood",
      "severity":9,
      "affected_population":1200,
      "priority":"high"
    }
  ]
}
```

Backend stores disaster nodes.

---

Step 2:

Extract coordinates from all disaster nodes.

Create a geographic region covering them.

Preferred:

Convex Hull / Polygon.

Example:

Disaster A
Disaster B
Disaster C

↓

Create disaster region

This region will be used for nearby resource discovery.

---

Step 3:

Discover nearby real-world resources.

Resources include:

- hospitals
- fire_station
- police
- shelter
- pharmacy
- warehouse (custom)
- ngo_center (custom)

Use OpenStreetMap/Overpass APIs.

Store:

- coordinates
- OSM id
- name
- type

Only location metadata exists initially.

No inventory data exists yet.

---

Step 4:

Send discovered resources to Admin Panel.

Admin enriches:

Hospital:

- beds
- doctors
- ambulances
- medical kits

Warehouse:

- food
- water
- medicine

Fire Station:

- fire_trucks
- rescue_team

Store inventories separately.

---

Step 5:

Graph generation.

Nodes:

- disasters
- hospitals
- warehouses
- shelters
- fire stations

Edges:

- distance
- travel_time
- route geometry

Do NOT manually create routes.

Use real routing providers.

---

Step 6:

Optimization layer.

Initially:

Classical:

- Dijkstra
- Greedy allocation

Future:

Quantum:

QAOA
Qiskit Optimization

Quantum logic should remain isolated.

Never mix with route logic.

---

# Tech Stack

Language:

Python 3.12+

Framework:

FastAPI

Database:

PostgreSQL

Extension:

PostGIS

ORM:

SQLAlchemy 2.x

Migrations:

Alembic

Validation:

Pydantic v2

HTTP:

httpx

Graph:

networkx

Geo:

shapely
geopy

External APIs:

OpenStreetMap
Overpass
OSRM

Quantum:

Qiskit
Qiskit Optimization

Testing:

pytest

Container:

docker
docker-compose

---

# Dependency Install

```bash
pip install fastapi
pip install uvicorn
pip install sqlalchemy
pip install psycopg2-binary
pip install geoalchemy2
pip install alembic
pip install pydantic
pip install httpx
pip install networkx
pip install geopy
pip install shapely
pip install python-dotenv
pip install pytest
```

Future:

```bash
pip install qiskit
pip install qiskit-optimization
```

---

# Environment Variables

Must use .env

Never hardcode values.

Example:

```env
APP_NAME=quantum-disaster-system

ENV=dev

HOST=0.0.0.0
PORT=8000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=quantum_disaster
DB_USER=postgres
DB_PASSWORD=password

DATABASE_URL=

OSRM_BASE_URL=https://router.project-osrm.org

OVERPASS_URL=https://overpass-api.de/api/interpreter

RESOURCE_SEARCH_RADIUS_KM=15

LOG_LEVEL=INFO
```

Use:

Pydantic Settings.

Create:

app/core/config.py

No direct os.getenv usage outside config.

---

# Expected Folder Structure

backend/

app/

    api/
        disaster.py
        resources.py
        admin.py
        graph.py
        optimize.py

    schemas/
        disaster.py
        resource.py
        inventory.py

    models/
        disaster.py
        resource_center.py
        resource_inventory.py
        graph_edge.py

    services/

        disaster_service.py

        resource_discovery_service.py

        inventory_service.py

        route_service.py

        graph_service.py

        optimization_service.py

    integrations/

        overpass_client.py

        osrm_client.py

    graph/

        builder.py

        route_generator.py

    quantum/

        qaoa_engine.py

    db/

        session.py
        base.py

    core/

        config.py
        logger.py

main.py

tests/

docker-compose.yml

.env

AGENT.md

---

# Database Design

Table:

disasters

Columns:

id
lat
lng
disaster_type
severity
affected_population
priority
created_at

---

Table:

resource_centers

Columns:

id
osm_id
name
lat
lng
resource_type

Examples:

hospital
fire_station
shelter

No inventory here.

---

Table:

resource_inventory

Columns:

id
resource_center_id

beds
ambulances
doctors

food
water
medicine

rescue_team

updated_at

Separate inventory from centers.

Inventory changes frequently.

Locations do not.

---

# API Contracts

POST /disasters

Input:

```json
{
 "disasters":[]
}
```

Response:

stored disaster nodes

---

POST /resources/discover

Input:

disaster ids

Flow:

Find polygon

Search nearby resources

Save resources

Return discovered nodes

---

POST /admin/inventory

Input:

resource center id

Inventory fields

Update inventory

---

POST /graph/build

Build graph from:

disasters
resources
routes

---

POST /optimize

Future endpoint.

Returns:

allocation

route

ETA

priority ordering

---

# Resource Discovery Rules

Use Overpass.

Never ask user to manually create hospitals.

Only disaster nodes are user-created.

Resource nodes should be dynamically discovered.

Radius:

15km default

Search:

hospital
fire_station
police
pharmacy
shelter

Support custom resources later.

---

# Routing Rules

Use OSRM.

Do not calculate route geometry manually.

Retrieve:

distance

duration

coordinates

Convert route metadata into graph edges.

---

# Graph Rules

Do NOT create graph nodes for every road intersection.

Too large.

Graph should contain:

disaster nodes

resource nodes

major connection points only

Target:

20–50 nodes max

Graph should stay optimization friendly.

---

# Coding Rules

Strict separation of concerns.

Routes:
request/response only

Services:
business logic

Models:
DB only

Integrations:
external APIs only

Graph:
graph generation only

Quantum:
optimization only

Never place SQL inside route handlers.

Never place external API calls inside routes.

No business logic inside models.

---

# Logging

Use centralized logger.

No print statements.

Create:

core/logger.py

Include:

request_id
error trace
external API timing

---

# Error Handling

Create custom exceptions.

Examples:

ResourceDiscoveryException

GraphBuildException

RouteGenerationException

ExternalServiceException

---

# Testing

Test:

resource discovery

graph generation

polygon creation

inventory update

route generation

Use mocked APIs.

Never hit real APIs in tests.

---

# Phase 1 Deliverables

Must complete:

✓ disaster node storage

✓ polygon generation

✓ resource discovery

✓ inventory enrichment

✓ DB persistence

✓ graph creation

DO NOT begin quantum implementation before Phase 1 completes.

---

# Future Quantum Integration

QAOA should consume:

Graph

Resource capacities

Disaster priorities

Distance weights

Optimization objective:

Minimize:

distance
+ delay
+ shortages
+ resource mismatch

Keep optimization engine fully isolated.

No quantum code should affect API layers.