#!/bin/bash
set -e

cd "$(dirname "$0")/../server"

rm -rf out
mkdir -p out/util out/shellcheck out/shfmt

# Transpile root level files
for f in src/*.ts; do
  if [ -f "$f" ] && [ "${f%.d.ts}" = "$f" ]; then
    bun build "$f" --target node --outfile "out/$(basename $f)" --no-bundle --watch &
  fi
done

# Transpile util files
for f in src/util/*.ts; do
  if [ -f "$f" ]; then
    bun build "$f" --target node --outfile "out/util/$(basename $f)" --no-bundle --watch &
  fi
done

# Transpile shellcheck files
for f in src/shellcheck/*.ts; do
  if [ -f "$f" ]; then
    bun build "$f" --target node --outfile "out/shellcheck/$(basename $f)" --no-bundle --watch &
  fi
done

# Transpile shfmt files
for f in src/shfmt/*.ts; do
  if [ -f "$f" ]; then
    bun build "$f" --target node --outfile "out/shfmt/$(basename $f)" --no-bundle --watch &
  fi
done

# Copy shell script
cp src/get-options.sh out/

wait