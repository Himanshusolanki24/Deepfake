from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from ...config import get_settings

settings = get_settings()


class LandmarkTracker:
    """Face landmark tracking with MediaPipe when available, OpenCV fallback.

    Returns per-frame landmark positions for the facial region.
    """

    def __init__(self) -> None:
        self._mp = None
        try:
            import mediapipe as mp  # type: ignore

            self._mp = mp
            self._face = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=False, max_num_faces=1, refine_landmarks=True,
                min_detection_confidence=0.5,
            )
        except Exception:
            self._face = None

    def detect(self, frame: np.ndarray) -> list[tuple[float, float]] | None:
        """Return landmark (x, y) normalized coordinates or None if no face."""
        if self._mp is not None and self._face is not None:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self._face.process(rgb)
            if results.multi_face_landmarks:
                return [(lm.x, lm.y) for lm in results.multi_face_landmarks[0].landmark]
        return self._opencv_fallback(frame)

    def _opencv_fallback(self, frame: np.ndarray) -> list[tuple[float, float]] | None:
        faces = self._detect_face_box(frame)
        if not faces:
            return None
        x, y, w, h = faces[0]
        h_frame, w_frame = frame.shape[:2]
        # Approximate landmarks around the detected box.
        cx, cy = (x + w / 2) / w_frame, (y + h / 2) / h_frame
        r = (w / w_frame) * 0.4
        return [
            (cx - r, cy), (cx + r, cy), (cx, cy - r), (cx, cy + r),
            (cx - r * 0.5, cy + r), (cx + r * 0.5, cy + r),
        ]

    def _detect_face_box(self, frame: np.ndarray) -> list[tuple[int, int, int, int]]:
        """Return face bounding boxes (x, y, w, h) using any available detector."""
        model = getattr(cv2, "FaceDetectorYN", None)
        model_path = settings.face_detector_model_path
        if model is not None and model_path and Path(model_path).exists():
            try:
                detector = model.create(model_path, "", (320, 320), 0.6, 0.3, 5000)
                _, faces = detector.detect(cv2.resize(frame, (320, 320)))
                if faces is not None:
                    boxes: list[tuple[int, int, int, int]] = []
                    for f in faces[:1]:
                        x, y, fw, fh = (int(v) for v in f[:4])
                        boxes.append((x, y, fw, fh))
                    return boxes
            except Exception:
                pass
        return []


