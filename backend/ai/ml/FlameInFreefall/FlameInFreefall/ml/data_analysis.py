"""Describe the clean data so we know what the model can learn.
Run: python ml/data_analysis.py"""
import pandas as pd
from config import PROCESSED, RESULTS, TARGET, FEATURES

if __name__ == "__main__":
    RESULTS.mkdir(exist_ok=True)
    df = pd.read_csv(PROCESSED / "microgravity_clean.csv")
    out = "\n".join([
        "== Microgravity dataset summary ==", f"rows={len(df)}  samples={df.sample_id.nunique()}",
        df[FEATURES + [TARGET]].describe().round(4).to_string(), "",
        "Spearman correlation with spread rate:",
        df[FEATURES + [TARGET]].corr(method="spearman")[TARGET].round(3).to_string(), "",
        "Rows per rod diameter:", df.rod_diameter_cm.value_counts().to_string(), "",
        "Rows per sample (clusters):", df.groupby("sample_id").size().to_string()])
    (RESULTS / "data_summary.txt").write_text(out)
    print(out)
