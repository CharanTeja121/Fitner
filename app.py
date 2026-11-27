from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pathlib import Path
from datetime import date, datetime, timedelta
from PIL import Image, ImageOps
import io, json, os, uuid, joblib, requests
from dotenv import load_dotenv

import db, nutrition, food_recognition
from nutrition import NUTRIENTS, MEAL_TYPES

BASE = Path(__file__).parent
load_dotenv(BASE / ".env")
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024  # hard request cap; images are further limited to 5 MB
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173",
                                              "http://localhost:4173", "http://127.0.0.1:4173"]}})
Image.MAX_IMAGE_PIXELS = 40_000_000
EXERCISES = json.loads((BASE / "data/exercises.json").read_text(encoding="utf-8"))
MODEL_PATH = BASE / "recommender.joblib"
db.init_db()


def load_recommender():
    """Load the trained model; retrain automatically if it is missing, unreadable or out of date."""
    try:
        bundle = joblib.load(MODEL_PATH)
        if [i["name"] for i in bundle["items"]] == [e["name"] for e in EXERCISES]:
            return bundle
    except Exception:
        pass
    try:
        import train_recommender
        return train_recommender.train()
    except Exception:
        return None


RECOMMENDER = load_recommender()
DEMO_PROFILE = {"name": "Alex", "age": 24, "height_cm": 172, "weight_kg": 72, "sex": "male", "profession": "Software developer",
                "goal": "muscle_gain", "activity_factor": 1.375, "level": "Beginner", "equipment": ["Bodyweight", "Dumbbells"]}
ALL_MUSCLES = ["chest", "shoulders", "biceps", "triceps", "forearms", "abs", "obliques", "upper_back", "lower_back",
               "traps", "quads", "hamstrings", "glutes", "calves"]
MUSCLE_ALIASES = {
    "chest": [("chest",)], "back": [("upper_back", "lower_back", "traps")], "upper back": [("upper_back",)],
    "lower back": [("lower_back",)], "shoulder": [("shoulders",)], "arms": [("biceps", "triceps", "forearms")],
    "legs": [("quads", "hamstrings", "glutes", "calves")], "core": [("abs", "obliques")], "abs": [("abs",)],
    "quadriceps": [("quads",)], "trapezius": [("traps",)], "lats": [("upper_back",)],
}


# ---------------------------------------------------------------- helpers
class ApiError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message, self.status = message, status


@app.errorhandler(ApiError)
def handle_api_error(e):
    return jsonify({"error": e.message}), e.status


@app.errorhandler(413)
def too_large(_):
    return jsonify({"error": "Upload is too large (maximum image size is 5 MB)."}), 413


@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "Not found."}), 404


@app.errorhandler(500)
def server_error(_):
    return jsonify({"error": "Unexpected server error. Check the backend terminal for details."}), 500


def payload():
    """JSON body, or form fields for multipart uploads."""
    return request.get_json(silent=True) or request.form.to_dict() or {}


def number(d, key, lo, hi, required=True, label=None):
    label = label or key
    if d.get(key) in (None, ""):
        if required:
            raise ApiError(f"{label} is required.")
        return None
    try:
        v = float(d[key])
    except (TypeError, ValueError):
        raise ApiError(f"{label} must be a number.")
    if not (lo <= v <= hi):
        raise ApiError(f"{label} must be between {lo:g} and {hi:g}.")
    return v


def parse_date(value):
    if not value:
        return date.today().isoformat()
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date().isoformat()
    except ValueError:
        raise ApiError("Date must be in YYYY-MM-DD format.")


def meal_type_of(value, default=None):
    v = str(value or default or "").strip().lower()
    v = {"evening snacks": "snack", "snacks": "snack", "evening_snacks": "snack"}.get(v, v)
    if v not in MEAL_TYPES:
        raise ApiError("meal_type must be one of: breakfast, lunch, snack, dinner.")
    return v


ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def read_image(file_storage):
    """Validate an uploaded image (type, size, real image content) and return a PIL image."""
    data = file_storage.read(MAX_IMAGE_BYTES + 1)
    if not data:
        raise ApiError("The uploaded file is empty.")
    if len(data) > MAX_IMAGE_BYTES:
        raise ApiError("Image is larger than 5 MB.", 413)
    try:
        Image.open(io.BytesIO(data)).verify()
        img = Image.open(io.BytesIO(data))
        fmt = img.format
        img = ImageOps.exif_transpose(img).convert("RGB")
    except Exception:
        raise ApiError("The file is not a valid image.")
    if fmt not in ALLOWED_FORMATS:
        raise ApiError("Only JPG, PNG or WEBP images are allowed.")
    return img


