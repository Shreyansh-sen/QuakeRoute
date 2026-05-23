# AGENT_ALGORITHM.md

# HAQRA Algorithm Implementation Guide

## Hybrid Adaptive Quantum-Ready Resource Allocation Algorithm

This document defines ONLY the implementation rules and architecture for the HAQRA optimization engine.

Do NOT implement frontend logic, auth systems, deployment pipelines, or unrelated backend modules here.

Focus ONLY on:

* severity scoring
* graph generation
* resource filtering
* allocation optimization
* routing optimization
* reoptimization
* quantum-ready abstractions

---

# Core Objective

The algorithm must:

1. Maximize total lives saved globally
2. Minimize response time
3. Prioritize high severity zones
4. Maximize resource utilization
5. Dynamically reroute and reoptimize

The system must optimize globally across all disaster zones simultaneously.

Do NOT use naive local greedy allocation only.

---

# Optimization Philosophy

The system solves:

Dynamic Multi-Objective Graph Optimization

Inputs:

* disaster nodes
* resource centers
* traffic-aware routes
* inventory capacities
* severity updates

Outputs:

* optimized allocations
* optimized routes
* ETA predictions
* survival utility scores

---

# Core Algorithm Architecture

HAQRA consists of:

1. Dynamic Severity Engine
2. Geo-Spatial Graph Engine
3. Feasible Resource Filter
4. Global Survival Optimizer
5. Hybrid Allocation Engine
6. Routing Optimization Engine
7. Incremental Reoptimization Engine
8. Quantum-Ready Optimization Layer

---

# PHASE 1 — Dynamic Severity Engine

Create:

optimization/severity_engine.py

Purpose:
Compute adaptive disaster urgency.

---

## Severity Formula

S_i =
w1(PeopleAffected)

* w2(DeathRisk)
* w3(AccessibilityDifficulty)
* w4(ResourceShortage)
* w5(TimeDelay)

Where:

PeopleAffected:
normalized affected population

DeathRisk:
criticality score

AccessibilityDifficulty:
difficulty reaching zone

ResourceShortage:
missing essential resources

TimeDelay:
delay since disaster began

---

# Requirements

Severity must:

* update dynamically
* increase if aid delayed
* increase if local resources depleted
* support configurable weights
* normalize values to 0–10

---

# Required Functions

compute_dynamic_severity()

update_severity_over_time()

normalize_severity_score()

---

# PHASE 2 — Geo-Spatial Graph Engine

Create:

graph/graph_builder.py

Purpose:
Build compact weighted optimization graph.

---

# Graph Rules

Nodes:

* disasters
* hospitals
* warehouses
* shelters
* fire stations
* pharmacies
* NGOs

Edges:

* travel time
* route distance
* traffic penalty
* accessibility penalty

DO NOT:

* build full road-level graph
* create every street intersection

Target:
20–50 optimization nodes max.

---

# Required Functions

build_optimization_graph()

create_disaster_nodes()

create_resource_nodes()

connect_graph_edges()

---

# Edge Cost Function

E_ij =
alpha(distance)

* beta(traffic_delay)
* gamma(route_risk)

Lower edge cost = better route.

---

# Required Functions

compute_edge_cost()

compute_route_risk()

compute_eta()

---

# PHASE 3 — Feasible Resource Filter

Create:

optimization/resource_filter.py

Purpose:
Reduce search space before optimization.

---

# Filter Conditions

Reject resources if:

* inventory unavailable
* resource incompatible
* ETA exceeds threshold
* route inaccessible
* operational status disabled

Example:

* no ambulances left
* road flooded
* helicopter unavailable

---

# Required Functions

filter_feasible_resources()

check_inventory_feasibility()

check_route_feasibility()

check_capacity_constraints()

---

# PHASE 4 — Global Survival Optimizer

Create:

optimization/survival_optimizer.py

Purpose:
Maximize total global survival probability.

Do NOT optimize one disaster independently.

Optimize ALL disaster zones simultaneously.

---

# Survival Utility Function

U =
sum(
severity
* affected_population
* resource_match_score
  / ETA
  )

Higher utility = more lives saved.

---

# Resource Match Rules

Flood:

* water → high score
* boats → high score

Earthquake:

* rescue_team → high score
* ambulances → high score

Fire:

* fire_trucks → high score

---

# Required Functions

