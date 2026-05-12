#!/bin/bash
# Pre-build: copy stock_cache JSON into api/ so Vercel can bundle it
set -e
cd "$(dirname "$0")/.."
mkdir -p api/_data
cp stock_cache/daily_quotes.json api/_data/daily_quotes.json
cp stock_cache/historical.json api/_data/historical.json
echo "✅ Copied stock_cache to api/_data/"
