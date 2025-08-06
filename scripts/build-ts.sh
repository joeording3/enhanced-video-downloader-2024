#!/bin/bash

# Build TypeScript files with esbuild

echo "Building TypeScript files..."

# Ensure dist directory exists
mkdir -p extension/dist

# Run TypeScript type checking
echo "Running TypeScript type checking..."
npx tsc --noEmit

# Build each module with esbuild
echo "Building with esbuild..."
npx esbuild extension/src/background.ts --bundle --format=esm --outfile=extension/dist/background.js
# Bundle content script as IIFE for content_scripts compatibility
npx esbuild extension/src/content.ts --bundle --format=iife --outfile=extension/dist/content.js
# Bundle YouTube enhance script as IIFE for content_scripts compatibility
npx esbuild extension/src/youtube_enhance.ts --bundle --format=iife --outfile=extension/dist/youtube_enhance.js
npx esbuild extension/src/popup.ts --bundle --format=esm --outfile=extension/dist/popup.js
npx esbuild extension/src/options.ts --bundle --format=esm --outfile=extension/dist/options.js
npx esbuild extension/src/history.ts --bundle --format=esm --outfile=extension/dist/history.js

# Copy other files if needed
echo "Copying static files..."
cp extension/ui/*.html extension/dist/
cp extension/ui/*.css extension/dist/

echo "TypeScript build complete!" 