def save_image(img):
    img = img.copy()
    img.thumbnail((1024, 1024))  # also strips EXIF metadata such as GPS location
    name = uuid.uuid4().hex + ".jpg"
    img.save(db.UPLOAD_DIR / name, "JPEG", quality=85)
    return name


def delete_image_if_unused(conn, name):
    if name and not conn.execute("SELECT 1 FROM meals WHERE image=?", (name,)).fetchone():
        try:
            (db.UPLOAD_DIR / name).unlink()
        except OSError:
            pass


def food_json(r):
    per100 = {k: r[k] for k in NUTRIENTS}
    per_portion = nutrition.rounded(nutrition.scale_nutrients(per100, r["portion_g"]))
    return {"id": r["id"], "name": r["name"], "emoji": r["emoji"], "portion": r["portion"], "portion_g": r["portion_g"],
            "per_100g": per100, "custom": bool(r["custom"]), "basis": "per_portion", **per_portion}


def get_food(conn, food_id):
    r = conn.execute("SELECT * FROM foods WHERE id=?", (str(food_id or ""),)).fetchone()
    if not r:
        raise ApiError("Unknown food. Choose a food from the list.", 404)
    return r


def grams_from(d, food):
    if d.get("grams") not in (None, ""):
        return number(d, "grams", 1, 5000, label="Weight (g)")
    if d.get("servings") not in (None, ""):
        return round(number(d, "servings", 0.1, 50, label="Servings") * food["portion_g"], 1)
    raise ApiError("Enter the weight in grams or the number of servings.")


def meal_json(r):
    out = {k: r[k] for k in ("id", "date", "meal_type", "food_id", "food_name", "grams", "serving_label", "source")}
    out.update(nutrition.rounded({k: r[k] for k in NUTRIENTS}))
    out["image_url"] = request.host_url.rstrip("/") + "/uploads/" + r["image"] if r["image"] else None
    out["meal_label"] = MEAL_TYPES[r["meal_type"]]
    return out


def get_profile(conn):
    r = conn.execute("SELECT * FROM profile WHERE id=1").fetchone()
    if not r:
        return {**DEMO_PROFILE, "saved": False}
    p = {k: r[k] for k in r.keys() if k not in ("id", "updated_at")}
    p["equipment"] = json.loads(p["equipment"] or "[]")
    return {**p, "saved": True}


def day_totals(conn, day):
    r = conn.execute("SELECT COALESCE(SUM(calories),0) calories, COALESCE(SUM(protein),0) protein, COALESCE(SUM(carbs),0) carbs,"
                     " COALESCE(SUM(fat),0) fat, COALESCE(SUM(fiber),0) fiber, COUNT(*) n FROM meals WHERE date=?", (day,)).fetchone()
    return nutrition.rounded(r), r["n"]


def current_targets(conn):
    p = get_profile(conn)
    try:
        return nutrition.targets_from_stats(nutrition.compute_profile_stats(p)), p
    except ValueError:
        return {k: None for k in NUTRIENTS}, p


# ---------------------------------------------------------------- recommender (TF-IDF + cosine, preserved)
LEVEL_INDEX = {"beginner": 0, "moderate": 1, "pro": 2}
GOAL_REPS = {"muscle_gain": "8-12", "fat_loss": "12-15", "maintenance": "10-12"}


def muscle_targets(muscle):
    key = str(muscle or "").strip().lower().replace(" ", "_")
    if key in ALL_MUSCLES:
        return {key}
    alias = MUSCLE_ALIASES.get(str(muscle or "").strip().lower())
    return set(alias[0]) if alias else set()


def equipment_ok(e, equipment):
    if not equipment:
        return True
    ex = e["equipment"].lower()
    if "bodyweight" in ex:
        return True
    return any(t.lower().rstrip("s") in ex for t in equipment)


