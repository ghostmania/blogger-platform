#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
cluster_dir="$(mktemp -d /tmp/blogger-typeorm-pg.XXXXXX)"
cleanup() {
  pg_ctl -D "$cluster_dir/data" -m immediate stop >/dev/null 2>&1 || true
}
trap cleanup EXIT
initdb -D "$cluster_dir/data" --auth=trust -U postgres >"$cluster_dir/init.log"
pg_ctl -D "$cluster_dir/data" -l "$cluster_dir/server.log" -o "-h '' -k $cluster_dir -p 55440" -w start
cd "$project_dir"
export TEST_DATABASE_URL="postgresql://postgres@localhost/postgres?host=$cluster_dir&port=55440"
export TEST_DATABASE_SSL=false
node_modules/.bin/jest --config test/jest-e2e.json --runInBand "$@"
