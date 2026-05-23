"""
HAQRA - Hybrid Adaptive Quantum-Ready Resource Allocation Algorithm.

This package implements the full HAQRA optimization pipeline:
1. Dynamic Severity Engine
2. Geo-Spatial Graph Engine
3. Feasible Resource Filter
4. Global Survival Optimizer
5. Hybrid Allocation Engine
6. Routing Optimization Engine
7. Incremental Reoptimization Engine
8. Quantum-Ready Optimization Layer (QAOA Adapter)
"""

from app.optimization.severity_engine import SeverityEngine
from app.optimization.resource_filter import ResourceFilter
from app.optimization.survival_optimizer import SurvivalOptimizer
from app.optimization.allocation_engine import AllocationEngine
from app.optimization.routing_engine import RoutingEngine
from app.optimization.reoptimization_engine import ReoptimizationEngine
from app.optimization.haqra_pipeline import HAQRAPipeline, HAQRAResult

__all__ = [
    "SeverityEngine",
    "ResourceFilter",
    "SurvivalOptimizer",
    "AllocationEngine",
    "RoutingEngine",
    "ReoptimizationEngine",
    "HAQRAPipeline",
    "HAQRAResult",
]

