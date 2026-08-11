from __future__ import annotations

from pathlib import Path

from ...config import get_settings
from ...ml.model_registry import get_registry

settings = get_settings()

# Canonical weights for the weighted-ensemble fallback. These reflect the
# relative reliability of each forensic signal per media type.
ENSEMBLE_WEIGHTS: dict[str, dict[str, float]] = {
    "image": {
        "spatial": 0.35,
        "frequency": 0.30,
        "metadata": 0.20,
        "av-sync": 0.0,
        "physiological": 0.0,
        "temporal": 0.0,
        "voice-spectral": 0.0,
    },
    "video": {
        "spatial": 0.22,
        "frequency": 0.18,
        "temporal": 0.25,
        "physiological": 0.08,
        "av-sync": 0.22,
        "metadata": 0.05,
        "voice-spectral": 0.0,
    },
    "audio": {
        "voice-spectral": 0.7,
        "metadata": 0.2,
        "frequency": 0.1,
        "spatial": 0.0,
        "temporal": 0.0,
        "physiological": 0.0,
        "av-sync": 0.0,
    },
}


class MetaClassifier:
    """Fuses independent detector outputs into a single manipulation
    probability. Uses XGBoost/LightGBM when a trained model artifact exists,
    otherwise a weighted ensemble."""

    model_version = "fusion-v1"

    def __init__(self) -> None:
        self._model = None
        self._weight_path: str | None = None

    def load(self) -> None:
        registry = get_registry()
        spec = registry.get("fusion-model-v1")
        if spec.is_mock or spec.path is None:
            return
        if not Path(spec.path).exists():
            return
        try:
            import lightgbm as lgb  # type: ignore

            self._model = lgb.Booster(model_file=spec.path)
        except Exception:
            try:
                import xgboost as xgb  # type: ignore

                self._model = xgb.Booster()
                self._model.load_model(spec.path)
            except Exception:
                self._model = None

    def predict(self, scores: dict[str, float | None], media_type: str) -> float:
        # Missing signals contribute 0 and are down-weighted by the ensemble.
        normalized = {k: (v if v is not None else 0.0) for k, v in scores.items()}
        weights = ENSEMBLE_WEIGHTS.get(media_type, ENSEMBLE_WEIGHTS["image"])
        denom = sum(w for k, w in weights.items() if normalized.get(k) is not None)
        denom = max(denom, 1e-6)

        feature_vector = [normalized.get(k, 0.0) for k in weights]
        if self._model is not None:
            try:
                import numpy as np

                pred = self._model.predict(np.asarray([feature_vector], dtype=np.float32))[0]
                if isinstance(pred, (list, tuple, dict)):
                    pred = pred[0] if isinstance(pred, (list, tuple)) else list(pred.values())[0]
                return float(min(1.0, max(0.0, float(pred))))
            except Exception:
                pass

        weighted = sum(normalized.get(k, 0.0) * w for k, w in weights.items())
        return float(min(1.0, max(0.0, weighted / denom)))

    def versions(self) -> dict[str, str]:
        return {"fusion": self.model_version}


_meta_classifier: MetaClassifier | None = None


def get_meta_classifier() -> MetaClassifier:
    global _meta_classifier
    if _meta_classifier is None:
        _meta_classifier = MetaClassifier()
        _meta_classifier.load()
    return _meta_classifier
