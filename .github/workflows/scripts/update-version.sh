#!/usr/bin/env bash
set -euo pipefail

# update-version.sh
# Update version in package.json (for release artifacts only)
# Usage: update-version.sh <version>

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

VERSION="$1"

# Remove 'v' prefix for npm versioning
NPM_VERSION=${VERSION#v}

if [ -f "package.json" ]; then
  # Use Node.js to update package.json version (cross-platform safe)
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.version = '$NPM_VERSION';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
  echo "Updated package.json version to $NPM_VERSION"
else
  echo "Warning: package.json not found, skipping version update"
fi
