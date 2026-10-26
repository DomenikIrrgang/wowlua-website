#!/usr/bin/env bash
# Installed on the droplet as /usr/local/bin/wowlua-deploy (root-owned).
# CI reaches it through the deploy user's forced SSH command, so the only
# input it accepts is an image tag:
#   <site sha12>-<wowlua sha12>-<release tag|none>   the site (wowlua-app)
#   registry-<wowlua sha12>                          the registry (wowlua-registry)
set -euo pipefail

arg="${1:-}"
if [[ "$arg" =~ ^[0-9a-f]{12}-[0-9a-f]{12}-(v[0-9]+\.[0-9]+\.[0-9]+[A-Za-z0-9.-]*|none)$ ]]; then
  key=IMAGE_TAG service=wowlua-app tag="$arg"
elif [[ "$arg" =~ ^registry-([0-9a-f]{12})$ ]]; then
  key=REGISTRY_TAG service=wowlua-registry tag="${BASH_REMATCH[1]}"
else
  echo "usage: wowlua-deploy <site sha12>-<wowlua sha12>-<release tag|none>" >&2
  echo "       wowlua-deploy registry-<wowlua sha12>" >&2
  exit 64
fi

exec 9>/run/lock/wowlua-deploy.lock
flock -w 300 9

cd /opt/wowlua
touch .env

# Sets one key of .env and keeps the others (the other service's tag,
# COMPOSE_PROFILES).
set_env() {
  { grep -v "^$1=" .env || true; printf '%s=%s\n' "$1" "$2"; } > .env.new
  mv .env.new .env
}

previous="$(sed -n "s/^$key=//p" .env)"
if [[ "$service" == wowlua-registry ]]; then
  # (the site's deploys roll the registry too: neither case fails them)
  if ! grep -qx 'COMPOSE_PROFILES=.*registry.*' .env; then
    echo "the registry is not set up (no COMPOSE_PROFILES=registry in /opt/wowlua/.env); skipped"
    exit 0
  fi
  if [[ "$tag" == "$previous" ]] && docker compose ps --status running -q "$service" | grep -q .; then
    echo "$service $tag is deployed"
    exit 0
  fi
fi

export "$key=$tag"
docker compose pull --quiet "$service"
if docker compose up -d --wait --wait-timeout 120 "$service"; then
  set_env "$key" "$tag"
  docker image prune -af >/dev/null
  echo "deployed $service $tag"
  exit 0
fi

echo "deploy of $service $tag did not become healthy" >&2
if [[ -n "$previous" ]]; then
  echo "rolling back to $previous" >&2
  export "$key=$previous"
  docker compose up -d --wait --wait-timeout 120 "$service" || true
fi
exit 1
