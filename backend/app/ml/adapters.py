from __future__ import annotations

from typing import Any, Protocol

from .model_registry import ModelSpec, get_registry


class ModelAdapter(Protocol):
    """Standardizes inference across backends (tensorflow / onnx / mock)."""

    family: str

    def preprocess(self, sample: Any) -> Any: ...
    def predict(self, spec: ModelSpec, preprocessed: Any) -> float: ...
    def postprocess(self, raw: Any) -> float: ...


class TFKerasAdapter:
    """Adapter for TensorFlow 2.x Keras CNN classifiers (CPU-oriented)."""

    family = "image-spatial"

    def preprocess(self, sample: Any) -> Any:
        import numpy as np
        import tensorflow as tf  # type: ignore

        if hasattr(sample, "resize"):
            sample = np.array(sample.resize((224, 224)))
        return tf.keras.applications.mobilenet_v2.preprocess_input(
            np.expand_dims(sample.astype(np.float32), axis=0)
        )

    def predict(self, spec: ModelSpec, preprocessed: Any) -> float:
        model = get_registry().load(spec.name)
        if model is None:
            return 0.5
        preds = model(preprocessed, training=False)
        return self.postprocess(preds)

    def postprocess(self, raw: Any) -> float:
        import numpy as np
        import tensorflow as tf  # type: ignore

        probs = tf.nn.softmax(raw[0]).numpy()
        return float(np.max(probs))


class OnnxAdapter:
    """Adapter for ONNX inference sessions."""

    family = "onnx"

    def preprocess(self, sample: Any) -> Any:
        return sample

    def predict(self, spec: ModelSpec, preprocessed: Any) -> float:
        session = get_registry().load(spec.name)
        if session is None:
            return 0.5
        input_name = session.get_inputs()[0].name
        output = session.run(None, {input_name: preprocessed})
        return self.postprocess(output)

    def postprocess(self, raw: Any) -> float:
        import numpy as np

        return float(np.max(raw))


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
    """Select the correct adapter for a given model spec."""
    if spec.is_mock:
        return MockAdapter()
    framework = spec.framework.lower()
    if "onnx" in framework:
        return OnnxAdapter()
    if "tf" in framework or "keras" in framework or "tensorflow" in framework:
        return TFKerasAdapter()
    return MockAdapter()
