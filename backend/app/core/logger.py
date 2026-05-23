"""
Centralized logging configuration.
All modules should import logger from here.
"""

import logging
import sys
from contextvars import ContextVar
from typing import Any

from app.core.config import settings

# Context variable for request tracking
request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


class RequestContextFilter(logging.Filter):
    """Filter that adds request context to log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get() or "N/A"
        return True


def setup_logger(name: str = "quakeroute") -> logging.Logger:
    """
    Configure and return a logger instance.
    
    Args:
        name: Logger name
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    logger.setLevel(getattr(logging, settings.log_level))

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, settings.log_level))

    # Format with request_id for tracing
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(request_id)s | %(name)s:%(funcName)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    console_handler.setFormatter(formatter)
    console_handler.addFilter(RequestContextFilter())

    logger.addHandler(console_handler)
    logger.propagate = False

    return logger


# Main application logger
logger = setup_logger()


def log_external_api_call(
    service: str,
    endpoint: str,
    duration_ms: float,
    status: str,
    extra: dict[str, Any] | None = None,
) -> None:
    """
    Log external API call metrics.
    
    Args:
        service: Name of external service (e.g., "OSRM", "Overpass")
        endpoint: API endpoint called
        duration_ms: Request duration in milliseconds
        status: Response status (success/error)
        extra: Additional context
    """
    logger.info(
        f"External API | service={service} | endpoint={endpoint} | "
        f"duration_ms={duration_ms:.2f} | status={status} | extra={extra or {}}"
    )
