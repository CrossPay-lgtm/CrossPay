#!/usr/bin/env bash
# update_from_prompt.sh
# Usage: paste update content into updates/latest_update.txt then run this script.
set -e
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
UPDATES_DIR="$ROOT_DIR/updates"
LATEST="$UPDATES_DIR/latest_update.txt"

if [ ! -d "$UPDATES_DIR" ]; then
  mkdir -p "$UPDATES_DIR"
  echo "# Paste update instructions or file diff here" > "$LATEST"
  echo "Created updates/latest_update.txt — paste the changes and run the script again."
  exit 0
fi

if [ ! -f "$LATEST" ] || [ ! -s "$LATEST" ]; then
  echo "Please paste your update into $LATEST and run this script."
  exit 1
fi

echo "Reading updates..."
cat "$LATEST"
echo
read -p "Type a short commit message for this update: " CM
if [ -z "$CM" ]; then CM="AI update"; fi

# Simple parser: expect blocks like:
# --- FILE: path/to/file
# <file content>
# --- END
TMP_DIR=$(mktemp -d)
CUR="$PWD"
cd "$TMP_DIR"
awk '/^--- FILE: /{f=substr($0,11); next} /^--- END$/{f=""; next} { if(f!="") print > f }' "$LATEST"

# copy files into repo
echo "Applying files..."
rsync -av --exclude='.git' --ignore-existing . "$ROOT_DIR"/
rsync -av --exclude='.git' --update . "$ROOT_DIR"/

cd "$ROOT_DIR"
git add -A
git commit -m "$CM" || (echo "Nothing to commit" && exit 0)
git push origin HEAD
echo "Update applied and pushed."
