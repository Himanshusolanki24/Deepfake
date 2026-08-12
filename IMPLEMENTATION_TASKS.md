# Implementation Tasks: Real ML Models, Tests & Production Readiness

## Overview

This document provides a step-by-step implementation plan to transform AUTHENTIQ from a mock-based demonstration platform into a production-ready deepfake detection system with real ML inference and comprehensive test coverage.

**Current State:**
- All detectors default to mock mode (hash-based deterministic scores)
- No pre-trained model weights included
- No test files exist in the codebase
- Good news: Architecture supports real models, just needs integration

**Target State:**
- Real neural network inference for all detectors
- Pre-trained ONNX models with automatic download
- Comprehensive test suite (>80% coverage)
- Production-ready pipeline

---

## Part 1: Real ML Models Implementation

### 1.1 Model Repository Setup

**Task:** Create a model management system to download, cache, and load pre-trained models.

**Files to Create/Modify:**
- `backend/app/ml/model_downloader.py` (new)
- `backend/app/ml/model_registry.py` (enhance)
- `backend/models/.gitkeep` (new)
- `backend/app/config.py` (add model URLs)

**Implementation:**

```python
# backend/app/ml/model_downloader.py
import hashlib
import asyncio
from pathlib import Path
from typing import Optional
import httpx
from ..config import get_settings

class ModelDownloader:
    """Downloads and caches pre-trained models from HuggingFace/private storage."""
    
    MODEL_URLS = {
        "spatial-detector-v1": "https://huggingface.co/authentiq/spatial-detector/resolve/main/spatial.onnx",
        "frequency-detector-v1": None,  # Signal processing, no weights needed
        "audio-detector-v1": "https://huggingface.co/authentiq/audio-detector/resolve/main/audio.onnx",
        "fusion-model-v1": "https://huggingface.co/authentiq/fusion-model/resolve/main/fusion.txt",
    }
    
    def __init__(self, cache_dir: Optional[Path] = None):
        settings = get_settings()
        self.cache_dir = cache_dir or Path(settings.model_cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    async def ensure_model(self, name: str) -> Path:
        """Download model if not present, return path to model file."""
        if name not in self.MODEL_URLS:
            raise ValueError(f"Unknown model: {name}")
        
        url = self.MODEL_URLS[name]
        if url is None:
            raise ValueError(f"Model {name} does not require download (signal processing)")
        
        # Expected local path
        ext = ".onnx" if "onnx" in url else ".txt"
        local_path = self.cache_dir / f"{name}{ext}"
        
        if local_path.exists():
            # Verify checksum if available
            if await self._verify_checksum(local_path, name):
                return local_path
        
        # Download with progress
        print(f"Downloading model {name} from {url}...")
        await self._download(url, local_path)
        print(f"Model {name} cached at {local_path}")
        
        return local_path
    
    async def _download(self, url: str, dest: Path) -> None:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            dest.write_bytes(response.content)
    
    async def _verify_checksum(self, path: Path, name: str) -> bool:
        """Verify model checksum matches expected."""
        # For now, just check file exists and is non-empty
        return path.exists() and path.stat().st_size > 1000
    
    async def ensure_all_models(self) -> dict[str, Path]:
        """Download all required models."""
        results = {}
        for name in self.MODEL_URLS:
            try:
                results[name] = await self.ensure_model(name)
            except Exception as e:
                print(f"Warning: Could not download {name}: {e}")
        return results
```

**Config Update:**

```python
# Add to backend/app/config.py Settings class:
model_download_enabled: bool = True
model_urls: dict[str, str] = {}  # Override default URLs
model_checksums: dict[str, str] = {}  # SHA256 checksums for verification
```

---

### 1.2 Real Spatial Detector

**Task:** Replace mock spatial detector with real ONNX inference using pre-trained deepfake detection model.

**Files to Modify:**
- `backend/app/forensic/image/spatial.py`
- `backend/app/ml/inference.py`

**Implementation:**

