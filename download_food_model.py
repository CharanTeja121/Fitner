"""One-time download of the food recognition model (about 350 MB). Run after: pip install -r requirements-food-ai.txt"""
from food_recognition import MODEL_ID, _load
print("Downloading / loading", MODEL_ID, "...")
_load()
print("Done. The model is cached locally; recognition now works offline.")
