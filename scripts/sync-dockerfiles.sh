#!/bin/sh
# Regenerate per-service Dockerfiles from the main one.
sed "\$ s/^FROM web\$/FROM worker/" Dockerfile > Dockerfile.worker
sed "\$ s/^FROM web\$/FROM cron/" Dockerfile > Dockerfile.cron
