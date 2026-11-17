#!/usr/bin/env bash
# Start Learn & Lead on this computer with one command.
#
#   ./start.sh            development mode: live reload while you edit (http://localhost:5173)
#   ./start.sh --prod     production build + preview, exactly what gets deployed (http://localhost:4173)
#   PORT=3000 ./start.sh  use another port
#
# Your phone on the same Wi-Fi can open the "Phone" address printed at the end.
# Stop it with ./stop.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN="$ROOT/.run"
MODE="dev"
case "${1:-}" in
  ""|--dev) MODE="dev" ;;
  --prod) MODE="prod" ;;
  -h|--help) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) printf 'Unknown option: %s (use --dev or --prod)\n' "$1" >&2; exit 2 ;;
esac
if [[ "$MODE" == "prod" ]]; then PORT="${PORT:-4173}"; else PORT="${PORT:-5173}"; fi
URL="http://localhost:$PORT"
mkdir -p "$RUN"

say()  { printf '\033[1;36m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✔\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✘ %s\033[0m\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }
up()   { curl -fsS -o /dev/null "$URL/" 2>/dev/null; }

lan_ip() {
  local ip=""
  if have ipconfig; then ip="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"; fi
  if [[ -z "$ip" ]] && have hostname; then ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"; fi
  if [[ -z "$ip" ]] && have ip; then ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' || true)"; fi
  printf '%s' "$ip"
}

# Already running?
PID="$(cat "$RUN/server.pid" 2>/dev/null || true)"
if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
  ok "Learn & Lead is already running at $(cat "$RUN/url" 2>/dev/null || echo "$URL") (stop it with ./stop.sh)"
  exit 0
fi
if up; then die "Port $PORT is already in use by another program. Free it or run: PORT=5180 ./start.sh"; fi

# Node.js check (Vite 8 needs Node 20.19+ or 22.12+)
have node || die "Node.js is not installed. Install Node 22 LTS from https://nodejs.org and run ./start.sh again."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 20 )) || die "Node $(node -v) is too old. Install Node 22 LTS from https://nodejs.org."

cd "$ROOT"
if [[ ! -d node_modules || package-lock.json -nt node_modules/.package-lock.json ]]; then
  say "Installing dependencies (first run takes about a minute)…"
  npm ci --no-audit --no-fund >"$RUN/install.log" 2>&1 || die "npm install failed. See $RUN/install.log"
fi

say "Checking and compiling the question bank…"
node tools/build-bank.mjs >"$RUN/bank.log" 2>&1 || die "The question bank has errors. See $RUN/bank.log"
ok "$(grep -o 'Total questions: [0-9]*' "$RUN/bank.log" | tail -1) — all valid"

if [[ "$MODE" == "prod" ]]; then
  say "Building the production app…"
  node node_modules/vite/bin/vite.js build >"$RUN/build.log" 2>&1 || die "Build failed. See $RUN/build.log"
  CMD=(node node_modules/vite/bin/vite.js preview --host --port "$PORT" --strictPort)
else
  CMD=(node node_modules/vite/bin/vite.js --host --port "$PORT" --strictPort)
fi

say "Starting the server ($MODE mode)…"
nohup "${CMD[@]}" >"$RUN/server.log" 2>&1 &
echo $! >"$RUN/server.pid"
echo "$URL" >"$RUN/url"

for _ in $(seq 1 30); do up && break; sleep 1; done
if ! up; then
  PID="$(cat "$RUN/server.pid")"; kill "$PID" 2>/dev/null || true; rm -f "$RUN/server.pid" "$RUN/url"
  die "The server didn't start. Last lines of $RUN/server.log:
$(tail -n 15 "$RUN/server.log")"
fi

IP="$(lan_ip)"
echo
ok "Learn & Lead is running"
echo "   Computer: $URL"
[[ -n "$IP" ]] && echo "   Phone:    http://$IP:$PORT   (same Wi-Fi; allow the firewall prompt if asked)"
echo "   Mode:     $MODE$([[ "$MODE" == dev ]] && echo ' (live reload)')"
echo "   Logs:     $RUN/server.log"
echo "   Stop:     ./stop.sh"
