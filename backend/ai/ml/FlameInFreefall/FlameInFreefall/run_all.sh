#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/ml"
python data_preprocessing.py
python data_analysis.py > /dev/null
python train_model.py
python evaluate_model.py | tee ../results/evaluation_report.txt
python visualize.py
