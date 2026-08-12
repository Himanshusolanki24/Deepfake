from __future__ import annotations

from enum import Enum


class MediaType(str, Enum):
    image = "image"
    video = "video"
    audio = "audio"


class AnalysisStatus(str, Enum):
    created = "CREATED"
    uploading = "UPLOADING"
    queued = "QUEUED"
    processing = "PROCESSING"
    fusing = "FUSING"
    calibrating = "CALIBRATING"
    completed = "COMPLETED"
    failed = "FAILED"
    cancelled = "CANCELLED"


class Verdict(str, Enum):
    authentic = "authentic"
    inconclusive = "inconclusive"
    suspicious = "suspicious"
    manipulated = "manipulated"


class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class SignalType(str, Enum):
    spatial = "spatial"
    frequency = "frequency"
    temporal = "temporal"
    physiological = "physiological"
    av_sync = "av-sync"
    metadata = "metadata"
    voice_spectral = "voice-spectral"
    compression = "compression"
    ai_generated = "ai-generated"
    lighting = "lighting"
    face_tracking = "face-tracking"
    speech_synthetic = "speech-synthetic"


class EvidenceKind(str, Enum):
    heatmap = "heatmap"
    frame = "frame"
    frequency_plot = "frequency-plot"
    spectrogram = "spectrogram"
    metadata_finding = "metadata-finding"
    audio_anomaly = "audio-anomaly"
    block_region = "block-region"
    region = "region"
    track = "track"
    lighting_segment = "lighting-segment"
    spectral = "spectral"


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"


class SignalStatus(str, Enum):
    available = "available"
    insufficient_evidence = "insufficient_evidence"
    error = "error"


class Role(str, Enum):
    user = "USER"
    admin = "ADMIN"
    analyst = "ANALYST"
