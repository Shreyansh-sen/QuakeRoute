#!/bin/bash
curl -s -X POST "http://localhost:8000/api/v1/graph/build" \
  -H "Content-Type: application/json" \
  -d '{"disaster_ids":[1,2],"resource_ids":null,"include_route_geometry":true,"max_distance_km":50}' \
  -o /tmp/graph_result.json

python3 /Users/pritam/Quantumx/QuakeRoute/backend/test_graph.py

