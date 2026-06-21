#!/bin/sh
set -e
MISSING=""
if [ -n "${MISSING}" ]; then
  echo "ERROR: Missing required environment variables:${MISSING}" >&2
  exit 1
fi
exec "$@"