def prescription(e, level, goal):
    idx = LEVEL_INDEX.get(str(level or "beginner").lower(), 0)
    reps = e["reps"] if "second" in e["reps"] or "total" in e["reps"] else GOAL_REPS.get(nutrition.normalize_goal(goal), e["reps"])
    return {"sets": 3 + idx, "reps": reps, "rest_seconds": min(120, e.get("rest_seconds", 60) + 15 * idx)}


def recommend(query, level=None, limit=5, muscle=None, equipment=None, goal=None):
    if not RECOMMENDER:
        return []
    q = RECOMMENDER["vectorizer"].transform([query])
    distances, indices = RECOMMENDER["model"].kneighbors(q, n_neighbors=len(EXERCISES))
    wanted = muscle_targets(muscle)
    scored = []
    for dist, idx in zip(distances[0], indices[0]):
        e = EXERCISES[int(idx)]
        if level and level.lower() != "all" and e["level"].lower() not in (level.lower(), "beginner"):
            continue
        if not equipment_ok(e, equipment):
            continue
        sim = 1 - float(dist)
        hit = bool(wanted & set(e.get("muscles", []))) or str(muscle or "").lower() == e["group"].lower()
        primary_hit = hit and bool(wanted & set(e.get("muscles", [])[:1]))
        if wanted and not hit:  # a muscle was chosen: only return exercises that actually train it
            continue
        score = sim + (0.35 if hit else 0) + (0.1 if primary_hit else 0)
        scored.append({**e, "similarity": round(sim, 3), "match_score": round(min(score, 1.0), 3), "muscle_match": hit,
                       "prescription": prescription(e, level, goal)})
    scored.sort(key=lambda r: (-r["match_score"], r["name"]))
    return scored[:limit]


# ---------------------------------------------------------------- health / profile
@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "recommender_loaded": RECOMMENDER is not None, "database": "sqlite",
                    "exercise_count": len(EXERCISES), "food_model": food_recognition.status()})


@app.get("/uploads/<path:name>")
def uploads(name):
    return send_from_directory(db.UPLOAD_DIR, name)


@app.get("/api/profile")
def profile_get():
    with db.get_conn() as conn:
        p = get_profile(conn)
    try:
        stats = nutrition.compute_profile_stats(p)
    except ValueError:
        stats = None
    return jsonify({"profile": p, "stats": stats})


@app.post("/api/profile")
def profile():
    d = request.get_json(force=True)
    try:
        stats = nutrition.compute_profile_stats(d)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    equipment = d.get("equipment") if isinstance(d.get("equipment"), list) else []
    sex = str(d.get("sex", "other")).lower()
    level = d.get("level") if d.get("level") in ("Beginner", "Moderate", "Pro") else "Beginner"
    with db.get_conn() as conn:
        conn.execute(
            "INSERT INTO profile(id,name,age,height_cm,weight_kg,sex,profession,goal,activity_factor,level,equipment,updated_at)"
            " VALUES(1,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, age=excluded.age,"
            " height_cm=excluded.height_cm, weight_kg=excluded.weight_kg, sex=excluded.sex, profession=excluded.profession,"
            " goal=excluded.goal, activity_factor=excluded.activity_factor, level=excluded.level, equipment=excluded.equipment,"
            " updated_at=excluded.updated_at",
            (str(d.get("name", ""))[:60], int(d["age"]), float(d["height_cm"]), float(d["weight_kg"]), sex,
             str(d.get("profession", ""))[:80], stats["goal"], float(d.get("activity_factor", 1.375)), level,
             json.dumps([str(x)[:30] for x in equipment[:10]]), datetime.now().isoformat(timespec="seconds")))
        conn.execute("INSERT INTO weight_log(date,weight_kg) VALUES(?,?) ON CONFLICT(date) DO UPDATE SET weight_kg=excluded.weight_kg",
                     (date.today().isoformat(), float(d["weight_kg"])))
        saved = get_profile(conn)
    return jsonify({**stats, "profile": saved})


# ---------------------------------------------------------------- exercises + recommender
@app.get("/api/exercises")
def exercises():
    q = request.args.get("q", "").strip().lower()
    muscle = request.args.get("muscle", "").strip().lower()
    result = EXERCISES
    if muscle:
        result = [e for e in result if muscle in e.get("muscles", [])]
    if q:
        result = [e for e in result if q in e["name"].lower() or q in e["group"].lower()
                  or any(q in m.lower() for m in e["primary"] + e["secondary"])]
    return jsonify(result)


