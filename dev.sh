#!/bin/bash
set -e

# Optimize images (resize + webp) before serving. Idempotent, so this is a
# no-op unless you've added or changed an image.
[ -d node_modules ] || npm install
node bin/thumbs.mjs

# Auto-fix internal links missing a trailing slash (avoids the /path -> /path/ 301).
node bin/check-links.mjs --fix

bundle exec jekyll serve --host 0.0.0.0  --watch --drafts
