#!/usr/bin/env bash
# Restart the detached `dsh web` process so a changed plugin client bundle is
# re-read from disk. It keeps the exact argv of the running process and starts
# the new one in its own session, so it survives the caller going away.
set -euo pipefail

PATTERN='dsh web --host 127.0.0.1 --port 3080'
find_pid() {
  local pid
  for pid in $(pgrep -f "$PATTERN" || true); do
    [ "$(cat "/proc/${pid}/comm" 2>/dev/null)" = "node" ] || continue
    echo "$pid"
    return 0
  done
  return 1
}

OLD=$(find_pid || true)
if [ -z "${OLD}" ]; then
  echo "no running dsh web process found" >&2
  exit 1
fi

CMD=$(tr '\0' ' ' < "/proc/${OLD}/cmdline")
echo "old pid: ${OLD}"
echo "argv:    ${CMD}"

kill "${OLD}"
for _ in $(seq 1 60); do
  kill -0 "${OLD}" 2>/dev/null || break
  sleep 0.25
done
if kill -0 "${OLD}" 2>/dev/null; then
  echo "process ${OLD} did not exit; aborting" >&2
  exit 1
fi

# shellcheck disable=SC2086
setsid nohup ${CMD} >>/tmp/dsh-web-restart.log 2>&1 < /dev/null &
sleep 3

NEW=$(find_pid || true)
if [ -z "${NEW}" ]; then
  echo "restart failed; see /tmp/dsh-web-restart.log" >&2
  tail -n 30 /tmp/dsh-web-restart.log >&2 || true
  exit 1
fi

echo "new pid: ${NEW}"
for _ in $(seq 1 40); do
  if curl -s -o /dev/null -m 2 http://127.0.0.1:3080/; then
    echo "dsh web answers on 127.0.0.1:3080"
    exit 0
  fi
  sleep 0.5
done
echo "dsh web started but the port is not answering yet; see /tmp/dsh-web-restart.log" >&2
exit 1
