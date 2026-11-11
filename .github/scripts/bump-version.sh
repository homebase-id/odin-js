#!/usr/bin/env bash
# Bump the prerelease version of a workspace until it is not yet published on the registry.
# A failed earlier run can leave a version published while package.json on main still has the old one.
set -euo pipefail
dir="$1"
name=$(node -p "require('./$dir/package.json').name")
while :; do
  npm version prerelease --no-git-tag-version --w "./$dir"
  version=$(node -p "require('./$dir/package.json').version")
  if [ -z "$(npm view "$name@$version" version 2>/dev/null)" ]; then break; fi
  echo "$name@$version already published, bumping again"
done
