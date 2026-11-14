"""Compute MAE / RMSE / R2 / MAPE from the cross-validated predictions.
Run: python ml/evaluate_model.py"""
import json
import numpy as np, pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from config import RESULTS, TARGET

def metrics(y, p):
    return {"MAE_mm_s": mean_absolute_error(y, p), "RMSE_mm_s": float(np.sqrt(mean_squared_error(y, p))),
            "MSE": mean_squared_error(y, p), "R2": r2_score(y, p),
            "MAPE_pct": float(np.mean(np.abs((y - p) / y)) * 100)}

if __name__ == "__main__":
    cv = pd.read_csv(RESULTS / "cv_predictions.csv")
    rows = {c[5:]: metrics(cv[TARGET], cv[c]) for c in cv.columns if c.startswith("pred_")}
    table = pd.DataFrame(rows).T.round(6)
    table["accuracy_pct (100-MAPE)"] = (100 - table["MAPE_pct"]).round(1)
    table.to_csv(RESULTS / "model_comparison.csv")
    print(table.to_string())
    sel = json.load(open(RESULTS / "selected_model.json"))["selected"]
    base = table.loc["Baseline (mean)"]; best = table.loc[sel]
    print(f"\nSelected: {sel}\n  RMSE improvement over baseline: {(1 - best.RMSE_mm_s / base.RMSE_mm_s) * 100:.1f}%")
    print(f"  R2 = {best.R2:.3f} (0 = no better than predicting the mean)")
