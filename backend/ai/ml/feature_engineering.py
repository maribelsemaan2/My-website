"""Turn raw columns into model inputs. Kept deliberately small (52 rows)."""
import numpy as np
import pandas as pd
from .config import FEATURES

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Physics-motivated inputs only: O2 %, opposed flow, rod diameter. No target-derived columns (no leakage)."""
    return df[FEATURES].astype(float).copy()


def engineer(X: pd.DataFrame) -> pd.DataFrame:
    """Model inputs used inside the smooth models' pipeline.
    log(flow) and log(flow)^2 let the model capture the rise-then-fall of spread rate with airflow
    (thermal vs chemical regime in microgravity) while staying a smooth curve. Needs no target values."""
    lf = np.log(X["opposed_flow_cm_s"].astype(float))
    return pd.DataFrame({"o2_percent": X["o2_percent"].astype(float), "log_flow": lf,
                         "log_flow_sq": lf ** 2, "rod_diameter_cm": X["rod_diameter_cm"].astype(float)})
