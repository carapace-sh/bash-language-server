#!/usr/bin/env bash

set -euo pipefail

source ./scripts/tag-release.inc

version=$(cat server/package.json | jq -r .version)
tag="server-${version}"

publishedVersion=$(npm view bash-language-server version)

if [ "$version" = "$publishedVersion" ]; then
    echo "Newest server version is already deployed."
    exit 0
fi

bun run clean
bun install
bun run verify:bail

cd server
npm publish
# npm publish --tag beta # for releasing beta versions
tagRelease $tag