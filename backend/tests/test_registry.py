from __future__ import annotations

import pytest

from app.ml.adapters import MockAdapter, adapter_for
from app.ml.model_registry import ENGINE_VERSION, get_registry


def test_registry_registers_default_models():
    models = get_registry().list_models()
    assert len(models) >= 12


def test_registry_specs_are_fully_typed():
    for spec in get_registry().list_models():
        assert spec["name"]
        assert spec["version"]
        assert spec["framework"]
        assert spec["family"]
        assert spec["task"]
        assert spec["supported_modalities"]
        assert spec["benchmark_accuracy"] is None or 0.0 <= spec["benchmark_accuracy"] <= 1.0


def test_engine_version_is_current():
    assert ENGINE_VERSION == "0.2.0"


def test_adapter_for_mock_spec():
    from app.ml.model_registry import ModelSpec

    adapter = adapter_for(ModelSpec(name="x", version="1", framework="mock", is_mock=True))
    assert isinstance(adapter, MockAdapter)


def test_unknown_model_raises():
    from app.core.exceptions import ModelNotFoundError

    with pytest.raises(ModelNotFoundError):
        get_registry().get("definitely-not-registered")