compute_survival_utility()

compute_resource_match_score()

rank_disaster_priority()

generate_global_priority_queue()

---

# PHASE 5 — Hybrid Allocation Engine

Create:

optimization/allocation_engine.py

Purpose:
Allocate divisible and indivisible resources differently.

---

# Divisible Resources

Examples:

* food
* water
* medicine

Use:
weighted proportional allocation

Higher severity receives larger share.

---

# Required Functions

allocate_divisible_resources()

compute_proportional_distribution()

prevent_over_allocation()

---

# Indivisible Resources

Examples:

* ambulances
* helicopters
* rescue teams
* doctors

Use:
assignment optimization
or bipartite matching

A resource unit cannot serve multiple disasters simultaneously.

---

# Required Functions

allocate_indivisible_resources()

perform_bipartite_matching()

optimize_assignment_cost()

---

# Allocation Constraints

NEVER:

* exceed inventory
* duplicate indivisible assignment
* allocate inaccessible routes

ALWAYS:

* allow partial fulfillment
* prioritize highest utility outcomes

---

# PHASE 6 — Routing Optimization Engine

Create:

optimization/routing_engine.py

Purpose:
Compute optimal delivery paths.

---

# Routing Algorithms

Primary:

* A*

Fallback:

* Dijkstra

---

# Routing Inputs

Use:

* traffic-aware edge weights
* OSRM route metadata
* accessibility penalties
* road blockages

---

# Routing Outputs

Return:

* shortest ETA
* optimal route
* reroute recommendations

---

# Required Functions

compute_optimal_route()

compute_shortest_eta()

reroute_if_blocked()

cache_route_metadata()

---

# PHASE 7 — Incremental Reoptimization Engine

Create:

optimization/reoptimization_engine.py

Purpose:
Avoid full recomputation.

Reoptimize ONLY affected graph regions.

---

# Reoptimization Triggers

Trigger if:

* severity changes
* traffic changes
* roads blocked
* inventory changes
* new disaster appears

---

# Required Functions

detect_graph_changes()

partial_graph_recompute()

incremental_reoptimization()

update_priority_queue()

---

# PHASE 8 — Quantum-Ready Layer

Create:

quantum/qaoa_adapter.py

Purpose:
Prepare future quantum optimization integration.

Do NOT tightly couple with classical optimization.

Quantum must remain isolated.

---

# Quantum Objective

Future QAOA should minimize:

distance

* delay
* shortage_penalty
* mismatch_penalty

---

# Required Functions

convert_graph_to_qubo()

build_cost_matrix()

build_constraint_matrix()

prepare_qaoa_input()

---

# Engineering Rules

NEVER:

* place optimization logic inside routes
* tightly couple graph and quantum code
* mix database logic with optimization
* directly mutate graph during iteration

ALWAYS:

* isolate optimization layers
* use reusable utility functions
* support async-safe execution
* support future distributed optimization

---

# Performance Rules

The system must:

* handle 20–50 nodes efficiently
* support near real-time updates
* avoid O(n³) recomputation loops when possible
* cache reusable route metadata
* minimize external API calls

---

# Recommended Algorithms

| Component              | Algorithm                       |
| ---------------------- | ------------------------------- |
| Shortest Path          | A*                              |
| Fast Fallback          | Dijkstra                        |
| Divisible Allocation   | Weighted proportional           |
| Indivisible Allocation | Hungarian matching              |
| Global Optimization    | Simulated annealing             |
| Dynamic Updates        | Incremental graph recomputation |
| Future Quantum         | QAOA                            |

---

# Optimization Pipeline

1. Compute dynamic severity
2. Build optimization graph
3. Filter feasible resources
4. Compute survival utility
5. Generate global priority queue
6. Allocate divisible resources
7. Allocate indivisible resources
8. Compute optimized routes
9. Return allocation plan
10. Monitor for reoptimization triggers

---

# Final Output Structure

Optimization result must return:

{
"allocations": [],
"routes": [],
"eta_predictions": [],
"survival_utility_score": float,
"resource_shortages": [],
"reroute_recommendations": [],
"unfulfilled_demands": []
}

---

# Goal of HAQRA

HAQRA is designed to:

* maximize total survival probability
* minimize disaster response delay
* dynamically adapt to changing conditions
* remain scalable for future quantum optimization
* support real-world disaster coordination systems
