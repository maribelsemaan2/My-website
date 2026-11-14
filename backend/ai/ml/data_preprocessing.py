"""Load the transcribed NASA BASS-II tables, validate them, save clean files.
Run from the repo root: python -m backend.ai.ml.data_preprocessing"""
import pandas as pd
from .config import RAW, PROCESSED, TARGET, FEATURES

def load_and_validate():
    ug = pd.read_csv(RAW / "bass2_microgravity_tableS1.csv")
    g1 = pd.read_csv(RAW / "ground_1g_tableS2.csv")
    rep = [f"S1 missing values per column:\n{ug.isna().sum().to_string()}"]
    bad = ug[(ug[TARGET] <= 0) | (~ug.o2_percent.between(10, 30)) | (ug.opposed_flow_cm_s <= 0)]
    rep.append(f"S1 physically invalid rows: {len(bad)}")
    rep.append(f"S1 duplicate-condition rows: {ug.duplicated(subset=['sample_id'] + FEATURES, keep=False).sum()}")
    # unit check: printed value x1e3 cm/s  ->  mm/s
    assert ((ug.vf_printed_x1e3_cm_s * 0.01 - ug[TARGET]).abs() < 1e-4).all()
    rep.append("Unit conversion check passed (printed x1e3 cm/s * 0.01 = mm/s)")
    rep.append(f"S2 rows: {len(g1)}; 'no flame spread' rows KEPT as outcome labels: {(g1.flame_spread_observed == 0).sum()}")
    return ug, g1, "\n\n".join(rep)

if __name__ == "__main__":
    PROCESSED.mkdir(exist_ok=True)
    ug, g1, rep = load_and_validate()
    ug.to_csv(PROCESSED / "microgravity_clean.csv", index=False)
    g1.to_csv(PROCESSED / "ground_1g_clean.csv", index=False)
    (PROCESSED / "preprocessing_report.txt").write_text(rep)
    print(rep)
    print(f"\nSaved {len(ug)} microgravity rows ({ug.sample_id.nunique()} samples) and {len(g1)} 1g rows.")
