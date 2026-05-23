# Quantum Disaster Resource Allocation System
Backend Engineering Specification

---

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

> **DO NOT** tightly couple routes, database logic, optimization logic, external APIs, or graph construction.

---

## Core User Flow

### Step 1 — Disaster Node Creation

Frontend allows users to select multiple disaster locations on a live map.

For each selected disaster node, the user inputs:

| Field                 | Type    | Description                        |
|-----------------------|---------|------------------------------------|
| `disaster_type`       | string  | e.g. flood, earthquake             |
| `severity`            | int     | 1–10 scale                         |
| `affected_population` | int     | Number of people affected          |
| `priority`            | string  | high / medium / low                |
| `notes` *(optional)*  | string  | Additional context                 |

**Frontend sends a parent payload:**

```json
{
  "disasters": [
    {
      "lat": 12.97,
      "lng": 77.59,
      "disaster_type": "flood",
      "severity": 9,
      "affected_population": 1200,
      "priority": "high"
    }
  ]
}
```

Backend stores disaster nodes.

---

### Step 2 — Geographic Region Construction

Extract coordinates from all disaster nodes and create a geographic region covering them.

**Preferred method:** Convex Hull / Polygon

```
Disaster A  ──┐
Disaster B  ──┼──► Create Disaster Region Polygon
Disaster C  ──┘
```

This region is used for nearby resource discovery.

---

### Step 3 — Resource Discovery

Discover nearby real-world resources using OpenStreetMap / Overpass APIs.

**Resource types discovered:**

| Type           | Source |
|----------------|--------|
| `hospital`     | OSM    |
| `fire_station` | OSM    |
| `police`       | OSM    |
| `shelter`      | OSM    |
| `pharmacy`     | OSM    |
| `warehouse`    | Custom |
| `ngo_center`   | Custom |

**Stored per resource:**

- Coordinates (lat/lng)
- OSM ID
- Name
- Type

> Only location metadata exists at this stage. No inventory data yet.

---

### Step 4 — Admin Inventory Enrichment

Discovered resources are sent to the Admin Panel for enrichment.

**Hospital inventory fields:**

- `beds`
- `doctors`
- `ambulances`
- `medical_kits`

**Warehouse inventory fields:**

- `food`
- `water`
- `medicine`

**Fire Station inventory fields:**

- `fire_trucks`
- `rescue_team`

Inventories are stored separately from location data.

---

### Step 5 — Graph Generation

**Graph nodes include:**

- Disaster nodes
- Hospitals
- Warehouses
- Shelters
- Fire stations

**Graph edges include:**

- `distance`
- `travel_time`
- `route_geometry`

> Do **NOT** manually create routes. Use real routing providers (OSRM).

---

### Step 6 — Optimization Layer

**Phase 1 — Classical:**

- Dijkstra shortest path
- Greedy resource allocation

**Phase 2 — Quantum (Future):**

- QAOA
- Qiskit Optimization

> Quantum logic must remain fully isolated. Never mix with route logic.

---

## Tech Stack

| Category        | Technology                    |
|-----------------|-------------------------------|
| Language        | Python 3.12+                  |
| Framework       | FastAPI                       |
| Database        | PostgreSQL + PostGIS          |
| ORM             | SQLAlchemy 2.x                |
| Migrations      | Alembic                       |
| Validation      | Pydantic v2                   |
| HTTP Client     | httpx                         |
| Graph           | networkx                      |
| Geo             | shapely, geopy                |
| External APIs   | OpenStreetMap, Overpass, OSRM |
| Quantum         | Qiskit, Qiskit Optimization   |
| Testing         | pytest                        |
| Container       | Docker, docker-compose        |

---

## Dependency Installation

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

**Future (Quantum phase):**

```bash
pip install qiskit
pip install qiskit-optimization
```

---

## Environment Variables

All configuration must use `.env`. Never hardcode values anywhere.

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

**Configuration loader:** Pydantic Settings → `app/core/config.py`

> No direct `os.getenv()` usage outside `config.py`.

---