@app.post("/api/recommend")
def recommend_api():
    d = request.get_json(force=True)
    eq = d.get("equipment") or []
    if isinstance(eq, str):
        eq = [x.strip() for x in eq.split(",") if x.strip()]
    query = " ".join([str(d.get("muscle", "")), str(d.get("goal", "")), " ".join(eq), str(d.get("level", ""))])
    recs = recommend(query, d.get("level"), 6, muscle=d.get("muscle"), equipment=eq, goal=d.get("goal"))
    return jsonify({"recommendations": recs,
                    "method": "Trained TF-IDF vectorizer + cosine nearest-neighbor ranking, boosted by selected muscle, "
                              "filtered by experience level and available equipment",
                    "model_ready": RECOMMENDER is not None,
                    "filters": {"muscle": d.get("muscle"), "goal": d.get("goal"), "level": d.get("level"), "equipment": eq}})


# ---------------------------------------------------------------- chat (unchanged behaviour)
@app.post("/api/chat")
def chat():
    d = request.get_json(force=True)
    message = str(d.get("message", "")).strip()
    if not message:
        return jsonify({"error": "Enter a question."}), 400
    context = []
    for e in EXERCISES:
        if any(term in message.lower() for term in [e["name"].lower(), e["group"].lower(), *[m.lower() for m in e["primary"]]]):
            context.append(f'{e["name"]}: primary {", ".join(e["primary"])}; secondary {", ".join(e["secondary"])}. {e["description"]}')
    if not context:
        context = [f'{e["name"]}: {", ".join(e["primary"])} primary; {", ".join(e["secondary"])} secondary.' for e in EXERCISES[:8]]
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
            response = requests.post(base + "/chat/completions", headers={"Authorization": f"Bearer {api_key}"},
              json={"model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"), "messages": [
                {"role": "system", "content": "You are a cautious fitness education assistant. Use this verified exercise knowledge when relevant. Do not diagnose, promise results, or prescribe treatment. For medical conditions, minors, pregnancy, or pain, advise a qualified professional. Nutrition and workout guidance is general education.\nKnowledge:\n" + "\n".join(context)},
                {"role": "user", "content": message}], "temperature": 0.4}, timeout=45)
            response.raise_for_status()
            return jsonify({"answer": response.json()["choices"][0]["message"]["content"], "mode": "LLM + retrieved exercise context"})
        except Exception as exc:
            return jsonify({"answer": "The LLM service could not be reached. Check your API key, model name and connection. Local exercise lookup is still available.", "mode": "LLM unavailable", "detail": str(exc)[:180]}), 502
    answer = "I am running in local knowledge-base mode because no LLM API key is configured. "
    if context:
        answer += "Relevant exercise information: " + " ".join(context[:4])
    answer += " Ask me about a listed exercise or muscle. For open-ended personalized coaching, configure an LLM key in backend/.env."
    return jsonify({"answer": answer, "mode": "Local knowledge-base fallback (not an LLM)"})


# ---------------------------------------------------------------- foods
@app.get("/api/foods")
def foods():
    q = request.args.get("q", "").strip().lower()
    with db.get_conn() as conn:
        rows = conn.execute("SELECT * FROM foods ORDER BY name").fetchall()
    return jsonify([food_json(r) for r in rows if not q or q in r["name"].lower()])


def validated_food_fields(d, partial=False):
    name = str(d.get("name", "")).strip()
    if not partial and not name:
        raise ApiError("Food name is required.")
    vals = {"calories": number(d, "calories", 0, 950, not partial, "Calories per 100 g"),
            "protein": number(d, "protein", 0, 100, not partial, "Protein per 100 g"),
            "carbs": number(d, "carbs", 0, 100, not partial, "Carbs per 100 g"),
            "fat": number(d, "fat", 0, 100, not partial, "Fat per 100 g"),
            "fiber": number(d, "fiber", 0, 100, not partial, "Fiber per 100 g")}
    if all(v is not None for v in (vals["protein"], vals["carbs"], vals["fat"])) and vals["protein"] + vals["carbs"] + vals["fat"] > 105:
        raise ApiError("Protein + carbs + fat cannot exceed 100 g per 100 g of food.")
    portion_g = number(d, "portion_g", 1, 2000, not partial, "Portion weight (g)")
    return name, vals, portion_g


