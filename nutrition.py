"""Nutrition maths and personalised target calculation (general estimates, not medical advice)."""

NUTRIENTS = ("calories", "protein", "carbs", "fat", "fiber")
MEAL_TYPES = {"breakfast": "Breakfast", "lunch": "Lunch", "snack": "Evening Snacks", "dinner": "Dinner"}
GOAL_ALIASES = {"weight_loss": "fat_loss", "weight loss": "fat_loss", "fat_loss": "fat_loss", "fat loss": "fat_loss",
                "muscle_gain": "muscle_gain", "muscle gain": "muscle_gain",
                "maintenance": "maintenance", "weight_maintenance": "maintenance", "weight maintenance": "maintenance"}


def scale_nutrients(per100, grams):
    """Nutrient amount = value per 100 g x actual weight / 100"""
    return {k: float(per100[k]) * grams / 100.0 for k in NUTRIENTS}


def rounded(values):
    return {k: round(float(values[k]), 1) for k in NUTRIENTS}


def normalize_goal(goal):
    return GOAL_ALIASES.get(str(goal or "maintenance").strip().lower(), "maintenance")


def compute_profile_stats(d):
    """Return BMI + calorie/macro targets. Raises ValueError on invalid input.
    Adult calorie targets and BMI categories are NOT produced for people under 18."""
    try:
        age, height, weight = int(d["age"]), float(d["height_cm"]), float(d["weight_kg"])
        if not (1.0 <= height <= 260 and 1.0 <= weight <= 500 and 1 <= age <= 110):
            raise ValueError()
    except (KeyError, ValueError, TypeError):
        raise ValueError("Enter valid age, height (cm), and weight (kg).")
    bmi = weight / ((height / 100) ** 2)
    sex = str(d.get("sex", "other")).lower()
    goal = normalize_goal(d.get("goal"))
    minor = age < 18
    bmr = maintenance = calorie = protein = fat = carbs = fiber = None
    if not minor:
        # Mifflin-St Jeor; "other" uses the average offset rather than assuming sex.
        offset = 5 if sex == "male" else (-161 if sex == "female" else -78)
        bmr = 10 * weight + 6.25 * height - 5 * age + offset
        activity = float(d.get("activity_factor", 1.375))
        maintenance = round(bmr * min(max(activity, 1.2), 1.9))
        calorie = round(maintenance * (0.85 if goal == "fat_loss" else 1.10 if goal == "muscle_gain" else 1))
        protein = round(weight * (1.6 if goal == "muscle_gain" else 1.4))
        fat = round((calorie * 0.27) / 9)
        carbs = round(max(0, calorie - protein * 4 - fat * 9) / 4)
        fiber = 25 if sex == "female" else 30
    if minor:
        category = "Not classified (adult BMI categories do not apply under 18)"
    else:
        category = "Underweight" if bmi < 18.5 else "Healthy range" if bmi < 25 else "Overweight" if bmi < 30 else "Obesity range"
    return {"bmi": round(bmi, 1), "bmi_category": category, "bmr": round(bmr) if bmr else None,
            "maintenance_calories": maintenance, "calories": calorie, "protein_g": protein, "fat_g": fat,
            "carbs_g": carbs, "fiber_g": fiber, "is_minor": minor, "goal": goal,
            "added_sugar_limit_g": "Keep added sugar below 10% of calories (ideally less)",
            "note": "General estimates for adults, not a medical prescription. BMI is a screening measure, not a diagnosis."
            if not minor else
            "For people under 18, adult BMI categories and calorie targets are not appropriate. Please consult a qualified clinician or dietitian."}


def targets_from_stats(stats):
    """Daily targets used by the dashboard; None values when no target is appropriate (minors)."""
    return {"calories": stats["calories"], "protein": stats["protein_g"], "carbs": stats["carbs_g"],
            "fat": stats["fat_g"], "fiber": stats["fiber_g"]}