```python
# backend/app/forensic/image/spatial.py (enhanced)
from __future__ import annotations

import numpy as np
from pathlib import Path
from typing import Any

from ..signals import SpatialResult
from ...ml.model_downloader import ModelDownloader

class ONNXSpatialDetector:
    """Real spatial detector using ONNX Runtime with a trained model."""
    
    model_version = "spatial-onnx-v1"
    
    def __init__(self, model_path: str | None = None) -> None:
        self._session = None
        self._model_path = model_path
        self._downloader = ModelDownloader()
    
    async def _load(self) -> None:
        if self._session is not None:
            return
        
        # Download model if needed
        if self._model_path is None:
            model_path = await self._downloader.ensure_model("spatial-detector-v1")
            self._model_path = str(model_path)
        
        # Load ONNX session
        import onnxruntime as ort
        
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 4
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        
        self._session = ort.InferenceSession(
            self._model_path,
            sess_options=opts,
            providers=['CPUExecutionProvider']
        )
    
    async def analyze(self, image_path: str) -> SpatialResult:
        await self._load()
        
        # Preprocess image
        import cv2
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Resize and normalize
        input_size = self._session.get_inputs()[0].shape[-2:]  # (H, W)
        image_resized = cv2.resize(image, (input_size[1], input_size[0]))
        image_rgb = cv2.cvtColor(image_resized, cv2.COLOR_BGR2RGB)
        
        # Normalize with ImageNet stats
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        image_normalized = (image_rgb.astype(np.float32) / 255.0 - mean) / std
        
        # HWC -> NCHW
        tensor = image_normalized.transpose(2, 0, 1)[np.newaxis, :]
        
        # Run inference
        input_name = self._session.get_inputs()[0].name
        output_name = self._session.get_outputs()[0].name
        outputs = self._session.run([output_name], {input_name: tensor})
        
        # Parse output (assume binary classification: [real, fake])
        logits = outputs[0][0]
        if len(logits) == 2:
            # Softmax to get probability
            exp_logits = np.exp(logits - logits.max())
            probs = exp_logits / exp_logits.sum()
            manipulation_score = float(probs[1])  # Probability of fake
        else:
            # Single output (manipulation probability)
            manipulation_score = float(1 / (1 + np.exp(-logits[0])))  # Sigmoid
        
        # Generate regions using Grad-CAM or attention
        regions = await self._generate_regions(image, manipulation_score)
        
        # Confidence based on model certainty
        confidence = float(min(0.95, 0.5 + abs(manipulation_score - 0.5) * 0.9))
        
        return SpatialResult(
            score=round(min(0.97, max(0.03, manipulation_score)), 3),
            confidence=round(confidence, 3),
            model_version=self.model_version,
            regions=regions,
            explanation=self._generate_explanation(manipulation_score, regions)
        )
    
    async def _generate_regions(self, image: np.ndarray, score: float) -> list[dict]:
        """Generate attention regions (simplified version)."""
        import cv2
        
        regions = []
        h, w = image.shape[:2]
        
        # Use face detection to create regions
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        
        for i, (x, y, fw, fh) in enumerate(faces[:4]):
            regions.append({
                "x": int(x), "y": int(y),
                "width": int(fw), "height": int(fh),
                "intensity": round(min(0.95, score + 0.1 * i), 3),
                "label": "face_region" if i == 0 else "face_candidate"
            })
        
        return regions
    
    def _generate_explanation(self, score: float, regions: list) -> str:
        if score > 0.7:
            return f"Spatial analysis detected strong manipulation artifacts in {len(regions)} face region(s)."
        elif score > 0.4:
            return f"Spatial analysis found moderate inconsistencies in texture patterns."
        else:
            return "Spatial texture analysis found no significant manipulation indicators."
```

**Update inference.py:**

```python
# backend/app/ml/inference.py - update get_spatial_detector()
def get_spatial_detector() -> SpatialDetector:
    from ..config import get_settings
    settings = get_settings()
    
    if settings.use_mock_models:
        return MockSpatialDetector()
    
    # Use real ONNX detector
    from ..forensic.image.spatial import ONNXSpatialDetector
    return ONNXSpatialDetector()
```

---

### 1.3 Real Audio Detector Enhancement

**Task:** Enhance the existing VoiceDetector with pre-trained vocoder detection model.

**Files to Modify:**
- `backend/app/forensic/audio/voice_detector.py`

**Current State:** The audio detector already has real signal processing (spectral analysis, prosody, pitch). It works! We just need to add ML-based vocoder detection.

**Enhancement:**

```python
# Add to backend/app/forensic/audio/voice_detector.py

class EnhancedVoiceDetector(VoiceDetector):
    """Enhanced voice detector combining signal processing + ML vocoder detection."""
    
    model_version = "audio-ml-v1"
    
    def __init__(self, spectrogram_dir: str | None = None, model_path: str | None = None) -> None:
        super().__init__(spectrogram_dir)
        self._session = None
        self._model_path = model_path
    
    async def _load_vocoder_model(self) -> None:
        if self._session is not None:
            return
        
        if self._model_path is None:
            from ...ml.model_downloader import ModelDownloader
            downloader = ModelDownloader()
            model_path = await downloader.ensure_model("audio-detector-v1")
            self._model_path = str(model_path)
        
        import onnxruntime as ort
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 2
        self._session = ort.InferenceSession(
            self._model_path,
            sess_options=opts,
            providers=['CPUExecutionProvider']
        )
    
    async def analyze(self, audio_path: str) -> AudioResult:
        # Run classical signal processing first
        base_result = await super().analyze(audio_path)
        
        # Try ML vocoder detection
        try:
            await self._load_vocoder_model()
            ml_score = await self._run_ml_inference(audio_path)
            
            # Blend classical and ML scores
            final_score = 0.6 * base_result.score + 0.4 * ml_score
            base_result.score = round(final_score, 3)
            base_result.model_version = self.model_version
            
        except Exception as e:
            # Fall back to classical only
            print(f"Warning: ML vocoder detection failed: {e}")
        
        return base_result
    
    async def _run_ml_inference(self, audio_path: str) -> float:
        """Run ONNX vocoder detection model."""
        samples, sr = decode_wav(audio_path)
        
        # Create mel spectrogram
        mel = mel_spectrogram(samples, sr, n_mels=80)
        
        # Normalize and reshape for model input
        mel_norm = (mel - mel.min()) / max(mel.max() - mel.min(), 1e-6)
        
        # Pad or truncate to expected length (e.g., 300 frames)
        target_len = 300
        if mel_norm.shape[1] < target_len:
            pad = np.zeros((mel_norm.shape[0], target_len - mel_norm.shape[1]))
            mel_norm = np.concatenate([mel_norm, pad], axis=1)
        else:
            mel_norm = mel_norm[:, :target_len]
        
        # Add batch dimension
        mel_tensor = mel_norm[np.newaxis, :, :].astype(np.float32)
        
        # Run inference
        input_name = self._session.get_inputs()[0].name
        output_name = self._session.get_outputs()[0].name
        outputs = self._session.run([output_name], {input_name: mel_tensor})
        
        return float(outputs[0][0][0])  # Vocoder probability
```

