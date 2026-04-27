#!/bin/bash
# deploy.sh — Run this from your couride repo root
set -e

if [ ! -d ".git" ]; then
  echo "Not in a git repo. cd into your couride repo first."
  exit 1
fi

git add index.html send.html drive.html ride.html admin.html CLAUDE.md 2>/dev/null || true
git add .
git commit -m "feat: navy theme, Google Places autocomplete, smoke test pages, auth fix"
git push origin main

echo "Pushed. Vercel deploying now — live in ~30s at couride.co"
