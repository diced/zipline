#!/bin/sh

set -e

unset ZIPLINE_DOCKER_BUILD

node --enable-source-maps dist/index.js