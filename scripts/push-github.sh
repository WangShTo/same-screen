#!/usr/bin/env bash
# 等用户在 GitHub 上建好空仓库 same-screen，然后自动加 remote 并推送。
set -u
REPO="WangShTo/same-screen"
API="https://api.github.com/repos/$REPO"
MAX=60          # 60 次
SLEEP=10        # 每次 10 秒 => 最多等 10 分钟

cd "$(dirname "$0")/.." || exit 1

echo "[push] 等待 $REPO 出现（最多 10 分钟）"
for i in $(seq 1 "$MAX"); do
  code=$(node -e "fetch('$API',{headers:{'user-agent':'same-screen'}}).then(r=>console.log(r.status)).catch(()=>console.log(0))")
  if [ "$code" = "200" ]; then
    echo "[push] 仓库已存在（第 $i 次探测）"
    break
  fi
  if [ "$i" = "$MAX" ]; then
    echo "[push] 超时：还没看到 $REPO，先不推"
    exit 2
  fi
  sleep "$SLEEP"
done

if git remote | grep -q '^origin$'; then
  git remote set-url origin "git@github.com:$REPO.git"
else
  git remote add origin "git@github.com:$REPO.git"
fi

git branch -M main
echo "[push] 推送中..."
if git push -u origin main 2>&1; then
  echo "[push] 完成：https://github.com/$REPO"
  exit 0
fi

echo "[push] 直推被拒（可能是仓库里已有 README），尝试 rebase 后再推"
git fetch origin || exit 3
git rebase origin/main || git rebase --abort
git push -u origin main && echo "[push] 完成：https://github.com/$REPO"
