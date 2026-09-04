from __future__ import annotations

from functools import lru_cache
from typing import Any

import numpy as np

DANGER_KEYWORDS = (
    "siren",
    "ambulance",
    "fire engine",
    "police car",
    "alarm",
    "smoke detector",
    "civil defense",
    "emergency vehicle",
    "car horn",
    "air horn",
)


def _load_audio_mono_16k(audio_bytes: bytes) -> np.ndarray:
    try:
        import soundfile as sf
        import io

        data, sr = sf.read(io.BytesIO(audio_bytes), always_2d=False)
        if getattr(data, "ndim", 1) > 1:
            data = data.mean(axis=1)
        data = data.astype(np.float32)
        if sr != 16000 and len(data) > 1:
            # linear resample without scipy
            n = int(len(data) * 16000 / sr)
            x_old = np.linspace(0.0, 1.0, num=len(data), endpoint=False)
            x_new = np.linspace(0.0, 1.0, num=max(n, 1), endpoint=False)
            data = np.interp(x_new, x_old, data).astype(np.float32)
        return data
    except Exception:
        arr = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        return arr


def _spectral_siren_score(waveform: np.ndarray, sr: int = 16000) -> float:
    if len(waveform) < sr // 4:
        return 0.0
    win = min(len(waveform), sr)
    chunk = waveform[:win]
    window = 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(len(chunk)) / max(len(chunk) - 1, 1))
    spectrum = np.abs(np.fft.rfft(chunk * window))
    freqs = np.fft.rfftfreq(len(chunk), 1 / sr)
    band = (freqs >= 600) & (freqs <= 1800)
    if not np.any(band):
        return 0.0
    band_energy = float(spectrum[band].mean())
    total = float(spectrum.mean()) + 1e-9
    ratio = band_energy / total
    return float(min(1.0, max(0.0, (ratio - 0.8) / 2.0 + 0.5 * min(1.0, band_energy / 50.0))))


@lru_cache(maxsize=1)
def _try_load_yamnet():
    try:
        import tensorflow as tf  # noqa: F401
        import tensorflow_hub as hub

        model = hub.load("https://tfhub.dev/google/yamnet/1")
        class_map_path = model.class_map_path().numpy()
        import csv

        class_names = []
        with open(class_map_path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                class_names.append(row["display_name"])
        return model, class_names
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)


def classify_ambient(audio_bytes: bytes) -> dict[str, Any]:
    waveform = _load_audio_mono_16k(audio_bytes)
    yamnet, class_names = _try_load_yamnet()

    if yamnet is not None and isinstance(class_names, list):
        scores, embeddings, spectrogram = yamnet(waveform)
        mean_scores = scores.numpy().mean(axis=0)
        top_i = int(np.argmax(mean_scores))
        label = class_names[top_i]
        score = float(mean_scores[top_i])
        is_danger = any(k in label.lower() for k in DANGER_KEYWORDS) and score >= 0.15
        top5 = np.argsort(mean_scores)[-5:][::-1]
        dangers = []
        for i in top5:
            name = class_names[int(i)]
            sc = float(mean_scores[int(i)])
            if any(k in name.lower() for k in DANGER_KEYWORDS) and sc >= 0.1:
                dangers.append({"label": name, "score": sc})
                is_danger = True
        if dangers:
            best = max(dangers, key=lambda d: d["score"])
            label, score = best["label"], best["score"]
        return {
            "is_danger": bool(is_danger),
            "label": label,
            "score": score,
            "engine": "yamnet",
            "top_dangers": dangers,
        }

    score = _spectral_siren_score(waveform)
    is_danger = score >= 0.55
    return {
        "is_danger": is_danger,
        "label": "Siren (heuristic)" if is_danger else "Ambient",
        "score": score,
        "engine": f"heuristic:{class_names}",
        "top_dangers": [{"label": "Siren", "score": score}] if is_danger else [],
    }
