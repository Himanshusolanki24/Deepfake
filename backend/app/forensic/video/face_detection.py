from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any

from ...config import get_settings

settings = get_settings()

FaceDetectFn = Callable[[Any, Any], list[tuple[int, int, int, int]]]


def build_face_detector() -> FaceDetectFn | None:
    """Return a face detector callable, or ``None`` when none is available.

    OpenCV 5 removed the legacy Haar ``CascadeClassifier`` API in favour of
    the YuNet ``FaceDetectorYN`` interface (which needs a model file). This
    helper tries, in order:

      1. YuNet via ``settings.face_detector_model_path`` when configured,
      2. the bundled Haar cascade on OpenCV < 5.

    Callers treat ``None`` as "no detector available" and degrade gracefully.
    """
    import cv2

    try:
        yunet_path = settings.face_detector_model_path
        yunet = getattr(cv2, "FaceDetectorYN", None)
        if yunet is not None and yunet_path and Path(yunet_path).exists():
            detector = yunet.create(str(yunet_path), "", (320, 320), 0.6, 0.3, 5000)

            def _via_yunet(frame: Any, gray: Any) -> list[tuple[int, int, int, int]]:
                _, faces = detector.detect(frame)
                if faces is None:
                    return []
                return [tuple(int(v) for v in f[:4]) for f in faces[:4]]  # type: ignore[misc]

            return _via_yunet
    except Exception:
        pass

    try:
        data = getattr(cv2, "data", None)
        cascade_cls = getattr(cv2, "CascadeClassifier", None)
        if cascade_cls is not None and data is not None:
            cascade = cascade_cls(data.haarcascades + "haarcascade_frontalface_default.xml")
            if not cascade.empty():

                def _via_haar(frame: Any, gray: Any) -> list[tuple[int, int, int, int]]:
                    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(24, 24))
                    return [tuple(int(v) for v in f) for f in faces[:4]]  # type: ignore[misc]

                return _via_haar
    except Exception:
        pass

    return None