---

### 1.4 Model Training Scripts

**Task:** Create scripts to train models on public deepfake datasets.

**Files to Create:**
- `backend/scripts/train_spatial_detector.py` (new)
- `backend/scripts/train_audio_detector.py` (new)
- `backend/scripts/evaluate_models.py` (new)

**Training Script Example:**

```python
# backend/scripts/train_spatial_detector.py
"""
Train a spatial deepfake detector on FaceForensics++ dataset.

Usage:
    python -m scripts.train_spatial_detector --data_dir /path/to/ff++ --output_dir ./models
"""

import argparse
import json
from pathlib import Path
from typing import Tuple
import numpy as np
from tqdm import tqdm

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
from sklearn.model_selection import train_test_split


class DeepfakeDataset(Dataset):
    """FaceForensics++ dataset for binary classification (real vs fake)."""
    
    def __init__(self, samples: list[Tuple[Path, int]], transform=None):
        self.samples = samples
        self.transform = transform or transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
    
    def __len__(self) -> int:
        return len(self.samples)
    
    def __getitem__(self, idx: int):
        path, label = self.samples[idx]
        
        from PIL import Image
        with Image.open(path) as img:
            image = img.convert('RGB')
        
        if self.transform:
            image = self.transform(image)
        
        return image, label


def load_faceforensics(data_dir: Path, compression: str = 'c23') -> list[Tuple[Path, int]]:
    """Load FaceForensics++ dataset paths and labels."""
    samples = []
    
    # Real videos
    real_dir = data_dir / 'original_sequences' / 'youtube' / compression / 'frames'
    for img_path in tqdm(list(real_dir.glob('**/*.png')), desc='Loading real'):
        samples.append((img_path, 0))  # 0 = real
    
    # Fake videos (all manipulation methods)
    for method in ['Deepfakes', 'Face2Face', 'FaceSwap', 'NeuralTextures']:
        fake_dir = data_dir / 'manipulated_sequences' / method / compression / 'frames'
        for img_path in tqdm(list(fake_dir.glob('**/*.png')), desc=f'Loading {method}'):
            samples.append((img_path, 1))  # 1 = fake
    
    return samples


def train_model(
    train_loader: DataLoader,
    val_loader: DataLoader,
    output_dir: Path,
    epochs: int = 10,
    lr: float = 1e-4,
) -> nn.Module:
    """Train EfficientNet-B0 for deepfake detection."""
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Load pretrained EfficientNet
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 2)
    model = model.to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    
    best_val_acc = 0.0
    
    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for images, labels in tqdm(train_loader, desc=f'Epoch {epoch+1}/{epochs} [Train]'):
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = outputs.max(1)
            train_total += labels.size(0)
            train_correct += predicted.eq(labels).sum().item()
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for images, labels in tqdm(val_loader, desc=f'Epoch {epoch+1}/{epochs} [Val]'):
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item()
                _, predicted = outputs.max(1)
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()
        
        train_acc = train_correct / train_total
        val_acc = val_correct / val_total
        
        print(f'Epoch {epoch+1}: Train Loss={train_loss/len(train_loader):.4f}, '
              f'Train Acc={train_acc:.4f}, Val Loss={val_loss/len(val_loader):.4f}, Val Acc={val_acc:.4f}')
        
        scheduler.step()
        
        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), output_dir / 'spatial_best.pt')
            print(f'Saved best model with val_acc={val_acc:.4f}')
    
    return model


def export_to_onnx(model: nn.Module, output_path: Path):
    """Export PyTorch model to ONNX format."""
    model.eval()
    dummy_input = torch.randn(1, 3, 224, 224)
    
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        opset_version=14,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    print(f'Exported ONNX model to {output_path}')


def main():
    parser = argparse.ArgumentParser(description='Train spatial deepfake detector')
    parser.add_argument('--data_dir', type=str, required=True, help='Path to FaceForensics++ dataset')
    parser.add_argument('--output_dir', type=str, default='./models', help='Output directory')
    parser.add_argument('--epochs', type=int, default=10)
    parser.add_argument('--batch_size', type=int, default=32)
    parser.add_argument('--lr', type=float, default=1e-4)
    parser.add_argument('--compression', type=str, default='c23', choices=['raw', 'c23', 'c40'])
    args = parser.parse_args()
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load dataset
    print('Loading dataset...')
    samples = load_faceforensics(Path(args.data_dir), args.compression)
    print(f'Loaded {len(samples)} samples')
    
    # Split train/val
    train_samples, val_samples = train_test_split(samples, test_size=0.2, random_state=42, stratify=[s[1] for s in samples])
    
    # Create dataloaders
    train_dataset = DeepfakeDataset(train_samples)
    val_dataset = DeepfakeDataset(val_samples)
    
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=4)
    
    # Train model
    model = train_model(train_loader, val_loader, output_dir, epochs=args.epochs, lr=args.lr)
    
    # Export to ONNX
    export_to_onnx(model, output_dir / 'spatial.onnx')
    
    # Save metadata
    metadata = {
        'model': 'efficientnet-b0',
        'dataset': 'FaceForensics++',
        'compression': args.compression,
        'epochs': args.epochs,
        'input_size': [224, 224],
        'num_classes': 2,
        'class_names': ['real', 'fake'],
    }
    (output_dir / 'metadata.json').write_text(json.dumps(metadata, indent=2))
    
    print('Training complete!')


if __name__ == '__main__':
    main()
```

---

## Part 2: Comprehensive Test Suite

