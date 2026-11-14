"""Shared paths and constants."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "dataset" / "raw"
PROCESSED = ROOT / "dataset" / "processed"
MODELS = ROOT / "models"
RESULTS = ROOT / "results"
TARGET = "spread_rate_mm_s"
GROUP = "sample_id"          # one physical PMMA sample -> never split across train/test
FEATURES = ["o2_percent", "opposed_flow_cm_s", "rod_diameter_cm"]
SOURCE = ("Link, Huang, Fernandez-Pello, Olson, Ferkul (2018) Sci. Rep. 8:120, "
          "doi:10.1038/s41598-017-18398-4, Supplementary Tables S1/S2 (NASA BASS-II, PSI-25). CC BY 4.0")