@app.post("/api/foods")
def foods_add():
    d = payload()
    name, vals, portion_g = validated_food_fields(d)
    fid = "custom_" + uuid.uuid4().hex[:8]
    with db.get_conn() as conn:
        conn.execute("INSERT INTO foods(id,name,emoji,portion,portion_g,calories,protein,carbs,fat,fiber,labels,custom) VALUES(?,?,?,?,?,?,?,?,?,?,'[]',1)",
                     (fid, name[:80], str(d.get("emoji") or "🍽️")[:4], str(d.get("portion") or f"{portion_g:g} g")[:40], portion_g,
                      vals["calories"], vals["protein"], vals["carbs"], vals["fat"], vals["fiber"]))
        return jsonify(food_json(get_food(conn, fid))), 201


@app.put("/api/foods/<food_id>")
def foods_edit(food_id):
    d = payload()
    name, vals, portion_g = validated_food_fields({**d, "name": d.get("name") or "x"}, partial=False)
    with db.get_conn() as conn:
        old = get_food(conn, food_id)
        conn.execute("UPDATE foods SET name=?, portion=?, portion_g=?, calories=?, protein=?, carbs=?, fat=?, fiber=? WHERE id=?",
                     ((d.get("name") or old["name"])[:80], str(d.get("portion") or old["portion"])[:40], portion_g,
                      vals["calories"], vals["protein"], vals["carbs"], vals["fat"], vals["fiber"], food_id))
        return jsonify(food_json(get_food(conn, food_id)))


@app.delete("/api/foods/<food_id>")
def foods_delete(food_id):
    with db.get_conn() as conn:
        f = get_food(conn, food_id)
        if not f["custom"]:
            raise ApiError("Built-in foods cannot be deleted (you can edit their values).")
        conn.execute("DELETE FROM foods WHERE id=?", (food_id,))
    return jsonify({"deleted": food_id})


@app.post("/api/food/calculate")
def food_calculate():
    d = payload()
    with db.get_conn() as conn:
        food = get_food(conn, d.get("food_id"))
    grams = grams_from(d, food)
    n = nutrition.rounded(nutrition.scale_nutrients({k: food[k] for k in NUTRIENTS}, grams))
    return jsonify({"food_id": food["id"], "food_name": food["name"], "grams": grams, "nutrients": n,
                    "per_100g": {k: food[k] for k in NUTRIENTS},
                    "formula": "nutrient = value per 100 g × weight in g ÷ 100",
                    "estimate": True, "disclaimer": "Estimates only. Real values depend on ingredients and preparation."})


@app.post("/api/food/recognize")
def food_recognize():
    f = request.files.get("image")
    if not f:
        raise ApiError("Upload an image in the 'image' field.")
    img = read_image(f)
    with db.get_conn() as conn:
        rows = conn.execute("SELECT * FROM foods ORDER BY name").fetchall()
    by_label = {lab: r for r in rows for lab in json.loads(r["labels"] or "[]")}
    all_ids = [r["id"] for r in rows]
    base = {"model_id": food_recognition.MODEL_ID, "predictions": [], "confident": False, "suggestions": all_ids}
    try:
        preds = food_recognition.classify(img, top_k=5)
    except food_recognition.ModelUnavailable as exc:
        return jsonify({**base, "model_available": False,
                        "message": str(exc) + " Select the food manually below. To enable recognition, see 'Optional: food image recognition' in the README."})
    out = []
    for p in preds:
        r = by_label.get(p["label"])
        out.append({"raw_label": p["label"], "label": p["label"].replace("_", " ").title(), "confidence": round(p["score"], 3),
                    "food_id": r["id"] if r else None, "food_name": r["name"] if r else None})
    mapped = [o["food_id"] for o in out if o["food_id"]]
    suggestions = mapped + [i for i in all_ids if i not in mapped]
    confident = bool(out and out[0]["food_id"] and out[0]["confidence"] >= food_recognition.CONFIDENT_AT)
    msg = ("The model is fairly confident, but please confirm the food and portion." if confident else
           "The model is not confident about a food in the database. Pick the correct food from the list.")
    return jsonify({**base, "model_available": True, "predictions": out, "confident": confident,
                    "suggestions": suggestions, "message": msg})