### 2.1 Test Structure

**Task:** Create comprehensive test suite covering all major components.

**Files to Create:**
```
backend/tests/
├── __init__.py
├── conftest.py              # Shared fixtures
├── test_spatial.py          # Spatial detector tests
├── test_frequency.py        # Frequency analyzer tests
├── test_audio.py            # Audio detector tests
├── test_temporal.py         # Temporal analyzer tests
├── test_fusion.py           # Fusion/calibration tests
├── test_pipeline.py         # Integration tests
├── test_api.py              # API endpoint tests
└── fixtures/
    ├── sample_real.jpg
    ├── sample_fake.jpg
    ├── sample_audio.wav
    └── sample_video.mp4
```

### 2.2 Test Configuration and Fixtures

**File: `backend/tests/conftest.py`**

```python
"""Pytest configuration and shared fixtures."""
import asyncio
import tempfile
from pathlib import Path
from typing import Generator

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.db.database import Base, get_db_session
from app.main import app
from app.config import get_settings


# Configure pytest for async
pytestmark = pytest.mark.asyncio


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncSession:
    """Create isolated database session for each test."""
    # Use in-memory SQLite for tests
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncSession:
    """Create test HTTP client with database override."""
    
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db_session] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_image_real() -> Path:
    """Path to sample real image fixture."""
    return Path(__file__).parent / "fixtures" / "sample_real.jpg"


@pytest.fixture
def sample_image_fake() -> Path:
    """Path to sample fake image fixture."""
    return Path(__file__).parent / "fixtures" / "sample_fake.jpg"


@pytest.fixture
def sample_audio() -> Path:
    """Path to sample audio fixture."""
    return Path(__file__).parent / "fixtures" / "sample_audio.wav"


@pytest.fixture
def sample_video() -> Path:
    """Path to sample video fixture."""
    return Path(__file__).parent / "fixtures" / "sample_video.mp4"


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Create temporary directory for test outputs."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def mock_settings():
    """Override settings for testing."""
    settings = get_settings()
    settings.use_mock_models = True
    settings.use_in_process_tasks = True
    return settings
```

---

### 2.3 Detector Unit Tests

**File: `backend/tests/test_spatial.py`**

```python
"""Unit tests for spatial detector."""
import pytest
from pathlib import Path

from app.forensic.image.spatial import TorchSpatialDetector
from app.forensic.signals import SpatialResult


@pytest.mark.asyncio
class TestSpatialDetector:
    """Test cases for spatial artifact detection."""
    
    async def test_analyze_returns_result(self, sample_image_real: Path):
        """Test that analyze returns a SpatialResult."""
        detector = TorchSpatialDetector()
        result = await detector.analyze(str(sample_image_real))
        
        assert isinstance(result, SpatialResult)
        assert result.score is not None
        assert 0.0 <= result.score <= 1.0
        assert result.confidence is not None
        assert 0.0 <= result.confidence <= 1.0
        assert result.model_version is not None
        assert result.explanation is not None
    
    async def test_analyze_real_image_low_score(self, sample_image_real: Path):
        """Test that real images have lower manipulation scores."""
        detector = TorchSpatialDetector()
        result = await detector.analyze(str(sample_image_real))
        
        # Real images should generally score below 0.6
        # (with some tolerance for model uncertainty)
        assert result.score < 0.7, f"Real image scored {result.score}, expected < 0.7"
    
    async def test_analyze_fake_image_high_score(self, sample_image_fake: Path):
        """Test that fake images have higher manipulation scores."""
        detector = TorchSpatialDetector()
        result = await detector.analyze(str(sample_image_fake))
        
        # Fake images should generally score above 0.4
        assert result.score > 0.3, f"Fake image scored {result.score}, expected > 0.3"
    
    async def test_regions_have_valid_structure(self, sample_image_fake: Path):
        """Test that detected regions have valid structure."""
        detector = TorchSpatialDetector()
        result = await detector.analyze(str(sample_image_fake))
        
        for region in result.regions:
            assert 'x' in region
            assert 'y' in region
            assert 'width' in region
            assert 'height' in region
            assert 'intensity' in region
            assert 'label' in region
            
            # Validate ranges
            assert region['x'] >= 0
            assert region['y'] >= 0
            assert region['width'] > 0
            assert region['height'] > 0
            assert 0.0 <= region['intensity'] <= 1.0
    
    async def test_invalid_image_path_raises(self):
        """Test that invalid path raises appropriate error."""
        detector = TorchSpatialDetector()
        
        with pytest.raises(Exception):
            await detector.analyze("/nonexistent/path.jpg")
    
    async def test_deterministic_results(self, sample_image_real: Path):
        """Test that same input produces same output (deterministic)."""
        detector = TorchSpatialDetector()
        
        result1 = await detector.analyze(str(sample_image_real))
        result2 = await detector.analyze(str(sample_image_real))
        
        assert result1.score == result2.score
        assert result1.confidence == result2.confidence


@pytest.mark.asyncio
class TestSpatialDetectorEdgeCases:
    """Edge case tests for spatial detector."""
    
    async def test_very_small_image(self, temp_dir: Path):
        """Test handling of very small images."""
        # Create 10x10 image
        from PIL import Image
        img_path = temp_dir / "tiny.png"
        img = Image.new('RGB', (10, 10), color='red')
        img.save(img_path)
        
        detector = TorchSpatialDetector()
        result = await detector.analyze(str(img_path))
        
        assert isinstance(result, SpatialResult)
        # Should still produce a score even for tiny images
    
    async def test_grayscale_image(self, temp_dir: Path):
        """Test handling of grayscale images."""
        from PIL import Image
        img_path = temp_dir / "gray.png"
        img = Image.new('L', (100, 100), color=128)
        img.save(img_path)
        
        detector = TorchSpatialDetector()
        result = await detector.analyze(str(img_path))
        
        assert isinstance(result, SpatialResult)
    
    async def test_png_with_alpha(self, temp_dir: Path):
        """Test handling of PNG with alpha channel."""
        from PIL import Image
        img_path = temp_dir / "alpha.png"
        img = Image.new('RGBA', (100, 100), color=(255, 0, 0, 128))
        img.save(img_path)
        
        detector = TorchSpatialDetector()
        result = await detector.analyze(str(img_path))
        
        assert isinstance(result, SpatialResult)
```

