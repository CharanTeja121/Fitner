import json
from pathlib import Path
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors

BASE = Path(__file__).parent
MODEL_PATH = BASE / "recommender.joblib"


def exercise_text(e):
    return " ".join([e["name"], e["group"], e["level"], e["equipment"], e["description"],
                     *e["primary"], *e["secondary"], *e["tags"], *e.get("muscles", [])])


def train():
    """Fit TF-IDF + cosine nearest-neighbour model on exercises.json and save it."""
    items = json.loads((BASE / "data/exercises.json").read_text(encoding="utf-8"))
    texts = [exercise_text(e) for e in items]
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
    matrix = vectorizer.fit_transform(texts)
    model = NearestNeighbors(metric="cosine", algorithm="brute")
    model.fit(matrix)
    bundle = {"vectorizer": vectorizer, "model": model, "items": items}
    joblib.dump(bundle, MODEL_PATH)
    return bundle


if __name__ == "__main__":
    b = train()
    print(f"Trained TF-IDF + cosine-nearest-neighbor recommender on {len(b['items'])} curated exercises.")
