#!/bin/bash
# Fetch latest experiment data from cmlpsiturk to local data_storage.
# Usage: ./fetch_dirfr.sh [table]
#   ./fetch_dirfr.sh          -> fetches the new dirFRU data (table "dirfru")
#   ./fetch_dirfr.sh dirfr    -> fetches the old data (table "dirfr")

set -e  # stop on any error

TABLE="${1:-dirfru}"
LOCAL_DIR=~/RecallInitiation2026/data/data_storage
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${TABLE}_trials_${TIMESTAMP}.csv"

mkdir -p "$LOCAL_DIR"

echo "Running fetch on cmlpsiturk for table '$TABLE'..."
ssh cmlpsiturk "python3 ~/fetch_table.py $TABLE"

echo "Copying CSV to local..."
scp "cmlpsiturk:/home/maint/${TABLE}_trials.csv" "${LOCAL_DIR}/${FILENAME}"

echo "Done. Saved to ${LOCAL_DIR}/${FILENAME}"
