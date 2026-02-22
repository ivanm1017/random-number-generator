#!/bin/bash

# Find the newest zip file in Downloads
LATEST_ZIP=$(ls -t ~/Downloads/*.zip | head -1)
PROJECT_DIR=$(pwd)

if [ -z "$LATEST_ZIP" ]; then
    echo "❌ Error: No zip file found in Downloads."
    exit 1
fi

echo "📦 Using latest download: $LATEST_ZIP"

# 1. Unzip
unzip -o "$LATEST_ZIP" -d ./temp_update

# 2. Move files
cp -R ./temp_update/* "$PROJECT_DIR/"

# 3. Cleanup
rm -rf ./temp_update
# Optional: Uncomment the next line if you want to auto-delete the zip after use
# rm "$LATEST_ZIP"

echo "✅ UI Updated from AI Studio!"

# Open the project in BBEdit for a quick look
bbedit .

# Show the status in terminal
git status
