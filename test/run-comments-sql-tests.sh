#!/usr/bin/env bash
set -euo pipefail
# Use an ephemeral cluster so no existing database is touched.
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
cluster_dir="$(mktemp -d /tmp/blogger-comments-pg.XXXXXX)"
cleanup() {
  pg_ctl -D "$cluster_dir/data" -m immediate stop >/dev/null 2>&1 || true
}
trap cleanup EXIT
initdb -D "$cluster_dir/data" --auth=trust -U postgres >"$cluster_dir/init.log"
pg_ctl -D "$cluster_dir/data" -l "$cluster_dir/server.log" -o "-h '' -k $cluster_dir -p 55439" -w start
cd "$project_dir"
TEST_DATABASE_URL="postgresql://postgres@localhost/postgres?host=$cluster_dir&port=55439"
export TEST_DATABASE_URL
node_modules/.bin/jest --config test/jest-e2e.json --runInBand test/comments-likes-sql.e2e-spec.ts test/create-comment.e2e-spec.ts
