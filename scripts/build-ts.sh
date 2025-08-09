#!/usr/bin/env bash
set -euo pipefail

echo "Building TypeScript files..."

# Ensure dist directory exists and is clean
rm -rf extension/dist
mkdir -p extension/dist

# Run TypeScript type checking only (no emit)
echo "Running TypeScript type checking..."
npx tsc --project extension/tsconfig.json --noEmit

echo "Bundling with esbuild..."

# Common esbuild flags
ESBUILD_COMMON_FLAGS=(
  --bundle
  --platform=browser
  --target=es2020
  --sourcemap
)

# Service worker (MV3) must be ESM
npx esbuild extension/src/background.ts \
  "${ESBUILD_COMMON_FLAGS[@]}" \
  --format=esm \
  --outfile=extension/dist/background.js

# Content scripts should be IIFE
npx esbuild extension/src/content.ts \
  "${ESBUILD_COMMON_FLAGS[@]}" \
  --format=iife \
  --outfile=extension/dist/content.js

npx esbuild extension/src/youtube_enhance.ts \
  "${ESBUILD_COMMON_FLAGS[@]}" \
  --format=iife \
  --outfile=extension/dist/youtube_enhance.js

# Extension pages can be ESM
npx esbuild extension/src/popup.ts \
  "${ESBUILD_COMMON_FLAGS[@]}" \
  --format=esm \
  --outfile=extension/dist/popup.js

npx esbuild extension/src/options.ts \
  "${ESBUILD_COMMON_FLAGS[@]}" \
  --format=esm \
  --outfile=extension/dist/options.js

npx esbuild extension/src/history.ts \
  "${ESBUILD_COMMON_FLAGS[@]}" \
  --format=esm \
  --outfile=extension/dist/history.js

# Copy HTML and CSS assets
echo "Copying static files..."
node scripts/copy-html.js | cat
cp extension/ui/*.css extension/dist/

echo "TypeScript build complete!"
