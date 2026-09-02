#!/bin/bash
# Fetch latest experiment data from cmlpsiturk to local data_storage.
# Usage: ./fetch_dirfr.sh [table]
#   ./fetch_dirfr.sh          -> fetches the new dirFRU data (table "dirfru")
#   ./fetch_dirfr.sh dirfr    -> fetches the old data (table "dirfr")

set -e  # stop on any error

TABLE="${1:-dirfru}"
HOST="${HOST:-maint@cmlpsiturk.compmemlab.org}"
LOCAL_DIR=~/RecallInitiation2026/data/data_storage
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${TABLE}_trials_${TIMESTAMP}.csv"

mkdir -p "$LOCAL_DIR"

echo "Running fetch on ${HOST} for table '$TABLE'..."
ssh "$HOST" "python3 ~/fetch_table.py $TABLE"

echo "Copying CSV to local (compressed)..."
ssh "$HOST" "gzip -c ~/${TABLE}_trials.csv" | gunzip > "${LOCAL_DIR}/${FILENAME}"

echo "Done. Saved to ${LOCAL_DIR}/${FILENAME}"
echo "Rows: $(wc -l < "${LOCAL_DIR}/${FILENAME}")"