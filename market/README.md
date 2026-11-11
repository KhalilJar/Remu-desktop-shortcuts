# 插件市场索引（market/index.json）

这个目录让插件能出现在 DSH 的「插件 → 发现」里。**它不是安装包**，只是一张清单：告诉市场「这个插件叫什么、长什么样、有哪些版本、每个版本对应仓库里的哪一个 commit」。

## 关键事实

- 市场**不读 Git 仓库本身**。它只读索引 JSON（默认连索引源都没有，得自己加）。
- 每个版本都**钉死到一个 40 位 commit SHA**。所以：仓库改了、推了，市场**不会**自己变；必须改索引。
- 索引缓存 **10 分钟**（`cacheTtlMs = 600000`），改完最多等 10 分钟才刷新。
- 安装时市场拼出来的地址长这样：
  `git+https://github.com/KhalilJar/Remu-desktop-shortcuts.git#<commit>`

## 发新版本的标准动作（三步）

1. 改 `package.json` 的 `version`，提交，推到 GitHub。
2. 跑一次刷新脚本：

   ```powershell
   node market/refresh.mjs
   ```

   它会读 `package.json` 的版本号、取当前 `HEAD` 的 commit、写入时间戳，
   把这一条 upsert 进 `market/index.json`（同一版本会覆盖，最多留 20 条，新的在前）。

   想手动指定 commit：

   ```powershell
   node market/refresh.mjs --commit <40位SHA>
   ```

   工作树有未提交改动时它**会拒绝执行**——因为钉住的必须是一个真的推上去的 commit，不是本地半成品。

3. 提交并推送 `market/index.json`。

## 为什么索引里现在写着 `REPLACE_WITH_PUSHED_COMMIT`

这是**故意**的。占位符不是合法 SHA，市场校验器会直接报错：

```
$.plugins[0].versions[0].source.commit must be a lowercase 40-hex-digit commit SHA
```

宁可响亮地失败，也不要悄悄装到错提交上。跑完第 2 步之后它就被替换成真实 SHA 了。

## 校验

索引加进「发现」时，DSH 会用自带的校验器检查它；字段写错会指出精确路径，例如
`$.plugins[0].versions[0].source.commit`。所以本地不必额外装工具，出错信息够定位。

## 给别人用 / 只给自己用

- **只给自己用**：在 DSH「插件 → 发现 → 添加索引源」里填索引地址即可：
  `https://raw.githubusercontent.com/KhalilJar/Remu-desktop-shortcuts/master/market/index.json`
- **让所有人看到**：需要往公共索引仓库提 PR，把这条 plugin 声明合进去。公共索引的维护者同样是靠你更新版本号来跟进，不会自动追踪仓库。

## 字段备忘（格式 1）

| 字段 | 要求 |
| --- | --- |
| `format` | 必须是数字 `1` |
| `title` / `description` | 字符串，或 `{ "en": "...", "zh": "..." }`，**必须含 `en`** |
| `icon` | 相对索引地址的路径、https 地址，或 ≤32 KiB 的 base64 `data:` |
| `versions[].version` | 严格 SemVer，不允许前导零 |
| `versions[].publishTimestamp` | 整数 Unix 秒 |
| `versions[].source` | `{ "type": "git", "url", "commit" }`，commit 必须 40 位小写十六进制 |
| `metadata.category` / `labels` | 只能引用顶层 `metadata` 里声明过的 id |

字段写错时校验器会指出精确路径，例如 `$.plugins[0].versions[0].source.commit`。
