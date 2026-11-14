"""Create the report charts. Every chart says whether it shows observed data or model output.
Run: python ml/visualize.py"""
import json
import numpy as np, pandas as pd, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.inspection import permutation_importance
from config import PROCESSED, RESULTS, TARGET, FEATURES
from predict import predict, _load

def save(fig, name): fig.tight_layout(); fig.savefig(RESULTS / name, dpi=140); plt.close(fig)

if __name__ == "__main__":
    cv = pd.read_csv(RESULTS / "cv_predictions.csv")
    sel = json.load(open(RESULTS / "selected_model.json"))["selected"]; pc = f"pred_{sel}"
    ug = pd.read_csv(PROCESSED / "microgravity_clean.csv"); g1 = pd.read_csv(PROCESSED / "ground_1g_clean.csv")
    # 1 actual vs predicted (cross-validated, held-out samples)
    fig, ax = plt.subplots(figsize=(5, 5)); ax.scatter(cv[TARGET], cv[pc], c="tab:red")
    lim = [0, cv[TARGET].max() * 1.1]; ax.plot(lim, lim, "k--", label="perfect")
    ax.set(xlabel="Observed spread rate (mm/s, NASA)", ylabel="Predicted (mm/s, held-out sample)",
           title=f"{sel}: leave-one-sample-out predictions"); ax.legend(); save(fig, "1_actual_vs_predicted.png")
    # 2 error distribution
    err = cv[pc] - cv[TARGET]; fig, ax = plt.subplots(figsize=(6, 4)); ax.hist(err, bins=14, color="tab:blue", edgecolor="k")
    ax.axvline(0, color="k"); ax.set(xlabel="Prediction error (mm/s)", ylabel="Count", title="Cross-validated error distribution")
    save(fig, "2_error_distribution.png")
    # 3 feature importance (permutation, on training data -> indicative only)
    b = _load(); imp = permutation_importance(b["model"], ug[FEATURES], ug[TARGET], n_repeats=30, random_state=0)
    fig, ax = plt.subplots(figsize=(6, 3.5)); ax.barh(FEATURES, imp.importances_mean, xerr=imp.importances_std, color="tab:green")
    ax.set(xlabel="Permutation importance (drop in R2)", title="Feature importance (model fit on all data)"); save(fig, "3_feature_importance.png")
    # 4 oxygen sweep (model output) + observed points
    o2 = np.linspace(16.8, 20.9, 40); fig, ax = plt.subplots(figsize=(6, 4))
    for d, c in [(0.64, "tab:red"), (0.95, "tab:orange"), (1.27, "tab:purple")]:
        ax.plot(o2, [predict(v, 1.7, d)["predicted_spread_rate_mm_s"] for v in o2], c=c, label=f"model, d={d} cm, flow 1.7 cm/s")
        s = ug[(ug.rod_diameter_cm == d) & ug.opposed_flow_cm_s.between(1.3, 2.2)]; ax.scatter(s.o2_percent, s[TARGET], c=c, s=18, edgecolor="k")
    ax.set(xlabel="O2 (%)", ylabel="Spread rate (mm/s)", title="Model prediction (lines) vs NASA ISS observations (dots)"); ax.legend(fontsize=7)
    save(fig, "4_oxygen_vs_spread.png")
    # 5 airflow sweep (model) + observed points
    fl = np.linspace(0.41, 7.55, 40); fig, ax = plt.subplots(figsize=(6, 4))
    for o, c in [(17.5, "tab:blue"), (18.5, "tab:green")]:
        ax.plot(fl, [predict(o, v, 0.64)["predicted_spread_rate_mm_s"] for v in fl], c=c, label=f"model, O2={o}%, d=0.64 cm")
        s = ug[(ug.rod_diameter_cm == 0.64) & ug.o2_percent.between(o - 0.5, o + 0.5)]; ax.scatter(s.opposed_flow_cm_s, s[TARGET], c=c, s=18, edgecolor="k")
    ax.set(xlabel="Opposed flow (cm/s)", ylabel="Spread rate (mm/s)", title="Model (lines) vs NASA ISS observations (dots)\nOnly 2 points above 3 cm/s: trend there is NOT well supported"); ax.legend(fontsize=7)
    save(fig, "5_airflow_vs_spread.png")
    # 6 gravity comparison: observed only, approx. matched flow (~2 cm/s)
    fig, axs = plt.subplots(1, 3, figsize=(12, 3.8), sharey=False)
    for ax, d in zip(axs, [0.64, 0.95, 1.27]):
        u = ug[(ug.rod_diameter_cm == d) & ug.opposed_flow_cm_s.between(1.3, 2.6)]; g = g1[(g1.rod_diameter_cm == d) & (g1.opposed_flow_cm_s == 2)]
        ax.scatter(u.o2_percent, u[TARGET], c="tab:red", label="ISS microgravity (observed)")
        ax.scatter(g.o2_percent, g.spread_rate_mm_s, marker="s", c="tab:gray", label="Earth 1g, 2 cm/s (observed)")
        for _, r in g[g.flame_spread_observed == 0].iterrows(): ax.scatter(r.o2_percent, 0, marker="x", c="k")
        ax.set(title=f"rod d = {d} cm", xlabel="O2 (%)"); axs[0].set_ylabel("Spread rate (mm/s); x = no spread at 1g")
    axs[0].legend(fontsize=7); fig.suptitle("Gravity comparison, observed NASA data (microgravity flow 1.3-2.6 cm/s vs 1g 2 cm/s)"); save(fig, "6_gravity_comparison.png")
    print("Saved 6 charts to results/")
