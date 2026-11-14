"""Transparent, rule-based qualitative risk indicators. NOT a 0-100 score and NOT ML.
Hazard is separated from evidence confidence. Rules cite findings reported in Link et al. 2018."""

def qualitative_risk(o2, flow, pred):
    indicators = []
    if o2 <= 18.5:
        indicators.append({"valueType": "experimentally_observed_finding",
            "text": "At 1g flames on PMMA rods could not be sustained at or below ~18% O2, but in microgravity spread was observed down to ~17% (Link et al. 2018): lower O2 does not guarantee safety in microgravity."})
    if flow < 1.0:
        indicators.append({"valueType": "experimentally_observed_finding",
            "text": "No spread was seen below ~0.6 cm/s opposed flow; flames at very low flow were weak (blue) but can strengthen if airflow rises (BASS-II)."})
    if o2 >= 20:
        indicators.append({"valueType": "derived_rule", "text": "O2 near normal air (>=20%): spread observed in every ISS test in this range."})
    # hazard: relative to the range of NASA-observed spread rates (derived from data, not invented thresholds)
    p = pred["predicted_spread_rate_mm_s"]
    level = "Higher within tested range" if p >= 0.0625 else "Moderate within tested range" if p >= 0.0463 else "Lower within tested range"
    return {"hazardIndicator": level,
            "hazardBasis": "Predicted spread rate compared with terciles of the 52 NASA-observed ISS spread rates (cut points 0.0463 and 0.0625 mm/s; observed range 0.02-0.10). Relative, not an absolute safety rating.",
            "evidenceConfidence": "Low" if not pred["in_training_range"] else "Medium",
            "indicators": indicators}