# ---------------------------------------------------------------- nutrition diary
@app.get("/api/nutrition/daily")
def nutrition_daily():
    day = parse_date(request.args.get("date"))
    with db.get_conn() as conn:
        rows = conn.execute("SELECT * FROM meals WHERE date=? ORDER BY created_at, id", (day,)).fetchall()
        totals, n = day_totals(conn, day)
        targets, _ = current_targets(conn)
    grouped = {k: [] for k in MEAL_TYPES}
    for r in rows:
        grouped[r["meal_type"]].append(meal_json(r))
    remaining = {k: (None if targets[k] is None else round(targets[k] - totals[k], 1)) for k in NUTRIENTS}
    return jsonify({"date": day, "totals": totals, "targets": targets, "remaining": remaining, "count": n,
                    "meal_types": MEAL_TYPES, "meals": grouped})


@app.post("/api/nutrition/add")
def nutrition_add():
    d = payload()
    day = parse_date(d.get("date"))
    mtype = meal_type_of(d.get("meal_type"))
    source = "model" if d.get("source") == "model" else "manual"
    img_name = None
    with db.get_conn() as conn:
        food = get_food(conn, d.get("food_id"))
        grams = grams_from(d, food)
        if request.files.get("image"):
            img_name = save_image(read_image(request.files["image"]))
        n = nutrition.scale_nutrients({k: food[k] for k in NUTRIENTS}, grams)
        cur = conn.execute(
            "INSERT INTO meals(date,meal_type,food_id,food_name,grams,serving_label,calories,protein,carbs,fat,fiber,image,source)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (day, mtype, food["id"], food["name"], grams, f"{grams:g} g", n["calories"], n["protein"], n["carbs"], n["fat"],
             n["fiber"], img_name, source))
        row = conn.execute("SELECT * FROM meals WHERE id=?", (cur.lastrowid,)).fetchone()
        totals, _ = day_totals(conn, day)
    return jsonify({"meal": meal_json(row), "totals": totals}), 201


@app.put("/api/nutrition/update")
def nutrition_update():
    d = payload()
    mid = int(number(d, "id", 1, 10**12, label="Meal id"))
    with db.get_conn() as conn:
        row = conn.execute("SELECT * FROM meals WHERE id=?", (mid,)).fetchone()
        if not row:
            raise ApiError("Meal not found.", 404)
        grams = row["grams"]
        if d.get("grams") not in (None, "") or d.get("servings") not in (None, ""):
            food = conn.execute("SELECT * FROM foods WHERE id=?", (row["food_id"],)).fetchone()
            grams = grams_from(d, food) if food else number(d, "grams", 1, 5000, label="Weight (g)")
        f = grams / row["grams"]  # scale the saved snapshot so later food-database edits don't rewrite history
        mtype = meal_type_of(d.get("meal_type"), row["meal_type"])
        image = row["image"]
        old_image = None
        if request.files.get("image"):
            old_image, image = image, save_image(read_image(request.files["image"]))
        elif str(d.get("remove_image", "")).lower() in ("1", "true"):
            old_image, image = image, None
        conn.execute("UPDATE meals SET grams=?, serving_label=?, meal_type=?, calories=?, protein=?, carbs=?, fat=?, fiber=?, image=? WHERE id=?",
                     (grams, f"{grams:g} g", mtype, *(row[k] * f for k in NUTRIENTS), image, mid))
        delete_image_if_unused(conn, old_image)
        row = conn.execute("SELECT * FROM meals WHERE id=?", (mid,)).fetchone()
        totals, _ = day_totals(conn, row["date"])
    return jsonify({"meal": meal_json(row), "totals": totals})


@app.delete("/api/nutrition/delete")
def nutrition_delete():
    d = payload()
    mid = int(number({"id": d.get("id", request.args.get("id"))}, "id", 1, 10**12, label="Meal id"))
    with db.get_conn() as conn:
        row = conn.execute("SELECT * FROM meals WHERE id=?", (mid,)).fetchone()
        if not row:
            raise ApiError("Meal not found.", 404)
        conn.execute("DELETE FROM meals WHERE id=?", (mid,))
        delete_image_if_unused(conn, row["image"])
        totals, _ = day_totals(conn, row["date"])
    return jsonify({"deleted": mid, "totals": totals})


