#!/usr/bin/env bash
# Checks whether the Peec.ai OpenAPI spec has changed since the last snapshot.
# Usage: bash scripts/check-api-drift.sh
# Exit code: 0 = no drift, 1 = drift detected or error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SNAPSHOT="$REPO_ROOT/api-spec/openapi-snapshot.json"
SPEC_URL="https://api.peec.ai/customer/v1/openapi/json"

if [ ! -f "$SNAPSHOT" ]; then
  echo "ERROR: Snapshot not found at $SNAPSHOT"
  echo "Run: curl -s $SPEC_URL -o $SNAPSHOT"
  exit 1
fi

TMPFILE="$(mktemp)"
trap 'rm -f "$TMPFILE"' EXIT

echo "Fetching current OpenAPI spec..."
if ! curl -sf "$SPEC_URL" -o "$TMPFILE"; then
  echo "ERROR: Failed to fetch spec from $SPEC_URL"
  exit 1
fi

# Normalize JSON (sort keys) for stable comparison
normalize() {
  python3 -c "import json,sys; json.dump(json.load(sys.stdin), sys.stdout, sort_keys=True, indent=2)" < "$1"
}

SNAP_NORM="$(mktemp)"
LIVE_NORM="$(mktemp)"
trap 'rm -f "$TMPFILE" "$SNAP_NORM" "$LIVE_NORM"' EXIT

normalize "$SNAPSHOT" > "$SNAP_NORM"
normalize "$TMPFILE" > "$LIVE_NORM"

if diff -q "$SNAP_NORM" "$LIVE_NORM" > /dev/null 2>&1; then
  echo "No API drift detected. Snapshot is up to date."
  exit 0
else
  echo "API DRIFT DETECTED! The OpenAPI spec has changed."
  echo ""
  echo "Summary of changes:"
  diff --unified=3 "$SNAP_NORM" "$LIVE_NORM" | head -80 || true
  echo ""
  echo "To update the snapshot:"
  echo "  curl -s $SPEC_URL -o $SNAPSHOT"
  echo "  Then review and update src/types.ts and tools as needed."
  exit 1
fi
