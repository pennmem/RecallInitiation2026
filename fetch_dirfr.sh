#!/bin/bash
# Fetch latest dirFR data from cmlpsiturk to local data_storage

set -e  # stop on any error

LOCAL_DIR=~/RecallInitiation2026/data/data_storage
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="dirfr_trials_${TIMESTAMP}.csv"

mkdir -p "$LOCAL_DIR"

echo "Running fetch on cmlpsiturk..."
ssh cmlpsiturk "source ~/miniconda3/etc/profile.d/conda.sh && conda 
activate prolific && python ~/fetch_dirfr.py"

echo "Copying CSV to local..."
scp cmlpsiturk:/home/maint/dirfr_trials.csv "${LOCAL_DIR}/${FILENAME}"

echo "Done. Saved to ${LOCAL_DIR}/${FILENAME}"