# ---------------------------------------------------------------- workouts, weight, progress
@app.post("/api/workouts/log")
def workouts_log():
    d = request.get_json(force=True)
    day = parse_date(d.get("date"))
    items = d.get("exercises")
    if not isinstance(items, list) or not items:
        raise ApiError("Send a non-empty 'exercises' list.")
    known = {e["name"] for e in EXERCISES}
    dur = int(number(d, "duration_s", 0, 86400, False, "Duration") or 0)
    with db.get_conn() as conn:
        for it in items[:60]:
            if it.get("name") not in known:
                raise ApiError(f"Unknown exercise: {it.get('name')}")
            done = int(number(it, "sets_done", 0, 20, label="Sets done"))
            total = int(number(it, "sets_total", 1, 20, label="Sets total"))
            conn.execute("INSERT INTO workout_log(date,category,exercise,sets_done,sets_total,duration_s) VALUES(?,?,?,?,?,?)",
                         (day, str(d.get("category", ""))[:30], it["name"], min(done, total), total, dur))
    return jsonify({"saved": len(items)}), 201


@app.post("/api/weight")
def weight_log():
    d = request.get_json(force=True)
    w = number(d, "weight_kg", 1, 500, label="Weight (kg)")
    with db.get_conn() as conn:
        conn.execute("INSERT INTO weight_log(date,weight_kg) VALUES(?,?) ON CONFLICT(date) DO UPDATE SET weight_kg=excluded.weight_kg",
                     (parse_date(d.get("date")), w))
    return jsonify({"saved": True})


@app.get("/api/progress")
def progress():
    rng = request.args.get("range", "week")
    n = 30 if rng == "month" else 7
    today = date.today()
    days = [(today - timedelta(days=i)).isoformat() for i in range(n - 1, -1, -1)]
    with db.get_conn() as conn:
        meals = {r["date"]: r for r in conn.execute(
            "SELECT date, SUM(calories) calories, SUM(protein) protein, SUM(carbs) carbs, SUM(fat) fat, SUM(fiber) fiber"
            " FROM meals WHERE date>=? GROUP BY date", (days[0],))}
        work = {r["date"]: r for r in conn.execute(
            "SELECT date, SUM(sets_done) sets_done, SUM(sets_total) sets_total, COUNT(*) exercises FROM workout_log WHERE date>=? GROUP BY date", (days[0],))}
        weight = [dict(r) for r in conn.execute("SELECT date, weight_kg FROM weight_log WHERE date>=? ORDER BY date",
                                                ((today - timedelta(days=364 if rng == "month" else 90)).isoformat(),))]
        history = [dict(r) for r in conn.execute("SELECT id,date,category,exercise,sets_done,sets_total,duration_s FROM workout_log ORDER BY date DESC, id DESC LIMIT 25")]
        targets, _ = current_targets(conn)
    series = []
    for d in days:
        m, w = meals.get(d), work.get(d)
        series.append({"date": d, "label": d[5:], **{k: round(m[k], 1) if m else 0 for k in NUTRIENTS},
                       "sets_done": w["sets_done"] if w else 0, "sets_total": w["sets_total"] if w else 0,
                       "exercises": w["exercises"] if w else 0})
    logged = [s for s in series if s["calories"] > 0]
    avg = lambda k: round(sum(s[k] for s in logged) / len(logged), 1) if logged else 0
    summary = {"days_logged": len(logged), "avg_calories": avg("calories"), "avg_protein": avg("protein"), "avg_fiber": avg("fiber"),
               "workout_days": sum(1 for s in series if s["sets_done"] > 0), "total_sets": sum(s["sets_done"] for s in series),
               "total_exercises": sum(s["exercises"] for s in series),
               "completion_pct": round(100 * sum(s["sets_done"] for s in series) / max(1, sum(s["sets_total"] for s in series))),
               "current_weight": weight[-1]["weight_kg"] if weight else None,
               "weight_change": round(weight[-1]["weight_kg"] - weight[0]["weight_kg"], 1) if len(weight) > 1 else None}
    return jsonify({"range": "month" if n == 30 else "week", "days": series, "weight": weight, "workout_history": history,
                    "summary": summary, "targets": targets})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