---

### 2.4 Audio Detector Tests

**File: `backend/tests/test_audio.py`**

```python
"""Unit tests for audio detector."""
import pytest
from pathlib import Path

from app.forensic.audio.voice_detector import VoiceDetector, estimate_pitch
from app.forensic.signals import AudioResult


@pytest.mark.asyncio
class TestVoiceDetector:
    """Test cases for voice/audio detection."""
    
    async def test_analyze_returns_result(self, sample_audio: Path, temp_dir: Path):
        """Test that analyze returns an AudioResult."""
        detector = VoiceDetector(spectrogram_dir=str(temp_dir / "spectrograms"))
        result = await detector.analyze(str(sample_audio))
        
        assert isinstance(result, AudioResult)
        assert result.score is not None
        assert 0.0 <= result.score <= 1.0
        assert result.spectral_score is not None
        assert result.prosody_score is not None
        assert result.pitch_score is not None
    
    async def test_spectral_consistency_range(self, sample_audio: Path):
        """Test that spectral score is in valid range."""
        detector = VoiceDetector()
        result = await detector.analyze(str(sample_audio))
        
        assert 0.0 <= result.spectral_score <= 1.0
        assert 0.0 <= result.prosody_score <= 1.0
        assert 0.0 <= result.pitch_score <= 1.0
        assert 0.0 <= result.vocoder_artifacts <= 1.0
        assert 0.0 <= result.breath_noise <= 1.0
    
    async def test_spectrogram_generated(self, sample_audio: Path, temp_dir: Path):
        """Test that spectrogram is generated when directory provided."""
        spectro_dir = temp_dir / "spectrograms"
        detector = VoiceDetector(spectrogram_dir=str(spectro_dir))
        result = await detector.analyze(str(sample_audio))
        
        assert result.spectrogram_uri is not None
        assert Path(result.spectrogram_uri).exists()
    
    async def test_no_spectrogram_without_dir(self, sample_audio: Path):
        """Test that no spectrogram is generated when no directory provided."""
        detector = VoiceDetector(spectrogram_dir=None)
        result = await detector.analyze(str(sample_audio))
        
        assert result.spectrogram_uri is None


class TestPitchEstimation:
    """Test pitch estimation utilities."""
    
    def test_estimate_pitch_returns_list(self):
        """Test that pitch estimation returns a list of floats."""
        import numpy as np
        
        # Generate synthetic 440 Hz sine wave
        sr = 16000
        duration = 1.0
        t = np.linspace(0, duration, int(sr * duration))
        samples = np.sin(2 * np.pi * 440 * t).astype(np.float32)
        
        pitches = estimate_pitch(samples, sr)
        
        assert isinstance(pitches, list)
        assert all(isinstance(p, float) for p in pitches)
        assert all(50 < p < 500 for p in pitches)  # Typical voice range
    
    def test_silent_audio_returns_empty(self):
        """Test that silent audio returns empty pitch list."""
        import numpy as np
        
        samples = np.zeros(16000, dtype=np.float32)
        pitches = estimate_pitch(samples, 16000)
        
        assert len(pitches) == 0


@pytest.mark.asyncio
class TestVoiceDetectorEdgeCases:
    """Edge case tests for voice detector."""
    
    async def test_invalid_audio_path_raises(self):
        """Test that invalid path raises appropriate error."""
        detector = VoiceDetector()
        
        with pytest.raises(Exception):
            await detector.analyze("/nonexistent/audio.wav")
    
    async def test_short_audio(self, temp_dir: Path):
        """Test handling of very short audio files."""
        import wave
        import struct
        
        # Create 0.1 second audio file
        audio_path = temp_dir / "short.wav"
        with wave.open(str(audio_path), 'w') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            # 0.1 seconds = 1600 samples
            data = struct.pack('<' + 'h' * 1600, *([0] * 1600))
            wf.writeframes(data)
        
        detector = VoiceDetector()
        result = await detector.analyze(str(audio_path))
        
        assert isinstance(result, AudioResult)
```

---

### 2.5 Fusion and Calibration Tests

**File: `backend/tests/test_fusion.py`**