## Folder Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── disaster.py
│   │   ├── resources.py
│   │   ├── admin.py
│   │   ├── graph.py
│   │   └── optimize.py
│   │
│   ├── schemas/
│   │   ├── disaster.py
│   │   ├── resource.py
│   │   └── inventory.py
│   │
│   ├── models/
│   │   ├── disaster.py
│   │   ├── resource_center.py
│   │   ├── resource_inventory.py
│   │   └── graph_edge.py
│   │
│   ├── services/
│   │   ├── disaster_service.py
│   │   ├── resource_discovery_service.py
│   │   ├── inventory_service.py
│   │   ├── route_service.py
│   │   ├── graph_service.py
│   │   └── optimization_service.py
│   │
│   ├── integrations/
│   │   ├── overpass_client.py
│   │   └── osrm_client.py
│   │
│   ├── graph/
│   │   ├── builder.py
│   │   └── route_generator.py
│   │
│   ├── quantum/
│   │   └── qaoa_engine.py
│   │
│   ├── db/
│   │   ├── session.py
│   │   └── base.py
│   │
│   └── core/
│       ├── config.py
│       └── logger.py
│
├── main.py
├── tests/
├── docker-compose.yml
├── .env
└── AGENT.md
```

---

## Database Design

### Table: `disasters`

| Column                | Type     | Notes                   |
|-----------------------|----------|-------------------------|
| `id`                  | UUID/int | Primary key             |
| `lat`                 | float    | Latitude                |
| `lng`                 | float    | Longitude               |
| `disaster_type`       | string   | flood, earthquake, etc. |
| `severity`            | int      | 1–10                    |
| `affected_population` | int      |                         |
| `priority`            | string   | high / medium / low     |
| `created_at`          | datetime | Auto-generated          |

---

### Table: `resource_centers`

| Column          | Type   | Notes                             |
|-----------------|--------|-----------------------------------|
| `id`            | UUID   | Primary key                       |
| `osm_id`        | string | OpenStreetMap identifier          |
| `name`          | string | Resource center name              |
| `lat`           | float  | Latitude                          |
| `lng`           | float  | Longitude                         |
| `resource_type` | string | hospital, fire_station, shelter … |

> No inventory stored here. Locations do not change frequently.

---

### Table: `resource_inventory`

| Column               | Type     | Notes                         |
|----------------------|----------|-------------------------------|
| `id`                 | UUID     | Primary key                   |
| `resource_center_id` | FK       | References `resource_centers` |
| `beds`               | int      | Hospital                      |
| `ambulances`         | int      | Hospital                      |
| `doctors`            | int      | Hospital                      |
| `food`               | int      | Warehouse                     |
| `water`              | int      | Warehouse                     |
| `medicine`           | int      | Warehouse / Hospital          |
| `rescue_team`        | int      | Fire station                  |
| `updated_at`         | datetime | Auto-updated on change        |

> Inventory is kept separate because it changes frequently while locations do not.

---

## API Contracts

### `POST /disasters`

**Input:**

```json
{
  "disasters": []
}
```

**Response:** Stored disaster nodes

---

### `POST /resources/discover`

**Input:** List of disaster IDs

**Flow:**

1. Find bounding polygon from disaster coordinates
2. Search nearby resources via Overpass API
3. Save discovered resources to DB
4. Return discovered resource nodes

---

### `POST /admin/inventory`

**Input:** Resource center ID + inventory fields

**Action:** Create or update the inventory for the given resource center

---

### `POST /graph/build`

**Input:** *(optional filters)*

**Action:** Build graph from disasters, resources, and OSRM routes

---

### `POST /optimize` *(Future)*

**Response:**

```json
{
  "allocation": {},
  "route": {},
  "eta": "",
  "priority_ordering": []
}
```

---

## Resource Discovery Rules

- Use **Overpass API** exclusively for resource discovery.
- Never ask the user to manually create hospitals or other resources.
- Only **disaster nodes** are user-created.
- Resource nodes must be **dynamically discovered**.
- Default search radius: **15 km** (configurable via `RESOURCE_SEARCH_RADIUS_KM`).

**Search tags:**

- `amenity=hospital`
- `amenity=fire_station`
- `amenity=police`
- `amenity=pharmacy`
- `amenity=shelter`

Support for custom resource types (warehouse, ngo_center) to be added later.

---

## Routing Rules

- Use **OSRM** for all routing.
- Do NOT calculate route geometry manually.
- Retrieve from OSRM: `distance`, `duration`, `coordinates`.
- Convert route metadata into **graph edges**.

---

## Graph Rules

- Do **NOT** create graph nodes for every road intersection — graph would be too large.
- Graph should contain only: disaster nodes, resource nodes, and major connection points.
- **Target size:** 20–50 nodes max.
- Graph must remain **optimization-friendly**.

---

## Coding Rules

### Strict Separation of Concerns

| Layer            | Responsibility                   |
|------------------|----------------------------------|
| **Routes**       | Request / response handling only |
| **Services**     | All business logic               |
| **Models**       | Database schema only             |
| **Integrations** | External API calls only          |
| **Graph**        | Graph generation only            |
| **Quantum**      | Optimization logic only          |

> ❌ Never place SQL inside route handlers.  
> ❌ Never place external API calls inside routes.  
> ❌ No business logic inside models.

---

## Logging

- Use a **centralized logger** — no `print()` statements anywhere.
- Logger lives at: `app/core/logger.py`

**Log must include:**

- `request_id`
- Error trace
- External API timing

---

## Error Handling

Create custom exceptions for all major failure modes:

| Exception                    | When to Raise                        |
|------------------------------|--------------------------------------|
| `ResourceDiscoveryException` | Overpass API failure or no results   |
| `GraphBuildException`        | Graph construction failure           |
| `RouteGenerationException`   | OSRM failure or invalid route        |
| `ExternalServiceException`   | Any external service timeout / error |

---

## Testing

**Test coverage required for:**

- Resource discovery
- Graph generation
- Polygon creation
- Inventory update
- Route generation

> ✅ Use **mocked APIs** in all tests.  
> ❌ Never hit real APIs in tests.

---

## Phase 1 Deliverables

| Deliverable           | Status      |
|-----------------------|-------------|
| Disaster node storage | ✅ Required |
| Polygon generation    | ✅ Required |
| Resource discovery    | ✅ Required |
| Inventory enrichment  | ✅ Required |
| DB persistence        | ✅ Required |
| Graph creation        | ✅ Required |

> **DO NOT** begin quantum implementation before Phase 1 is complete.

---

## Future Quantum Integration

**QAOA will consume:**

- The constructed graph
- Resource capacities
- Disaster priorities
- Distance weights

**Optimization objective — Minimize:**

```
cost = distance + delay + shortages + resource_mismatch
```

> ✅ Keep the optimization engine **fully isolated**.  
> ❌ No quantum code should affect or touch the API layers.

