"""Optional image recognition for meals using a pretrained Hugging Face image-classification model.

Nothing here is faked: if `transformers` + `torch` are not installed, `installed()` is False and the API
tells the user to pick the food manually. The default model is a ViT fine-tuned on Food-101
(101 prepared dishes), so it does not know every food (e.g. idli, dosa, roti, banana).
"""
import importlib.util
import os
import threading

MODEL_ID = os.getenv("FOOD_MODEL_ID", "nateraw/food")
CONFIDENT_AT = 0.55
_lock = threading.Lock()
_pipe = None
_error = None


class ModelUnavailable(Exception):
    pass


def installed():
    return all(importlib.util.find_spec(m) is not None for m in ("transformers", "torch"))


def status():
    return {"installed": installed(), "loaded": _pipe is not None, "model_id": MODEL_ID, "error": _error}


def _load():
    global _pipe, _error
    with _lock:
        if _pipe is None:
            try:
                from transformers import pipeline
                _pipe = pipeline("image-classification", model=MODEL_ID)
            except Exception as exc:  # download/offline/corrupt cache
                _error = str(exc)[:200]
                raise ModelUnavailable("The food model could not be loaded: " + _error)
    return _pipe


def classify(img, top_k=5):
    """Return [{'label','score'}]; `img` is a PIL image."""
    if _pipe is None and not installed():
        raise ModelUnavailable("No image-recognition model is installed on this server.")
    pipe = _load()
    return [{"label": r["label"].strip().lower().replace(" ", "_"), "score": float(r["score"])}
            for r in pipe(img, top_k=top_k)]
