"""
Custom exception classes for the application.
All exceptions should be defined here for consistency.
"""

from typing import Any


class QuakeRouteException(Exception):
    """Base exception for all application errors."""

    def __init__(
        self,
        message: str,
        details: dict[str, Any] | None = None,
        status_code: int = 500,
    ):
        self.message = message
        self.details = details or {}
        self.status_code = status_code
        super().__init__(self.message)


class ResourceDiscoveryException(QuakeRouteException):
    """Raised when resource discovery fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message=message, details=details, status_code=503)


class GraphBuildException(QuakeRouteException):
    """Raised when graph construction fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message=message, details=details, status_code=500)


class RouteGenerationException(QuakeRouteException):
    """Raised when route generation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message=message, details=details, status_code=503)


class ExternalServiceException(QuakeRouteException):
    """Raised when an external service call fails."""

    def __init__(
        self,
        service: str,
        message: str,
        details: dict[str, Any] | None = None,
    ):
        details = details or {}
        details["service"] = service
        super().__init__(message=message, details=details, status_code=503)


class DatabaseException(QuakeRouteException):
    """Raised for database-related errors."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message=message, details=details, status_code=500)


class ValidationException(QuakeRouteException):
    """Raised for validation errors."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message=message, details=details, status_code=422)


class NotFoundException(QuakeRouteException):
    """Raised when a resource is not found."""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} not found",
            details={"resource": resource, "identifier": str(identifier)},
            status_code=404,
        )


class OptimizationException(QuakeRouteException):
    """Raised when optimization fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message=message, details=details, status_code=500)
