"""Compare simple models with leave-one-SAMPLE-out cross-validation, keep the best, save it.
Run: python ml/train_model.py"""
import joblib, json
import numpy as np, pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.model_selection import LeaveOneGroupOut, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error
from config import PROCESSED, MODELS, RESULTS, TARGET, GROUP, FEATURES, SOURCE
from feature_engineering import build_features

def candidates():
    return {
        "Baseline (mean)": DummyRegressor(strategy="mean"),
        "Linear regression": make_pipeline(StandardScaler(), LinearRegression()),
        "Ridge": make_pipeline(StandardScaler(), Ridge(alpha=1.0)),
        "Random Forest": RandomForestRegressor(n_estimators=300, min_samples_leaf=2, random_state=42),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=150, max_depth=2, learning_rate=0.05, random_state=42),
    }

if __name__ == "__main__":
    MODELS.mkdir(exist_ok=True); RESULTS.mkdir(exist_ok=True)
    df = pd.read_csv(PROCESSED / "microgravity_clean.csv")
    X, y, groups = build_features(df), df[TARGET], df[GROUP]
    cv = LeaveOneGroupOut()                      # each fold holds out ALL rows of one physical sample
    preds, rmse = {}, {}
    for name, model in candidates().items():
        preds[name] = cross_val_predict(model, X, y, groups=groups, cv=cv)
        rmse[name] = float(np.sqrt(mean_squared_error(y, preds[name])))
        print(f"{name:20s} LOSO-CV RMSE = {rmse[name]:.4f} mm/s")
    real = {k: v for k, v in rmse.items() if k != "Baseline (mean)"}
    best = min(real, key=real.get)
    print(f"\nSelected model: {best}")
    out = df[["record_id", GROUP] + FEATURES + [TARGET]].copy()
    for k, v in preds.items(): out[f"pred_{k}"] = v
    out.to_csv(RESULTS / "cv_predictions.csv", index=False)
    final = candidates()[best].fit(X, y)         # final model fits ALL data; reported metrics come from CV only
    resid_sd = float(np.std(y - preds[best], ddof=1))
    joblib.dump({"model": final, "features": FEATURES, "model_name": best, "cv_residual_sd_mm_s": resid_sd,
                 "train_ranges": {c: [float(X[c].min()), float(X[c].max())] for c in FEATURES},
                 "per_diameter_ranges": {str(d): {"o2_percent": [float(g.o2_percent.min()), float(g.o2_percent.max())], "opposed_flow_cm_s": [float(g.opposed_flow_cm_s.min()), float(g.opposed_flow_cm_s.max())]} for d, g in df.groupby("rod_diameter_cm")},
                 "n_rows": int(len(df)), "n_samples": int(groups.nunique()), "source": SOURCE},
                MODELS / "flame_spread_model.joblib")
    json.dump({"selected": best}, open(RESULTS / "selected_model.json", "w"))
    print("Saved models/flame_spread_model.joblib")
