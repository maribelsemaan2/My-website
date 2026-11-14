"""Turn raw columns into model inputs. Kept deliberately small (52 rows)."""
import pandas as pd
from config import FEATURES

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Physics-motivated inputs only: O2 %, opposed flow, rod diameter. No target-derived columns (no leakage)."""
    return df[FEATURES].astype(float).copy()
