#!/usr/bin/env bash
# Stop Learn & Lead started with ./start.sh. Your study progress is kept (it lives in your browser).
#   ./stop.sh          stop the server
#   ./stop.sh --clean  also delete logs and build output (.run, dist, dist-artifact)
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN="$ROOT/.run"

ok()  { printf '\033[1;32m✔\033[0m %s\n' "$*"; }
say() { printf '\033[1;36m▶\033[0m %s\n' "$*"; }

stop_pid() {
  local pid="$1"
  kill "$pid" 2>/dev/null || return 0
  for _ in $(seq 1 10); do kill -0 "$pid" 2>/dev/null || return 0; sleep 0.5; done
  kill -9 "$pid" 2>/dev/null || true
}

PID="$(cat "$RUN/server.pid" 2>/dev/null || true)"
if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
  say "Stopping Learn & Lead (pid $PID)…"
  stop_pid "$PID"
  ok "Server stopped"
else
  # Fallback: a server started by start.sh whose pid file was lost.
  STRAY="$(pgrep -f "$ROOT/node_modules/vite/bin/vite.js|node node_modules/vite/bin/vite.js" 2>/dev/null || true)"
  if [[ -n "$STRAY" ]]; then
    say "Stopping a Learn & Lead server without a pid file…"
    for p in $STRAY; do
      # only processes started from this project folder
      if [[ "$(readlink "/proc/$p/cwd" 2>/dev/null || lsof -a -p "$p" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')" == "$ROOT" ]]; then stop_pid "$p"; fi
    done
    ok "Server stopped"
  else
    ok "Learn & Lead wasn't running"
  fi
fi
rm -f "$RUN/server.pid" "$RUN/url"

if [[ "${1:-}" == "--clean" ]]; then
  rm -rf "$RUN" "$ROOT/dist" "$ROOT/dist-artifact"
  ok "Removed logs and build output"
fi
