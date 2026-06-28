"""FCP SDK — Python client for the Flink Control Plane."""

from fcp_sdk.client import FCPClient, Deployment, DeploymentSpec, ResourceShape, StateCompatibility
from fcp_sdk.autoscaler import AutoscalerBase

__version__ = "0.1.0"
__all__ = [
    "FCPClient",
    "Deployment",
    "DeploymentSpec",
    "ResourceShape",
    "StateCompatibility",
    "AutoscalerBase",
]
