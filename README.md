# AI Gym & Personal Fitness Assistant (v2)

React + Vite + Three.js frontend, Flask + SQLite backend, scikit-learn workout recommender, optional pretrained food-image model.

## Run on Windows (VS Code)

Open **two terminals** in VS Code (Terminal > New Terminal).

**Terminal 1: backend**
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-food-ai.txt
python download_food_model.py
python train_recommender.py
python app.py
```
The API runs on http://127.0.0.1:5000. The SQLite database (`backend/gym.db`) is created automatically on first start and persists between restarts. Uploaded meal photos are stored in `backend/uploads/`.

**Terminal 2: frontend**
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. If PowerShell blocks `activate`, run `Set-ExecutionPolicy -Scope Process Bypass` first.

`python train_recommender.py` is recommended, but the backend also retrains automatically if the model file is missing or out of date.

## Optional: food image recognition (real pretrained model)

Out of the box the app works **without** any AI model: you pick the food manually and the calculator computes nutrition. The Food Recognition page and Settings > System status tell you honestly whether a model is installed.

To enable photo recognition (free, no API key, about 350 MB download plus PyTorch):
```
cd backend
.venv\Scripts\activate
pip install -r requirements-food-ai.txt
python download_food_model.py
```
Restart `python app.py`. The default model is `nateraw/food` (Hugging Face, Apache-2.0), a ViT fine-tuned on **Food-101**. Limits to know about:
- Food-101 contains 101 *prepared dishes* (omelette, fried rice, chicken curry, grilled salmon, greek salad...). It does **not** contain idli, dosa, roti, dal, paneer, banana, apple, almonds, oats or milk, so for those the app shows "not confident" and you choose manually.
- Predictions are only used when they map to a food in your database and confidence is at least 55%. You always confirm the food and portion before saving.
- To try another Hugging Face image-classification model, set `FOOD_MODEL_ID` in `backend/.env` and add its labels to the `labels` list of the matching food in `backend/data/foods.json`.

## What changed vs your original project

Kept unchanged: `/api/health`, `/api/profile` (same response fields), `/api/exercises`, `/api/recommend`, `/api/chat` (LLM or local fallback), `/api/foods` (legacy per-portion fields still returned), the TF-IDF + cosine recommender, `pose_pipeline.py`, `train_pose_lstm.py`, all 16 original exercises (fields intact).

Upgraded or added:
- **3D anatomy** (`MuscleScene.jsx`): all 14 muscle groups selectable, green highlight, name tags, front/back/left/right views, flip, reset, zoom.
- **Exercise library**: 40 exercises in 6 categories with steps, safety tips, primary/secondary muscles, rest times and an original animated SVG demonstration.
- **Workout plans**: Level I/II/III = 3/4/5 sets, set tracking, workout timer, rest timer, progress bar, saved history.
- **Nutrition**: food database in SQLite (editable), calculator, diary with photos, dashboard, progress charts (Recharts).
- **Recommender**: same TF-IDF + cosine model, now also boosted by muscle, filtered by level and equipment, with a sets/reps/rest prescription.
- **Fix**: under-18 users no longer get an adult BMI category or calorie/fiber targets.
- **AI Coach** remains as an extra page (10 nav items instead of the 9 you listed, so the existing chat is not lost).

## API summary
`GET /api/health` · `GET /api/exercises[?q=&muscle=]` · `GET|POST /api/foods`, `PUT|DELETE /api/foods/<id>` · `GET|POST /api/profile` · `POST /api/recommend` · `POST /api/food/recognize` · `POST /api/food/calculate` · `GET /api/nutrition/daily[?date=]` · `POST /api/nutrition/add` · `PUT /api/nutrition/update` · `DELETE /api/nutrition/delete` · `POST /api/workouts/log` · `POST /api/weight` · `GET /api/progress[?range=week|month]`

Uploads: JPG/PNG/WEBP only, 5 MB max, verified as real images, re-encoded (EXIF/GPS removed).

## Folder structure
```
backend/  app.py  db.py  nutrition.py  food_recognition.py  train_recommender.py  download_food_model.py
          requirements.txt  requirements-food-ai.txt  data/{exercises,foods}.json
frontend/ src/{App.jsx,MuscleScene.jsx,BodyMap.jsx,ExerciseFigure.jsx,muscles.js,api.js,ui.jsx,style.css,pages/*}
```

## Honest limitations
- The 3D body is a **stylised procedural model** (spheres/capsules), not a medical-grade scan. No licensed anatomical GLB could be bundled; the muscle data in `src/muscles.js` is easy to remap onto a GLB later.
- Exercise demonstrations are **original simplified stick-figure animations**, not photos or videos.
- Nutrition values are general estimates per 100 g; calorie/BMI figures are not medical advice and are not provided for under-18 users.
- Single-user app: one profile, no login.
