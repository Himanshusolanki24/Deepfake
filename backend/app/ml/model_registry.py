from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ..config import get_settings

settings = get_settings()


@dataclass
class ModelSpec:
    name: str
    version: str
    framework: str
    path: str | None = None
    checksum: str | None = None
    input_size: tuple[int, int] | None = None
    device: str = "cpu"
    is_mock: bool = False

    @property
    def full_name(self) -> str:
        return f"{self.name}-{self.version}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "framework": self.framework,
            "path": self.path,
            "checksum": self.checksum,
            "input_size": list(self.input_size) if self.input_size else None,
            "device": self.device,
            "is_mock": self.is_mock,
        }


def file_checksum(path: str) -> str:
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


class ModelRegistry:
    """Central registry for model metadata and lifecycle."""

    def __init__(self) -> None:
        self._models: dict[str, ModelSpec] = {}
        self._loaded: dict[str, Any] = {}
        self._device = settings.model_device

    def register(self, spec: ModelSpec) -> None:
        spec.device = self._device
        if spec.path and Path(spec.path).exists():
            spec.checksum = file_checksum(spec.path)
        self._models[spec.name] = spec

    def get(self, name: str) -> ModelSpec:
        spec = self._models.get(name)
        if spec is None:
            from ..core.exceptions import ModelNotFoundError

            raise ModelNotFoundError(message=f"Model '{name}' is not registered.")
        return spec

    def version(self, name: str) -> str:
        return self.get(name).version

    def versions_used(self) -> dict[str, str]:
        return {name: spec.version for name, spec in self._models.items()}

    def load(self, name: str) -> Any:
        """Load a model once and cache it in memory."""
        if name in self._loaded:
            return self._loaded[name]
        spec = self.get(name)
        if spec.is_mock or spec.path is None:
            return None
        framework = spec.framework.lower()
        try:
            if "onnx" in framework:
                import onnxruntime as ort

                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 4
                sess = ort.InferenceSession(spec.path, sess_options=opts, providers=["CPUExecutionProvider"])
                self._loaded[name] = sess
                return sess
            if "torch" in framework:
                import torch  # type: ignore

                model = torch.load(spec.path, map_location=self._device)
                model.eval()
                self._loaded[name] = model
                return model
        except Exception as exc:  # pragma: no cover
            from ..core.exceptions import ModelNotLoadedError

            raise ModelNotLoadedError(message=f"Failed to load model {name}: {exc}") from exc
        return None

    def unload(self, name: str) -> None:
        self._loaded.pop(name, None)

    def list_models(self) -> list[dict[str, Any]]:
        return [spec.to_dict() for spec in self._models.values()]


_registry: ModelRegistry | None = None


def get_registry() -> ModelRegistry:
    global _registry
    if _registry is None:
        _registry = ModelRegistry()
        _register_defaults(_registry)
    return _registry


def _register_defaults(registry: ModelRegistry) -> None:
    from ..config import get_settings

    s = get_settings()
    models_dir = Path(s.model_cache_dir)
    models_dir.mkdir(parents=True, exist_ok=True)

    mock = s.use_mock_models
    registry.register(
        ModelSpec(
            name="spatial-detector-v1",
            version="1.0.0",
            framework="mock" if mock else "onnx",
            path=str(models_dir / "spatial.onnx") if not mock else None,
            input_size=(224, 224),
            device=s.model_device,
            is_mock=mock,
        )
    )
    registry.register(
        ModelSpec(
            name="frequency-detector-v1",
            version="1.0.0",
            framework="signal-processing",
            is_mock=mock,
            device=s.model_device,
        )
    )
    registry.register(
        ModelSpec(
            name="temporal-detector-v1",
            version="1.0.0",
            framework="signal-processing",
            is_mock=mock,
            device=s.model_device,
        )
    )
    registry.register(
        ModelSpec(
            name="audio-detector-v1",
            version="1.0.0",
            framework="signal-processing",
            is_mock=mock,
            device=s.model_device,
        )
    )
    registry.register(
        ModelSpec(
            name="metadata-detector-v1",
            version="1.0.0",
            framework="rule-based",
            is_mock=False,
        )
    )
    registry.register(
        ModelSpec(
            name="fusion-model-v1",
            version="1.0.0",
            framework="ensemble",
            is_mock=True,
        )
    )
    registry.register(
        ModelSpec(
            name="rppg-detector-v1",
            version="1.0.0",
            framework="signal-processing",
            is_mock=True,
        )
    )
    registry.register(
        ModelSpec(
            name="av-sync-detector-v1",
            version="1.0.0",
            framework="signal-processing",
            is_mock=True,
        )
    )
