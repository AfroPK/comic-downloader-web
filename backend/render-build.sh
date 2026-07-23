#!/usr/bin/env bash
# Exit on error
set -o errexit

# 1. Install Node dependencies
npm install

# 2. Define Puppeteer cache directory inside Render's persistent location
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

# 3. Create cache folder if it doesn't exist
mkdir -p $PUPPETEER_CACHE_DIR

# 4. Download Chrome executable directly into this cache
npx puppeteer browsers install chrome
