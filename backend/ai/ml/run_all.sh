#!/usr/bin/env bash
# Rebuild everything: preprocess -> analyse -> train -> evaluate -> charts. Run from anywhere.
set -e
cd "$(dirname "$0")/../../.."          # repo root
python3 -m backend.ai.ml.data_preprocessing
python3 -m backend.ai.ml.data_analysis > /dev/null
python3 -m backend.ai.ml.train_model
python3 -m backend.ai.ml.evaluate_model | tee backend/ai/ml/results/evaluation_report.txt
python3 -m backend.ai.ml.visualize
