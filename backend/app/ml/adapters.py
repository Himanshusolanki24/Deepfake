from __future__ import annotations

from typing import Any, Protocol

from .model_registry import ModelSpec, get_registry


class ModelAdapter(Protocol):
    """Standardizes inference across backends (torch / onnx / mock)."""

    family: str

    def preprocess(self, sample: Any) -> Any: ...
    def predict(self, spec: ModelSpec, preprocessed: Any) -> float: ...
    def postprocess(self, raw: Any) -> float: ...


class TorchVisionAdapter:
    """Adapter for torchvision CNN classifiers."""

    family = "image-spatial"

    def preprocess(self, sample: Any) -> Any:
        from torchvision import transforms  # type: ignore

        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Resize((224, 224)),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        return transform(sample).unsqueeze(0)

    def predict(self, spec: ModelSpec, preprocessed: Any) -> float:
        import torch  # type: ignore

        model = get_registry().load(spec.name)
        if model is None:
            return 0.5
        with torch.no_grad():
            logits = model(preprocessed)
            probs = torch.softmax(logits, dim=1)[0]
        return self.postprocess(probs)

    def postprocess(self, raw: Any) -> float:
        import torch  # type: ignore

        return float(torch.max(raw).item())


class OnnxAdapter:
    """Adapter for ONNX inference sessions."""

    family = "onnx"

    def preprocess(self, sample: Any) -> Any:
        return sample

    def predict(self, spec: ModelSpec, preprocessed: Any) -> float:
        session = get_registry().load(spec.name)
        if session is None:
            return 0.5
        out = session.run(None, {session.get_inputs()[0].name: preprocessed})
        return self.postprocess(out)

    def postprocess(self, raw: Any) -> float:
        try:
            value = raw[0]
            if hasattr(value, "__iter__"):
                value = max(value)
            return float(value)
        except Exception:
            return 0.5


class MockAdapter:
    """Deterministic mock used in mock mode."""

    family = "mock"

    def preprocess(self, sample: Any) -> Any:
        return sample

    def predict(self, spec: ModelSpec, preprocessed: Any) -> float:
        return 0.5

    def postprocess(self, raw: Any) -> float:
        return 0.5


def adapter_for(spec: ModelSpec) -> ModelAdapter:
    if spec.is_mock:
        return MockAdapter()
    if "onnx" in spec.framework.lower():
        return OnnxAdapter()
    if "torch" in spec.framework.lower():
        return TorchVisionAdapter()
    return MockAdapter()
