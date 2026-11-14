"""Load the saved model and predict spread rate for one scenario, with out-of-range warnings.
Run from the repo root: python -m backend.ai.ml.predict --o2 18.5 --flow 2 --diameter 0.64"""
import argparse, joblib, sklearn
import pandas as pd
from .config import MODELS

_BUNDLE = None
def _load():
    global _BUNDLE
    if _BUNDLE is None:
        path = MODELS / "flame_spread_model.joblib"
        bundle = joblib.load(path) if path.exists() else None
        # A pickled model is only guaranteed to load with the scikit-learn version that saved it.
        # If that differs (or the file is missing), retrain from the bundled dataset (takes ~seconds).
        if bundle is None or bundle.get("sklearn_version") != sklearn.__version__:
            from .train_model import train
            print("[ml] retraining model for scikit-learn", sklearn.__version__)
            train()
            bundle = joblib.load(path)
        _BUNDLE = bundle
    return _BUNDLE

def predict(o2_percent: float, opposed_flow_cm_s: float, rod_diameter_cm: float) -> dict:
    b = _load()
    x = pd.DataFrame([[o2_percent, opposed_flow_cm_s, rod_diameter_cm]], columns=b["features"])
    p = max(float(b["model"].predict(x)[0]), 0.0)
    sd = b["cv_residual_sd_mm_s"]
    warnings = []
    for col, v in zip(b["features"], x.iloc[0]):
        lo, hi = b["train_ranges"][col]
        if not lo <= v <= hi:
            warnings.append(f"{col}={v} is outside the NASA training range [{lo}, {hi}]: extrapolation, not supported by data.")
    # coverage check: the experiment did not test every O2/flow combination for every rod diameter
    nearest = min(b["per_diameter_ranges"], key=lambda d: abs(float(d) - rod_diameter_cm))
    pr = b["per_diameter_ranges"][nearest]
    for col in ("o2_percent", "opposed_flow_cm_s"):
        v = x.iloc[0][col]; lo, hi = pr[col]
        if not lo <= v <= hi and not any("outside the NASA training range" in w and col in w for w in warnings):
            warnings.append(f"No NASA test for rod d~{nearest} cm covers {col}={v} (tested {lo}-{hi}); prediction is interpolation between other diameters.")
    return {"value_type": "model_prediction", "predicted_spread_rate_mm_s": round(p, 4),
            "approx_uncertainty_mm_s": round(sd, 4),            # 1 std. dev. of leave-one-sample-out CV error
            "range_mm_s": [round(max(p - sd, 0), 4), round(p + sd, 4)],
            "in_training_range": not warnings, "warnings": warnings,
            "model": b["model_name"], "source": b["source"]}

if __name__ == "__main__":
    a = argparse.ArgumentParser()
    a.add_argument("--o2", type=float, required=True); a.add_argument("--flow", type=float, required=True)
    a.add_argument("--diameter", type=float, required=True)
    r = a.parse_args(); print(predict(r.o2, r.flow, r.diameter))