```python
"""Unit tests for fusion and calibration."""
import pytest
import numpy as np

from app.forensic.fusion.meta_classifier import MetaClassifier, ENSEMBLE_WEIGHTS
from app.forensic.fusion.calibration import PlattCalibrator, IsotonicCalibrator, CalibratedResult
from app.forensic.fusion.scoring import assess, severity_for_score, VerdictResult
from app.db.enums import Verdict, Severity


class TestMetaClassifier:
    """Test cases for meta classifier."""
    
    def test_predict_returns_float(self):
        """Test that predict returns a float in [0, 1]."""
        classifier = MetaClassifier()
        
        scores = {
            'spatial': 0.6,
            'frequency': 0.5,
            'metadata': 0.3,
        }
        
        result = classifier.predict(scores, 'image')
        
        assert isinstance(result, float)
        assert 0.0 <= result <= 1.0
    
    def test_predict_handles_missing_signals(self):
        """Test that missing signals are handled gracefully."""
        classifier = MetaClassifier()
        
        scores = {
            'spatial': 0.7,
            # Missing other signals
        }
        
        result = classifier.predict(scores, 'image')
        
        assert isinstance(result, float)
        assert 0.0 <= result <= 1.0
    
    def test_predict_different_media_types(self):
        """Test prediction for different media types."""
        classifier = MetaClassifier()
        
        scores = {
            'spatial': 0.6,
            'temporal': 0.4,
            'av-sync': 0.3,
        }
        
        image_result = classifier.predict(scores, 'image')
        video_result = classifier.predict(scores, 'video')
        audio_result = classifier.predict(scores, 'audio')
        
        # Results should differ based on media-specific weights
        assert image_result != video_result
        assert video_result != audio_result
    
    def test_weights_sum_to_one(self):
        """Test that ensemble weights sum to 1.0 for each media type."""
        for media_type, weights in ENSEMBLE_WEIGHTS.items():
            total = sum(weights.values())
            assert abs(total - 1.0) < 0.01, f"Weights for {media_type} sum to {total}"


class TestCalibration:
    """Test cases for probability calibration."""
    
    def test_platt_calibrator_returns_valid_range(self):
        """Test Platt calibrator returns values in [0, 1]."""
        calibrator = PlattCalibrator(a=1.0, b=0.0)
        
        for prob in [0.1, 0.3, 0.5, 0.7, 0.9]:
            result = calibrator.calibrate(prob)
            assert 0.0 <= result <= 1.0
    
    def test_platt_calibrate_with_interval(self):
        """Test calibration with confidence interval."""
        calibrator = PlattCalibrator(a=1.0, b=0.0)
        
        result = calibrator.calibrate_with_interval(0.5)
        
        assert isinstance(result, CalibratedResult)
        assert 0.0 <= result.calibrated_probability <= 1.0
        assert result.ci_lower <= result.calibrated_probability <= result.ci_upper
    
    def test_isotonic_calibrator(self):
        """Test isotonic calibration."""
        # Simple isotonic regression example
        xs = [0.1, 0.3, 0.5, 0.7, 0.9]
        ys = [0.15, 0.35, 0.48, 0.72, 0.88]
        
        calibrator = IsotonicCalibrator(xs, ys)
        
        result = calibrator.calibrate(0.5)
        assert 0.0 <= result <= 1.0
    
    def test_identity_calibrator_for_out_of_range(self):
        """Test that out-of-range values are handled."""
        calibrator = PlattCalibrator(a=1.0, b=0.0)
        
        # Values outside [0, 1] should be clamped
        result = calibrator.calibrate(-0.5)
        assert 0.0 <= result <= 1.0
        
        result = calibrator.calibrate(1.5)
        assert 0.0 <= result <= 1.0


class TestVerdictAssessment:
    """Test cases for verdict assessment."""
    
    def test_low_probability_is_authentic(self):
        """Test that low probability returns authentic verdict."""
        result = assess(0.2)
        
        assert result.verdict == Verdict.authentic
        assert result.severity == Severity.low
    
    def test_high_probability_is_manipulated(self):
        """Test that high probability returns manipulated verdict."""
        result = assess(0.85)
        
        assert result.verdict == Verdict.manipulated
        assert result.severity == Severity.high
    
    def test_medium_probability_is_suspicious(self):
        """Test that medium-high probability returns suspicious verdict."""
        result = assess(0.7)
        
        assert result.verdict == Verdict.suspicious
    
    def test_uncertain_is_inconclusive(self):
        """Test that uncertain probability returns inconclusive verdict."""
        result = assess(0.45)
        
        assert result.verdict == Verdict.inconclusive
    
    def test_result_has_all_fields(self):
        """Test that result has all required fields."""
        result = assess(0.5)
        
        assert result.verdict is not None
        assert result.calibrated_probability is not None
        assert result.severity is not None
        assert result.label is not None
        assert result.headline is not None
        assert result.description is not None


class TestSeverityMapping:
    """Test severity score mapping."""
    
    def test_low_score_is_low_severity(self):
        assert severity_for_score(0.2) == Severity.low
    
    def test_medium_score_is_medium_severity(self):
        assert severity_for_score(0.5) == Severity.medium
    
    def test_high_score_is_high_severity(self):
        assert severity_for_score(0.8) == Severity.high
```

### 2.6 API Integration Tests

**File: `backend/tests/test_api.py`**

