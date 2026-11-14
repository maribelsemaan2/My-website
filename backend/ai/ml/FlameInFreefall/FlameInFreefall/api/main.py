"""FastAPI service. Run from project root:  uvicorn api.main:app --reload
Docs UI: http://127.0.0.1:8000/docs"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ml"))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from predict import predict, _load
from api.risk import qualitative_risk

app = FastAPI(title="Flame in Freefall ML API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])

class Scenario(BaseModel):
    o2_percent: float = Field(..., ge=10, le=40, description="Oxygen concentration, vol %")
    opposed_flow_cm_s: float = Field(..., gt=0, le=500, description="Opposed airflow velocity, cm/s")
    rod_diameter_cm: float = Field(..., gt=0, le=5, description="PMMA rod diameter, cm")
    gravity_g: float = Field(0.0, ge=0, le=1.0, description="Gravity level in g. Only 0 (microgravity) is modelled.")
    fuel: str = "PMMA"
    pressure_psi: float | None = Field(None, description="Accepted but NOT used: no pressure data in this dataset")

@app.get("/health")
def health():
    b = _load(); return {"status": "ok", "model": b["model_name"], "n_rows": b["n_rows"], "n_samples": b["n_samples"]}

@app.post("/predict")
def predict_endpoint(s: Scenario):
    unsupported = []
    if s.fuel.upper() != "PMMA": unsupported.append(f"fuel '{s.fuel}': model trained only on cast PMMA rods")
    if s.gravity_g > 0.01: unsupported.append("gravity > 0: model trained on ISS microgravity only; 1g data is shown as observed comparison, not predicted")
    if s.pressure_psi is not None: unsupported.append("pressure: not measured/varied in the NASA data, ignored")
    r = predict(s.o2_percent, s.opposed_flow_cm_s, s.rod_diameter_cm)
    r["confidence"] = "Low" if (not r["in_training_range"] or unsupported) else "Medium"
    return {
        "modelPrediction": {"predictedSpreadRate_mm_s": r["predicted_spread_rate_mm_s"], "approxRange_mm_s": r["range_mm_s"],
                            "valueType": "model_prediction", "model": r["model"]},
        "peakTemperature": {"available": False, "reason": "Temperature was not measured in the BASS-II spread-rate tables."},
        "confidence": r["confidence"], "evidenceStatus": "Limited (52 ISS tests, 19 samples)",
        "warnings": r["warnings"], "unsupportedInputs": unsupported,
        "risk": qualitative_risk(s.o2_percent, s.opposed_flow_cm_s, r),
        "source": r["source"]}
