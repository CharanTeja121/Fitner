"""SQLite persistence for the AI Gym & Personal Fitness Assistant."""
import json
import sqlite3
from pathlib import Path

BASE = Path(__file__).parent
DB_PATH = BASE / "gym.db"
UPLOAD_DIR = BASE / "uploads"

SCHEMA = """
CREATE TABLE IF NOT EXISTS profile(
  id INTEGER PRIMARY KEY CHECK(id=1), name TEXT, age INTEGER, height_cm REAL, weight_kg REAL,
  sex TEXT, profession TEXT, goal TEXT, activity_factor REAL, level TEXT, equipment TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS foods(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, emoji TEXT, portion TEXT, portion_g REAL NOT NULL,
  calories REAL, protein REAL, carbs REAL, fat REAL, fiber REAL,
  labels TEXT DEFAULT '[]', custom INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS meals(
  id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, meal_type TEXT NOT NULL,
  food_id TEXT, food_name TEXT NOT NULL, grams REAL NOT NULL, serving_label TEXT,
  calories REAL, protein REAL, carbs REAL, fat REAL, fiber REAL,
  image TEXT, source TEXT DEFAULT 'manual', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
CREATE TABLE IF NOT EXISTS weight_log(date TEXT PRIMARY KEY, weight_kg REAL NOT NULL);
CREATE TABLE IF NOT EXISTS workout_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, category TEXT, exercise TEXT NOT NULL,
  sets_done INTEGER, sets_total INTEGER, duration_s INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_workout_date ON workout_log(date);
"""


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables and seed the food table from data/foods.json (existing rows, incl. user edits, are kept)."""
    UPLOAD_DIR.mkdir(exist_ok=True)
    foods = json.loads((BASE / "data/foods.json").read_text(encoding="utf-8"))
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        for f in foods:
            p = f["per_100g"]
            conn.execute(
                "INSERT OR IGNORE INTO foods(id,name,emoji,portion,portion_g,calories,protein,carbs,fat,fiber,labels,custom)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,0)",
                (f["id"], f["name"], f.get("emoji", "🍽️"), f["portion"], f["portion_g"], p["calories"], p["protein"],
                 p["carbs"], p["fat"], p["fiber"], json.dumps(f.get("labels", []))))
