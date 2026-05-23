"""
Optimization API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import OptimizationException
from app.db import get_db
from app.schemas.optimize import (
    AllocationStatus,
    OptimizationAlgorithm,
    OptimizationRequest,
    OptimizationResponse,
    OptimizationResult,
    ShortestPathRequest,
    ShortestPathResponse,
)
from app.services.optimization_service import OptimizationService

router = APIRouter(prefix="/optimize", tags=["optimization"])


@router.post("", response_model=OptimizationResponse)
def run_optimization(
    request: OptimizationRequest,
    db: Session = Depends(get_db),
):
    """
    Run resource allocation optimization.
    
    This endpoint:
    1. Loads the graph, disasters, resources, and inventories
    2. Runs the specified optimization algorithm
    3. Returns optimal resource allocations
    
    Available algorithms:
    - greedy: Fast heuristic allocation
    - dijkstra: Shortest path based allocation
    - qaoa: Quantum optimization (requires Qiskit)
    """
    service = OptimizationService(db)
    
    try:
        result = service.optimize(
            algorithm=request.algorithm,
            disaster_ids=request.disaster_ids,
            objective=request.objective,
            constraints=request.constraints,
            max_iterations=request.max_iterations,
        )
        
        # Determine status
        if result.coverage_percentage >= 100:
            status = AllocationStatus.ALLOCATED
        elif result.coverage_percentage > 0:
            status = AllocationStatus.PARTIALLY_ALLOCATED
        else:
            status = AllocationStatus.FAILED
        
        return OptimizationResponse(
            result=OptimizationResult(
                allocations=result.allocations,
                total_distance=result.total_distance,
                total_time=result.total_time,
                coverage_percentage=result.coverage_percentage,
                unmet_demands=result.unmet_demands,
                algorithm_used=request.algorithm,
                iterations=result.iterations,
                computation_time_ms=result.computation_time_ms,
            ),
            status=status,
        )
    except OptimizationException as e:
        raise HTTPException(status_code=500, detail=e.message)


@router.post("/shortest-path", response_model=ShortestPathResponse)
def find_shortest_path(
    request: ShortestPathRequest,
    db: Session = Depends(get_db),
):
    """
    Find shortest path between two nodes in the graph.
    """
    service = OptimizationService(db)
    
    try:
        path, total_distance, total_duration = service.find_shortest_path(
            source_node_id=request.source_node_id,
            target_node_id=request.target_node_id,
        )
        
        return ShortestPathResponse(
            path=path,
            total_distance=total_distance,
            total_duration=total_duration,
            edges=[],  # Could populate with edge details if needed
        )
    except OptimizationException as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.get("/algorithms")
def list_algorithms():
    """
    List available optimization algorithms.
    """
    return {
        "algorithms": [
            {
                "id": OptimizationAlgorithm.GREEDY.value,
                "name": "Greedy",
                "description": "Fast heuristic that allocates resources to nearest disasters by priority",
                "available": True,
            },
            {
                "id": OptimizationAlgorithm.DIJKSTRA.value,
                "name": "Dijkstra",
                "description": "Shortest path based allocation using graph weights",
                "available": True,
            },
            {
                "id": OptimizationAlgorithm.MIN_COST_FLOW.value,
                "name": "Min Cost Flow",
                "description": "Optimal flow-based allocation (coming soon)",
                "available": False,
            },
            {
                "id": OptimizationAlgorithm.QAOA.value,
                "name": "QAOA (Quantum)",
                "description": "Quantum Approximate Optimization Algorithm. Requires Qiskit.",
                "available": False,  # Will be True when Qiskit is installed
            },
        ]
    }
