"""
Graph API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import GraphBuildException, RouteGenerationException
from app.db import get_db
from app.schemas.graph import (
    GraphBuildRequest,
    GraphEdgeSchema,
    GraphNode,
    GraphResponse,
    GraphStats,
    RouteRequest,
    RouteResponse,
)
from app.services.graph_service import GraphService
from app.services.route_service import route_service

router = APIRouter(prefix="/graph", tags=["graph"])


@router.post("/build", response_model=GraphResponse)
async def build_graph(
    request: GraphBuildRequest,
    db: Session = Depends(get_db),
):
    """
    Build graph from disasters and resources.
    
    This endpoint:
    1. Loads disasters and resources from DB
    2. Calculates routes between nodes using OSRM
    3. Creates graph edges with distance, duration, and weight
    4. Stores edges in the database
    
    The graph is used for optimization algorithms.
    """
    service = GraphService(db)
    
    try:
        nodes, edges = await service.build_graph(
            disaster_ids=request.disaster_ids,
            resource_ids=request.resource_ids,
            include_geometry=request.include_route_geometry,
            max_distance_km=request.max_distance_km or 50.0,
        )
        
        # Convert to response schemas
        graph_nodes = [
            GraphNode(
                id=n["id"],
                node_type=n["node_type"],
                lat=n["lat"],
                lng=n["lng"],
                label=n["label"],
                metadata=n.get("metadata", {}),
            )
            for n in nodes
        ]
        
        graph_edges = [
            GraphEdgeSchema(
                id=e.id,
                source=e.source_node_id,
                target=e.target_node_id,
                distance_meters=e.distance_meters,
                duration_seconds=e.duration_seconds,
                weight=e.weight,
                edge_type=e.edge_type,
                route_geometry=e.route_geometry,
            )
            for e in edges
        ]
        
        return GraphResponse(
            nodes=graph_nodes,
            edges=graph_edges,
            node_count=len(graph_nodes),
            edge_count=len(graph_edges),
        )
    except GraphBuildException as e:
        raise HTTPException(status_code=500, detail=e.message)
    except RouteGenerationException as e:
        raise HTTPException(status_code=503, detail=e.message)


@router.get("/stats", response_model=GraphStats)
def get_graph_stats(
    db: Session = Depends(get_db),
):
    """
    Get statistics about the current graph.
    """
    service = GraphService(db)
    stats = service.get_graph_stats()
    
    return GraphStats(
        total_nodes=stats["total_nodes"],
        disaster_nodes=stats["disaster_nodes"],
        resource_nodes=stats["resource_nodes"],
        total_edges=stats["total_edges"],
        avg_edge_distance_km=stats["avg_edge_distance_km"],
        avg_edge_duration_min=stats["avg_edge_duration_min"],
        graph_density=stats["graph_density"],
    )


@router.post("/route", response_model=RouteResponse)
async def calculate_route(
    request: RouteRequest,
):
    """
    Calculate route between two points.
    
    This is a utility endpoint for getting route information
    without building the full graph.
    """
    try:
        result = await route_service.get_route(
            source_lat=request.source_lat,
            source_lng=request.source_lng,
            target_lat=request.target_lat,
            target_lng=request.target_lng,
            include_geometry=True,
        )
        
        return RouteResponse(
            distance_meters=result.distance_meters,
            duration_seconds=result.duration_seconds,
            geometry=result.geometry,
            source={"lat": request.source_lat, "lng": request.source_lng},
            target={"lat": request.target_lat, "lng": request.target_lng},
        )
    except RouteGenerationException as e:
        raise HTTPException(status_code=503, detail=e.message)


@router.get("/edges")
def get_graph_edges(
    db: Session = Depends(get_db),
):
    """
    Get all graph edges.
    """
    service = GraphService(db)
    edges = service.get_graph_edges()
    
    return {
        "edges": [
            GraphEdgeSchema(
                id=e.id,
                source=e.source_node_id,
                target=e.target_node_id,
                distance_meters=e.distance_meters,
                duration_seconds=e.duration_seconds,
                weight=e.weight,
                edge_type=e.edge_type,
                route_geometry=e.route_geometry,
            ).model_dump()
            for e in edges
        ],
        "count": len(edges),
    }