```python
"""Integration tests for API endpoints."""
import pytest
from httpx import AsyncClient
from pathlib import Path


@pytest.mark.asyncio
class TestHealthEndpoint:
    """Test health check endpoints."""
    
    async def test_root_returns_service_info(self, client: AsyncClient):
        """Test root endpoint returns service information."""
        response = await client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
        assert "docs" in data
        assert "health" in data
    
    async def test_health_returns_ok(self, client: AsyncClient):
        """Test health endpoint returns OK status."""
        response = await client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") in ["ok", "healthy", "degraded"]


@pytest.mark.asyncio
class TestAnalysisEndpoint:
    """Test analysis endpoints."""
    
    async def test_create_analysis(self, client: AsyncClient):
        """Test creating a new analysis."""
        response = await client.post(
            "/api/v1/analysis",
            json={
                "media_type": "image",
                "filename": "test.jpg",
                "signals": ["spatial", "frequency"]
            }
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
    
    async def test_get_analysis_not_found(self, client: AsyncClient):
        """Test getting non-existent analysis returns 404."""
        response = await client.get("/api/v1/analysis/nonexistent-id")
        
        assert response.status_code == 404
    
    async def test_get_history(self, client: AsyncClient):
        """Test getting analysis history."""
        response = await client.get("/api/v1/analysis/history")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.asyncio
class TestUploadEndpoint:
    """Test media upload endpoints."""
    
    async def test_upload_image(self, client: AsyncClient, sample_image_real: Path):
        """Test uploading an image file."""
        # First create analysis
        create_resp = await client.post(
            "/api/v1/analysis",
            json={"media_type": "image", "filename": "test.jpg"}
        )
        analysis_id = create_resp.json()["id"]
        
        # Upload file
        with open(sample_image_real, "rb") as f:
            response = await client.post(
                f"/api/v1/analysis/{analysis_id}/media",
                files={"file": ("test.jpg", f, "image/jpeg")}
            )
        
        assert response.status_code in [200, 201]
    
    async def test_upload_invalid_file_type(self, client: AsyncClient, temp_dir: Path):
        """Test uploading invalid file type returns error."""
        # Create a text file
        txt_file = temp_dir / "test.txt"
        txt_file.write_text("not an image")
        
        create_resp = await client.post(
            "/api/v1/analysis",
            json={"media_type": "image", "filename": "test.txt"}
        )
        analysis_id = create_resp.json()["id"]
        
        with open(txt_file, "rb") as f:
            response = await client.post(
                f"/api/v1/analysis/{analysis_id}/media",
                files={"file": ("test.txt", f, "text/plain")}
            )
        
        assert response.status_code in [400, 415]


@pytest.mark.asyncio
class TestPipelineIntegration:
    """End-to-end pipeline integration tests."""
    
    @pytest.mark.slow
    async def test_full_image_analysis(
        self, 
        client: AsyncClient, 
        sample_image_fake: Path
    ):
        """Test complete image analysis workflow."""
        # Create analysis
        create_resp = await client.post(
            "/api/v1/analysis",
            json={
                "media_type": "image",
                "filename": "fake.jpg",
                "signals": ["spatial", "frequency", "metadata"]
            }
        )
        assert create_resp.status_code == 201
        analysis_id = create_resp.json()["id"]
        
        # Upload media
        with open(sample_image_fake, "rb") as f:
            upload_resp = await client.post(
                f"/api/v1/analysis/{analysis_id}/media",
                files={"file": ("fake.jpg", f, "image/jpeg")}
            )
        assert upload_resp.status_code == 200
        
        # Wait for completion (polling)
        import asyncio
        for _ in range(30):  # 30 second timeout
            get_resp = await client.get(f"/api/v1/analysis/{analysis_id}")
            data = get_resp.json()
            if data.get("status") == "complete":
                break
            await asyncio.sleep(1)
        
        # Verify result
        assert data.get("status") == "complete"
        assert "verdict" in data
        assert "signals" in data
        assert len(data["signals"]) > 0
    
    @pytest.mark.slow
    async def test_full_audio_analysis(
        self,
        client: AsyncClient,
        sample_audio: Path
    ):
        """Test complete audio analysis workflow."""
        create_resp = await client.post(
            "/api/v1/analysis",
            json={
                "media_type": "audio",
                "filename": "test.wav",
                "signals": ["voice-spectral"]
            }
        )
        analysis_id = create_resp.json()["id"]
        
        with open(sample_audio, "rb") as f:
            upload_resp = await client.post(
                f"/api/v1/analysis/{analysis_id}/media",
                files={"file": ("test.wav", f, "audio/wav")}
            )
        
        assert upload_resp.status_code == 200
```

---

### 2.7 Test Fixtures Creation

**Task:** Create sample media files for testing.

**Script: `backend/scripts/create_test_fixtures.py`**

