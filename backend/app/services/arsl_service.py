from __future__ import annotations

from functools import lru_cache
from typing import Any

import numpy as np

WORD_LABELS = [
    "ينام",
    "يسكت",
    "حب",
    "يدخن",
    "دعم",
    "مرتبك",
    "قلق",
    "هنا",
    "السلام عليكم",
    "شكرا",
]

DEMO_VOCAB = {
    "السلام عليكم": "السلام عليكم",
    "شكرا": "شكراً",
    "دعم": "مساعدة",
    "هنا": "هنا",
    "حب": "حب",
    "قلق": "قلق",
    "مرتبك": "مرتبك",
    "ينام": "ينام",
    "يسكت": "يسكت",
    "يدخن": "يدخن",
}

ALPHABET_LABELS = [
    "ع", "أ", "ب", "د", "ظ", "ض", "ف", "ق", "غ", "ه",
    "ح", "ج", "ك", "خ", "لا", "ل", "م", "ن", "ر", "ص",
    "س", "ش", "ط", "ت", "ث", "ذ", "و", "ي", "ز",
]

DEFAULT_CONFIDENCE_THRESHOLD = 0.38


def normalize_landmarks(landmarks: list[list[float]]) -> np.ndarray:
    arr = np.asarray(landmarks, dtype=np.float32)
    if arr.shape != (21, 3):
        raise ValueError(f"Expected landmarks shape (21,3), got {arr.shape}")
    wrist = arr[0]
    middle_mcp = arr[9]
    scale = float(np.linalg.norm(middle_mcp - wrist))
    if scale < 1e-6:
        scale = 1.0
    return ((arr - wrist) / scale).reshape(-1)


def _finger_extended(norm: np.ndarray, tip: int, pip: int) -> bool:
    # y grows downward in image space; after wrist-centering, "up" is often negative y
    return float(norm[tip * 3 + 1]) < float(norm[pip * 3 + 1]) - 0.05


def _heuristic_predict(norm63: np.ndarray) -> tuple[int, float]:
    """Lightweight pose rules so demo works without torch weights."""
    tips_ext = [
        _finger_extended(norm63, 8, 6),   # index
        _finger_extended(norm63, 12, 10), # middle
        _finger_extended(norm63, 16, 14), # ring
        _finger_extended(norm63, 20, 18), # pinky
        _finger_extended(norm63, 4, 3),   # thumb approx
    ]
    n_ext = sum(tips_ext)
    index, middle, ring, pinky, thumb = tips_ext

    # Open palm-ish → greeting
    if n_ext >= 4:
        return 8, 0.72  # السلام عليكم
    # thumbs up-ish → thanks
    if thumb and not index and not middle:
        return 9, 0.7  # شكرا
    # index only → here
    if index and not middle and not ring and not pinky:
        return 7, 0.68  # هنا
    # fist → be silent
    if n_ext <= 1 and not index:
        return 1, 0.65  # يسكت
    # two fingers → support/help
    if index and middle and not ring and not pinky:
        return 4, 0.66  # دعم
    # three fingers → love
    if index and middle and ring and not pinky:
        return 2, 0.62  # حب
    # pinky + thumb → worried
    if pinky and thumb and not middle:
        return 6, 0.6  # قلق
    # all curled low hand → sleep
    if n_ext == 0:
        return 0, 0.58  # ينام
    # default confused
    return 5, 0.55  # مرتبك


@lru_cache(maxsize=1)
def _try_torch_model():
    try:
        import torch
        import torch.nn as nn
        from huggingface_hub import hf_hub_download
        from transformers import T5Config, T5EncoderModel

        class T5EncoderClassifier(nn.Module):
            def __init__(self, feature_dim: int = 63, num_classes: int = 10):
                super().__init__()
                config = T5Config.from_pretrained("google-t5/t5-small")
                self.encoder = T5EncoderModel(config)
                d_model = config.d_model
                self.input_proj = nn.Sequential(
                    nn.Linear(feature_dim, d_model),
                    nn.Dropout(0.1),
                    nn.LayerNorm(d_model),
                    nn.GELU(),
                )
                self.head = nn.Sequential(nn.Dropout(0.1), nn.Linear(d_model, num_classes))

            def forward(self, x, attention_mask=None):
                projected = self.input_proj(x)
                outputs = self.encoder(inputs_embeds=projected, attention_mask=attention_mask)
                return self.head(outputs.last_hidden_state[:, 0])

        model = T5EncoderClassifier()
        ckpt = hf_hub_download(
            "FatimahEmadEldin/ArSL-Models", "sign_word_t5_classifier_best_3d.pth"
        )
        state = torch.load(ckpt, map_location="cpu", weights_only=False)
        if isinstance(state, dict):
            state = state.get("model_state_dict", state.get("state_dict", state))
        model.load_state_dict(state, strict=False)
        model.eval()
        return model, "torch+hf"
    except Exception as exc:  # noqa: BLE001
        return None, f"heuristic:{exc}"


def predict_word_from_landmarks(
    landmarks: list[list[float]],
    threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
) -> dict[str, Any]:
    feats = normalize_landmarks(landmarks)
    model, status = _try_torch_model()

    if model is not None:
        import torch

        seq = np.tile(feats, (100, 1))
        x = torch.from_numpy(seq).unsqueeze(0)
        mask = torch.ones(1, 100, dtype=torch.long)
        with torch.no_grad():
            logits = model(x, attention_mask=mask)
            probs = torch.softmax(logits, dim=-1)[0].cpu().numpy()
        idx = int(np.argmax(probs))
        confidence = float(probs[idx])
    else:
        idx, confidence = _heuristic_predict(feats)

    label = WORD_LABELS[idx]
    return {
        "label": label,
        "display": DEMO_VOCAB.get(label, label),
        "confidence": confidence,
        "accepted": confidence >= threshold,
        "index": idx,
        "model_status": status,
    }


def list_vocab() -> dict[str, Any]:
    _, status = _try_torch_model()
    return {
        "words": [
            {"index": i, "label": w, "display": DEMO_VOCAB.get(w, w)}
            for i, w in enumerate(WORD_LABELS)
        ],
        "threshold": DEFAULT_CONFIDENCE_THRESHOLD,
        "alphabet": ALPHABET_LABELS,
        "engine": status,
    }
