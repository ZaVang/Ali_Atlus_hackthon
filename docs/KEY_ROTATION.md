# Credential Rotation Checklist / 凭据轮换清单

**Rule of thumb / 总原则:** once any submission material (repo snapshot, zip, video, hosted demo) leaves this machine, every credential it *could* have contained is treated as leaked and rotated immediately — whether or not a leak is proven. 任何材料（仓库快照、压缩包、视频、托管演示）一旦离开本机，其中*可能*包含的凭据一律视为已泄露并立即轮换，无论是否证实泄露。

This project keeps **all** secrets server-side (`server/` module, injected per request; never in the browser bundle). Three credential sets exist: DeepSeek/Bailian LLM, Tavily search, and ATRIP Sandbox. 本项目把**所有**密钥留在服务端（`server/` 模块按请求注入，绝不进浏览器产物）。共三套凭据：DeepSeek/Bailian LLM、Tavily 检索、ATRIP Sandbox。

## 1. Where the secrets live / 密钥存放位置

| Key 密钥 | env variable 环境变量 | Consumed by 使用方 |
| --- | --- | --- |
| DeepSeek (preferred) API key | `LLM_API_KEY` (+ `LLM_BASE_URL`, `LLM_MODEL`) | `server/logic.mjs` (chat + connection research) |
| Legacy Bailian/DashScope key (optional fallback) | `DASHSCOPE_API_KEY` (+ `DASHSCOPE_MODEL`, `DASHSCOPE_BASE_URL`) | same handler, legacy path |
| Tavily search key | `TAVILY_API_KEY` | `server/logic.mjs` (evidence search only) |
| ATRIP Sandbox client credentials | `ATLAS_BASE_URL`, `ATLAS_CLIENT_ID`, `ATLAS_CLIENT_SECRET` | `server/logic.mjs` (Atlas proxy) |

All values live only in `.env.local` at the repo root. `.gitignore` already excludes `.env`, `.env.local` and `.env.*.local`; `.env.example` ships with **every value empty** and must stay that way. 所有值只存放在仓库根目录的 `.env.local`。`.gitignore` 已排除 `.env`、`.env.local` 与 `.env.*.local`；`.env.example` 保持**全空值**提交，必须维持现状。

## 2. Rotation entry points / 轮换入口

Rotate in this order (issue new → swap `.env.local` → verify with `npm run smoke:server` / `npm run smoke:research` → revoke old). Descriptions only — no account identifiers are recorded anywhere in this repo. 按此顺序轮换（签发新密钥 → 更新 `.env.local` → 用 `npm run smoke:server` / `npm run smoke:research` 验证 → 吊销旧密钥）。以下仅为入口描述，仓库中不记录任何账户信息。

1. **DeepSeek:** DeepSeek open platform console → API Keys management page → create a new key → update `LLM_API_KEY` → delete/revoke the old key. (If the legacy Bailian path is used instead: Alibaba Cloud Bailian console → API-KEY management → recreate `DASHSCOPE_API_KEY` and revoke the old one.)
   **DeepSeek**：DeepSeek 开放平台控制台 → API Keys 管理页 → 新建密钥 → 更新 `LLM_API_KEY` → 吊销旧密钥。（若使用旧版 Bailian 通道：阿里云百炼控制台 → API-KEY 管理 → 重新签发 `DASHSCOPE_API_KEY` 并吊销旧值。）
2. **Tavily:** Tavily app console (app.tavily.com) → API keys section → generate a new key → update `TAVILY_API_KEY` → revoke the old key.
   **Tavily**：Tavily 控制台（app.tavily.com）→ API keys → 生成新密钥 → 更新 `TAVILY_API_KEY` → 吊销旧密钥。
3. **ATRIP Sandbox:** credentials are issued through the Atlas program — request a re-issue of client id/secret from the Atlas Sandbox administration channel you received them from, update `ATLAS_CLIENT_ID` / `ATLAS_CLIENT_SECRET`, then invalidate the old pair.
   **ATRIP Sandbox**：凭据经 Atlas 项目渠道签发——向原签发渠道申请重新下发 client id/secret，更新 `ATLAS_CLIENT_ID` / `ATLAS_CLIENT_SECRET`，并使旧凭据失效。

## 3. Pre-submission checklist / 提交外发前检查清单

Run every item before any external shipment. 任何外发前逐条执行。

1. **No env files in the material.** Confirm `.env.local` is absent from the shipped tree/zip and from any `git archive`/snapshot. `git status --ignored` must still list it as ignored.
   **材料中不含 env 文件。** 确认外发目录/压缩包、任何 `git archive`/快照中都不含 `.env.local`；`git status --ignored` 应仍显示其为被忽略文件。
2. **Grep the shipping tree for credential shapes** (never print matches from the real `.env.local` itself). Example, run inside the folder you are about to ship:
   **在外发目录中按密钥形状 grep**（绝不要对真实 `.env.local` 本身打印匹配结果）。示例，在即将外发的目录内执行：

   ```powershell
   # PowerShell; adjust patterns if key formats change
   Get-ChildItem -Recurse -File | Select-String -Pattern 'sk-[A-Za-z0-9]{20,}', 'tvly-[A-Za-z0-9-]{10,}', 'ATLAS_CLIENT_SECRET=.+'
   ```

   Any hit is a stop-the-line event: remove the file, then rotate per section 2 anyway. 任何命中都是停止线事件：移除该文件，并按第 2 节照常轮换。
3. **`dist/` and build artifacts are credential-free by design** (no secret carries a `VITE_` prefix, so Vite never bundles them), but still confirm the shipped `dist/` was produced from a clean tree and contains no copied `.env*` files.
   **`dist/` 与构建产物按设计不含密钥**（没有任何密钥带 `VITE_` 前缀，因此不会被 Vite 打包），仍需确认外发的 `dist/` 来自干净工作区且未被拷入任何 `.env*` 文件。
4. **Supporting material:** the curated `verify-screenshots/current/` bundle is tracked after secret review; legacy screenshots and `atrip-sample.json` remain ignored. Re-check any new asset for accidentally captured headers or environment values before adding it.
   **附属材料**：经密钥复核后的 `verify-screenshots/current/` 当前素材包已跟踪；legacy 截图与 `atrip-sample.json` 继续忽略。新增素材入库前仍须复查是否误录请求头或环境值。
5. **`.env.example` stays all-empty.** Diff it before shipping; it is the only env-shaped file allowed in submissions.
   **`.env.example` 保持全空。** 外发前 diff 一次；它是唯一允许出现在提交材料中的 env 形态文件。
6. **After shipment:** if there is any doubt about items 1–4, rotate all three credential sets immediately.
   **外发后**：对第 1–4 条有任何疑问，立即轮换全部三套凭据。