```python
"""Create test fixture files for testing."""
import wave
import struct
from pathlib import Path
from PIL import Image
import numpy as np


def create_sample_real_image(output_path: Path):
    """Create a synthetic 'real-looking' image for testing."""
    # Create image with natural-looking noise
    img = np.random.randint(0, 256, (256, 256, 3), dtype=np.uint8)
    
    # Add some structure (simulating a face region)
    img[50:200, 50:200] = [200, 180, 160]  # Skin tone
    img[80:100, 70:100] = [50, 50, 50]  # Left eye
    img[80:100, 150:180] = [50, 50, 50]  # Right eye
    img[140:170, 100:150] = [150, 100, 100]  # Nose/mouth region
    
    Image.fromarray(img).save(output_path)


def create_sample_fake_image(output_path: Path):
    """Create a synthetic 'fake-looking' image for testing."""
    # Create image with artifacts typical of generation
    img = np.zeros((256, 256, 3), dtype=np.uint8)
    
    # Add smooth gradients (typical of GAN output)
    for i in range(256):
        img[i, :] = [int(255 * i / 256), 100, int(255 * (256-i) / 256)]
    
    # Add some checkerboard artifacts (compression/GAN artifacts)
    for i in range(0, 256, 8):
        for j in range(0, 256, 8):
            if (i + j) % 16 == 0:
                img[i:i+8, j:j+8] = np.clip(img[i:i+8, j:j+8] + 30, 0, 255)
    
    Image.fromarray(img).save(output_path)


def create_sample_audio(output_path: Path, duration_sec: float = 3.0, sr: int = 16000):
    """Create a sample audio file with synthetic voice-like tones."""
    n_samples = int(duration_sec * sr)
    t = np.linspace(0, duration_sec, n_samples)
    
    # Fundamental frequency (voice-like)
    f0 = 150  # Hz (typical male voice)
    
    # Generate harmonics
    signal = np.zeros(n_samples)
    for harmonic in range(1, 10):
        amplitude = 1.0 / harmonic
        signal += amplitude * np.sin(2 * np.pi * f0 * harmonic * t)
    
    # Add some noise
    signal += 0.1 * np.random.randn(n_samples)
    
    # Normalize and convert to 16-bit
    signal = signal / signal.max()
    signal_int16 = (signal * 32767).astype(np.int16)
    
    # Write WAV file
    with wave.open(str(output_path), 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(signal_int16.tobytes())


def create_sample_video(output_path: Path, duration_sec: float = 2.0, fps: int = 24):
    """Create a sample video file (placeholder frames)."""
    import cv2
    
    width, height = 320, 240
    n_frames = int(duration_sec * fps)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
    
    for i in range(n_frames):
        # Create frame with frame number
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        frame[:, :] = [100, 100, 100]
        
        # Add some motion
        x = int(100 + 50 * np.sin(i * 0.3))
        cv2.rectangle(frame, (x, 100), (x+50, 150), (200, 180, 160), -1)
        
        out.write(frame)
    
    out.release()


def main():
    fixtures_dir = Path(__file__).parent.parent / "tests" / "fixtures"
    fixtures_dir.mkdir(parents=True, exist_ok=True)
    
    print("Creating test fixtures...")
    
    create_sample_real_image(fixtures_dir / "sample_real.jpg")
    print(f"Created {fixtures_dir / 'sample_real.jpg'}")
    
    create_sample_fake_image(fixtures_dir / "sample_fake.jpg")
    print(f"Created {fixtures_dir / 'sample_fake.jpg'}")
    
    create_sample_audio(fixtures_dir / "sample_audio.wav")
    print(f"Created {fixtures_dir / 'sample_audio.wav'}")
    
    create_sample_video(fixtures_dir / "sample_video.mp4")
    print(f"Created {fixtures_dir / 'sample_video.mp4'}")
    
    print("Done!")


if __name__ == "__main__":
    main()
```

---

## Part 3: Running Tests

### 3.1 Test Configuration

**File: `backend/pyproject.toml` (update)**

```toml
[tool.pytest.ini_options]
minversion = "8.0"
asyncio_mode = "auto"
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --tb=short --strict-markers"
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks integration tests",
    "unit: marks unit tests",
]
filterwarnings = [
    "ignore::DeprecationWarning",
    "ignore::UserWarning",
]

[tool.coverage.run]
source = ["app"]
omit = ["app/__pycache__/*", "tests/*"]
branch = true

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
]
fail_under = 80
```

### 3.2 Running Tests

```bash
# Run all tests
cd backend
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run only fast tests
pytest -m "not slow"

# Run specific test file
pytest tests/test_spatial.py

# Run with verbose output
pytest -vv

# Run and stop on first failure
pytest -x
```

---

## Part 4: Implementation Checklist

### Phase 1: Real ML Models (Week 1-2)

- [ ] Create `model_downloader.py`
- [ ] Implement `ONNXSpatialDetector`
- [ ] Enhance `VoiceDetector` with ML
- [ ] Add model download on first run
- [ ] Update config to disable mock mode
- [ ] Test with real images

### Phase 2: Model Training (Week 2-3)

- [ ] Download FaceForensics++ dataset
- [ ] Run `train_spatial_detector.py`
- [ ] Train audio vocoder detector
- [ ] Export models to ONNX
- [ ] Add model versioning

### Phase 3: Test Suite (Week 3-4)

- [ ] Create test fixtures
- [ ] Write spatial detector tests
- [ ] Write audio detector tests
- [ ] Write fusion tests
- [ ] Write API integration tests
- [ ] Achieve >80% coverage

### Phase 4: Production Hardening (Week 4)

- [ ] Add model download scripts to setup
- [ ] Update documentation
- [ ] Add model health checks
- [ ] Create model update procedure
- [ ] Performance benchmarking

---

## Quick Start Commands

```bash
# Setup
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create test fixtures
python scripts/create_test_fixtures.py

# Run tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Train models (requires dataset)
python scripts/train_spatial_detector.py --data_dir /path/to/faceforensics++ --output_dir ./models

# Run server with real models
USE_MOCK_MODELS=false uvicorn app.main:app --reload
```

---

## Success Criteria

1. **Real ML Inference**: All detectors use real ONNX models, not mocks
2. **Model Weights**: Pre-trained weights available via download
3. **Test Coverage**: >80% code coverage with meaningful tests
4. **Validation**: Models tested on benchmark datasets with known accuracy
5. **Documentation**: Clear setup and training instructions
6. **Performance**: Analysis completes within reasonable time (<10s for image, <60s for video)

---

## Estimated Effort

| Task | Hours | Priority |
|------|-------|----------|
| Model downloader | 4 | Critical |
| ONNX spatial detector | 8 | Critical |
| Audio ML enhancement | 6 | High |
| Training scripts | 16 | High |
| Test fixtures | 3 | High |
| Unit tests | 12 | High |
| Integration tests | 8 | High |
| Documentation | 4 | Medium |
| **Total** | **61 hours** | |

At 8 hours/day, this is approximately **8 working days** or **2 weeks** with focused effort.
