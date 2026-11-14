"""Flame spread-rate prediction endpoints (wraps backend/ai/ml)."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.ai.ml.predict import _load, predict
from backend.ai.ml.risk import qualitative_risk

router = APIRouter(prefix="/api", tags=["ml"])

# The model was trained on ISS microgravity only, so only ~0 g is predicted.
MICROGRAVITY_MAX_G = 0.01


class Scenario(BaseModel):
    o2_percent: float = Field(..., ge=10, le=40, description="Oxygen concentration, vol %")
    opposed_flow_cm_s: float = Field(..., gt=0, le=500, description="Opposed airflow velocity, cm/s")
    rod_diameter_cm: float = Field(..., gt=0, le=5, description="PMMA rod diameter, cm")
    gravity_g: float = Field(0.0, ge=0, le=1.0, description="Gravity in g. Predictions exist for ~0 g only.")
    fuel: str = "PMMA"
    pressure_psi: float | None = Field(None, description="Accepted but NOT used: no pressure data in the dataset")


@router.get("/ml/health")
def ml_health():
    b = _load()
    return {"status": "ok", "model": b["model_name"], "n_rows": b["n_rows"], "n_samples": b["n_samples"],
            "train_ranges": b["train_ranges"], "cv_residual_sd_mm_s": b["cv_residual_sd_mm_s"]}


@router.post("/predict")
def predict_endpoint(s: Scenario):
    unsupported = []
    if s.fuel.upper() != "PMMA":
        unsupported.append(f"fuel '{s.fuel}': model trained only on cast PMMA rods")
    if s.pressure_psi is not None:
        unsupported.append("pressure: not measured/varied in the NASA data, ignored")

    if s.gravity_g > MICROGRAVITY_MAX_G:
        # Don't return a number we have no data for (Moon 0.16 g, Mars 0.38 g, Earth 1 g).
        return {
            "status": "unsupported_gravity",
            "modelPrediction": None,
            "message": (f"No prediction at {s.gravity_g:g} g. The model is trained on ISS microgravity (~0 g) "
                        "BASS-II tests only, and the NASA data contains no partial-gravity (Moon/Mars) runs. "
                        "Switch to ISS Microgravity to get a prediction."),
            "unsupportedInputs": unsupported,
            "evidenceStatus": "None for this gravity level",
        }

    r = predict(s.o2_percent, s.opposed_flow_cm_s, s.rod_diameter_cm)
    r["confidence"] = "Low" if (not r["in_training_range"] or unsupported) else "Medium"
    return {
        "status": "ok",
        "modelPrediction": {"predictedSpreadRate_mm_s": r["predicted_spread_rate_mm_s"],
                            "approxRange_mm_s": r["range_mm_s"], "valueType": "model_prediction",
                            "model": r["model"]},
        "peakTemperature": {"available": False, "reason": "Temperature was not measured in the BASS-II spread-rate tables."},
        "confidence": r["confidence"],
        "evidenceStatus": "Limited (52 ISS tests, 19 samples)",
        "warnings": r["warnings"],
        "unsupportedInputs": unsupported,
        "risk": qualitative_risk(s.o2_percent, s.opposed_flow_cm_s, r),
        "source": r["source"],
    }
