#!/usr/bin/env bash
# Clone a target repo, build it (or treat it as static), and upload the result
# to R2 under build/<id>/. Writes status + logs to Upstash as it goes.
#
# This is the GitHub Actions equivalent of the old Deploy-service worker
# (buildProject + copyFinalDist), but it runs on a free, on-demand runner
# instead of an always-on VM, and the Actions queue replaces the Redis queue.
#
# Required env:
#   REPO_URL DEPLOY_ID
#   ENDPOINT ACCESS_KEY_ID SECRET_ACCESS_KEY          (Cloudflare R2)
#   UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN   (state/logs)
set -uo pipefail

BUCKET="skydeploy"
WORK="$(pwd)/work/${DEPLOY_ID}"

# --- Upstash REST helpers ----------------------------------------------------
redis() { # redis CMD ARG...
  local body args=()
  for a in "$@"; do args+=("$(printf '%s' "$a" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')"); done
  body="[$(IFS=,; echo "${args[*]}")]"
  curl -s -X POST "$UPSTASH_REDIS_REST_URL" \
    -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$body" >/dev/null
}
set_status() { redis HSET status "$DEPLOY_ID" "$1"; }
log() {
  local line="[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1"
  echo "$line"
  redis RPUSH "logs:${DEPLOY_ID}" "$line"
}

fail() { log "Build failed: $1"; set_status failed; exit 1; }
trap 'fail "unexpected error on line $LINENO"' ERR
set -E

# --- AWS CLI config for R2 ---------------------------------------------------
export AWS_ACCESS_KEY_ID="$ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"
S3="aws s3 --endpoint-url $ENDPOINT"

# --- Clone -------------------------------------------------------------------
set_status building
log "Build started for ${REPO_URL}"
rm -rf "$WORK"
mkdir -p "$WORK"
git clone --depth 1 "$REPO_URL" "$WORK" 2>&1 | while read -r l; do log "[git] $l"; done
[ -d "$WORK/.git" ] || fail "clone produced no repo"

# --- Detect project type (mirrors detectProjectType / isStaticProject) -------
is_static() {
  [ ! -f "$WORK/package.json" ] && return 0
  if [ -f "$WORK/index.html" ]; then
    node -e 'const p=require(process.argv[1]);process.exit(p.scripts&&p.scripts.build?1:0)' \
      "$WORK/package.json" && return 0
  fi
  return 1
}

OUTPUT_DIR=""
if is_static; then
  PROJECT_TYPE="static"
  OUTPUT_DIR="$WORK"
  log "Detected static project; skipping build step"
else
  PROJECT_TYPE="nodejs"
  log "Detected Node.js project; installing dependencies"
  ( cd "$WORK" && npm install ) 2>&1 | while read -r l; do log "[BUILD] $l"; done
  log "Running npm run build"
  ( cd "$WORK" && npm run build ) 2>&1 | while read -r l; do log "[BUILD] $l"; done
  if [ -d "$WORK/build" ]; then OUTPUT_DIR="$WORK/build";
  elif [ -d "$WORK/dist" ]; then OUTPUT_DIR="$WORK/dist";
  else fail "neither /build nor /dist exists after build"; fi
fi
log "Project type: ${PROJECT_TYPE}; output dir: ${OUTPUT_DIR#$WORK/}"

# --- Upload to R2 under build/<id>/ ------------------------------------------
log "Uploading to R2 (build/${DEPLOY_ID}/)"
$S3 sync "$OUTPUT_DIR" "s3://${BUCKET}/build/${DEPLOY_ID}/" \
  --exclude ".git/*" --exclude "node_modules/*" --no-progress \
  2>&1 | while read -r l; do log "[upload] $l"; done

set_status deployed
log "Deployment completed successfully!"
