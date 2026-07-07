#!/usr/bin/env sh
set -e

cd ${ZIPLINE_ROOT:-/zipline}
exec node --enable-source-maps build/ctl/index.js "$@"

