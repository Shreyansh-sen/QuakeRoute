"""
QuakeRoute - Quantum Disaster Resource Allocation System
FastAPI Application Entry Point
"""

import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.core.config import settings
from app.core.exceptions import QuakeRouteException
from app.core.logger import logger, request_id_ctx
from app.db import Base, engine
from app.integrations import osrm_client, overpass_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    
    Handles startup and shutdown events.
    """
    # Startup
    logger.info(f"Starting {settings.app_name} in {settings.env} mode")
    
    # Create database tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")
    except Exception as e:
        logger.warning(f"Database not available at startup: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")
    
    # Close HTTP clients
    await overpass_client.close()
    await osrm_client.close()
    
    logger.info("Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Quantum Disaster Resource Allocation System - "
    "A backend system for disaster-response resource optimization",
    version="1.0.0",
    docs_url="/docs" if settings.env != "prod" else None,
    redoc_url="/redoc" if settings.env != "prod" else None,
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """Add request ID to each request for tracing."""
    request_id = str(uuid.uuid4())[:8]
    request_id_ctx.set(request_id)
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    
    return response


@app.exception_handler(QuakeRouteException)
async def quakeroute_exception_handler(request: Request, exc: QuakeRouteException):
    """Handle custom application exceptions."""
    logger.error(f"QuakeRouteException: {exc.message}", extra={"details": exc.details})
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "details": exc.details,
            "request_id": request_id_ctx.get(),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.exception(f"Unexpected error: {exc}")
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "request_id": request_id_ctx.get(),
        },
    )


# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "app": settings.app_name,
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.env,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.env == "dev",
        log_level=settings.log_level.lower(),
    )
