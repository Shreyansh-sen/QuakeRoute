"""
Quantum module initialization.

This module provides quantum optimization capabilities.
Currently supports QAOA (Quantum Approximate Optimization Algorithm).

To use quantum optimization:
1. Install Qiskit: pip install qiskit qiskit-optimization
2. The QAOA optimizer will be automatically registered

Example:
    from app.services.optimization_service import OptimizationService
    from app.schemas.optimize import OptimizationAlgorithm
    
    service = OptimizationService(db)
    result = service.optimize(algorithm=OptimizationAlgorithm.QAOA)
"""

from app.quantum.qaoa_engine import (
    QAOAConfig,
    QAOAOptimizer,
    QAOAOptimizerBase,
    register_qaoa_optimizer,
)

__all__ = [
    "QAOAConfig",
    "QAOAOptimizer",
    "QAOAOptimizerBase",
    "register_qaoa_optimizer",
]
