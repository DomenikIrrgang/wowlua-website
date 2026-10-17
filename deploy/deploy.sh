#!/usr/bin/env bash
# Installed on the droplet as /usr/local/bin/wowlua-deploy (root-owned).
# CI reaches it through the deploy user's forced SSH command, so the only
# input it accepts is an image tag: <site sha>-<wowlua sha>-<release tag|none>.
set -euo pipefail

tag="${1:-}"
if [[ ! "$tag" =~ ^[0-9a-f]{12}-[0-9a-f]{12}-(v[0-9]+\.[0-9]+\.[0-9]+[A-Za-z0-9.-]*|none)$ ]]; then
  echo "usage: wowlua-deploy <site sha12>-<wowlua sha12>-<release tag|none>" >&2
  exit 64
fi

exec 9>/run/lock/wowlua-deploy.lock
flock -w 300 9

cd /opt/wowlua
previous="$(sed -n 's/^IMAGE_TAG=//p' .env 2>/dev/null || true)"

export IMAGE_TAG="$tag"
docker compose pull --quiet wowlua-app
if docker compose up -d --wait --wait-timeout 120; then
  printf 'IMAGE_TAG=%s\n' "$tag" > .env
  docker image prune -af >/dev/null
  echo "deployed $tag"
  exit 0
fi

echo "deploy of $tag did not become healthy" >&2
if [[ -n "$previous" ]]; then
  echo "rolling back to $previous" >&2
  IMAGE_TAG="$previous" docker compose up -d --wait --wait-timeout 120 || true
fi
exit 1
