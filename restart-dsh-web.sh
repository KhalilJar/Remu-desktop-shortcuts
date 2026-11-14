#!/usr/bin/env bash
# 安全重启 systemd 托管的 dsh web（deepseek-harness.service）。
#
# 背景（2026-11-14 事故）：旧脚本 kill 掉主进程后，用 setsid nohup 拉起新进程。
# 当脚本本身跑在 DSH 会话里时，杀掉 dsh 会连带清掉脚本所在的 cgroup：
# 新进程没起来，而且 dsh 是以 exit 0 退出的，systemd 的 Restart=on-failure
# 把它当成「正常结束」不重启 —— 服务彻底消失，前端一直 502。
#
# 现在改成：一切交给 systemd；并且用 systemd-run 起一个瞬时 unit 去执行
# restart，这样即使从 DSH 会话内部调用，也不会被自己所在的 cgroup 清理掉。
set -euo pipefail

UNIT=deepseek-harness.service
PORT=3080
HEALTH="http://127.0.0.1:${PORT}/"

if [ "$(id -u)" -eq 0 ]; then SUDO=(); else SUDO=(sudo -n); fi

if ! "${SUDO[@]}" systemctl cat "$UNIT" >/dev/null 2>&1; then
  echo "找不到单元 $UNIT；请确认服务名。" >&2
  exit 1
fi

if grep -qs "$UNIT" /proc/self/cgroup 2>/dev/null; then
  echo "（当前进程就在 $UNIT 的 cgroup 内，改用瞬时 unit 重启，避免把自己一起杀掉）"
fi

echo "==> systemctl restart $UNIT"
if command -v systemd-run >/dev/null 2>&1; then
  "${SUDO[@]}" systemd-run --collect --quiet \
    --unit="dsh-restart-$(date +%s)" \
    --on-active=1 \
    systemctl restart "$UNIT"
else
  # 没有 systemd-run 时退化为直接重启；仅在 cgroup 外调用才安全。
  "${SUDO[@]}" systemctl restart "$UNIT"
fi

echo "==> 等待 ${HEALTH} 恢复（最多 60 秒）"
for _ in $(seq 1 60); do
  if curl -s -o /dev/null -m 2 "$HEALTH"; then
    echo "✅ 已恢复：$(systemctl is-active "$UNIT")，MainPID=$(systemctl show -p MainPID --value "$UNIT")"
    exit 0
  fi
  sleep 1
done

echo "❌ 60 秒内未恢复，最近日志：" >&2
"${SUDO[@]}" journalctl -u "$UNIT" -n 30 --no-pager >&2 || true
exit 1
