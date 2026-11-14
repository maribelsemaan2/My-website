# Flame in Freefall - ML component (NASA Space Apps 2026)

Predicts **opposed-flow flame spread rate (mm/s) over cast PMMA rods in microgravity** from O2 %, airflow (cm/s) and rod diameter (cm).
That is the whole scope: one number per scenario.

## Data (real NASA data, transcribed)
Link et al. (2018), *Sci. Rep.* 8:120, doi:10.1038/s41598-017-18398-4 - Supplementary Tables S1 (ISS microgravity, 52 rows / 19 samples)
and S2 (Earth 1g, 46 rows). Experiments are NASA **BASS-II** (PSI-25, DOI 10.60555/4qc4-de67). License CC BY 4.0 - cite the paper.
Tables were transcribed by hand from the PDF (`dataset/raw/build_csv.py`). The printed unit is Vf x 10^3 cm/s; we convert to mm/s (x0.01).

**Verified against the PDF** (re-checked programmatically from the PDF's text positions): all 52 S1 rows (flow, duration, Vf) match
verbatim, in the same order, and each row's sample, O2 and diameter fall in the right place in the table. The PDF's right-hand S1 column
header says "mm/s" while the left says "cm/s"; the values are consistent with the same unit, so we treat that header as a typo in the paper.
One S2 (1g) cell is ambiguous (flagged in the `note` column); S2 is not used for training.

## Run (from the repo root)
    pip install -r backend/ai/ml/requirements.txt
    backend/ai/ml/run_all.sh                         # preprocess -> analyse -> train -> evaluate -> charts
    python3 -m backend.ai.ml.predict --o2 18.5 --flow 2 --diameter 0.64
The model is also served by the main API (`./dev.sh`): `POST /api/predict`, `GET /api/ml/health` (docs at http://localhost:8000/docs).
The saved model is a pickle; if scikit-learn's version differs from the one that saved it, `predict.py` retrains automatically from the bundled data.

## Evaluation (leave-one-sample-out CV; see results/evaluation_report.txt)
Rows from the same physical sample are never split between train and test.
Gradient Boosting: RMSE 0.0137 mm/s vs 0.0199 for predicting the mean (31% lower), R2 = 0.47. The gap to Ridge (0.0156) is small with this little data.
Quote RMSE (with units) and R2; we deliberately do not report an "accuracy %".

## Risk indicators
`risk.py` is rule-based (not ML). The "relative spread rate" tier compares the prediction with terciles of the 52 observed spread rates.
It is a relative position within NASA's test results, **not a safety rating**.

## What it can NOT do
No pressure, gravity-level, temperature, fuel-type or geometry (sheet) prediction: the data has none of these varied/measured.
In particular there are **no Moon (0.16 g) or Mars (0.38 g) predictions**: the API returns `status: unsupported_gravity` instead of a number.
Only 52 microgravity rows; flow above ~3 cm/s has 2 points. Treat results as a small-data demonstration.
