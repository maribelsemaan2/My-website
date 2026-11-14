# Flame in Freefall - ML component (NASA Space Apps 2026)

Predicts **opposed-flow flame spread rate (mm/s) over cast PMMA rods in microgravity** from O2 %, airflow (cm/s) and rod diameter (cm).

## Data (real NASA data, transcribed)
Link et al. (2018), *Sci. Rep.* 8:120, doi:10.1038/s41598-017-18398-4 - Supplementary Tables S1 (ISS microgravity, 52 rows / 19 samples)
and S2 (Earth 1g, 46 rows). Experiments are NASA **BASS-II** (PSI-25, DOI 10.60555/4qc4-de67). License CC BY 4.0 - cite the paper.
Tables were transcribed by hand from the PDF (`dataset/raw/build_csv.py`); one S2 cell is ambiguous (flagged in the `note` column).
The printed unit is Vf x 10^3 cm/s; we convert to mm/s (x0.01).

## Run
    pip install -r requirements.txt
    ./run_all.sh                      # preprocess -> analyse -> train -> evaluate -> charts
    python ml/predict.py --o2 18.5 --flow 2 --diameter 0.64
    uvicorn api.main:app --reload     # http://127.0.0.1:8000/docs

## Evaluation (leave-one-sample-out CV; see results/evaluation_report.txt)
Rows from the same physical sample are never split between train and test.

## What it can NOT do
No pressure, gravity-level, temperature, fuel-type or geometry (sheet) prediction: the data has none of these varied/measured.
Only 52 microgravity rows; flow above ~3 cm/s has 2 points. Treat results as a small-data demonstration.
