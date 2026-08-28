# Hackathon 95-Point Sprint

## Product background

- Product: Connection Integrity Agent
- Goal: help a traveller choose an evidence-backed connection before purchase, then carry the same consented itinerary into an airline-side operational rehearsal.
- Local mock start: `npm run build:mock` then `npm run preview -- --host 127.0.0.1 --port 4173`
- Live boundary: Atlas `search.do` is read-only evidence; flight status, verify/book/payment/servicing, and any real itinerary change remain unavailable unless separately authorized and proven.
- Scoring contract: Innovation 30 / Feasibility 30 / Qoder 20 / Demo 20. Video recording is excluded from this sprint's score.

## Sprint objective

Raise the independently reproducible hackathon score from the 80/100 audit baseline to at least 95/100 by improving the core product outcome, narrative integrity, responsive demo hierarchy, and Qoder evidence without inventing live capability.

## Existing task list

The Planner will append Iteration 1 tasks from `docs/orch/product-audit-report.md` after reading the Scout feasibility report.

## Acceptance commands

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run build:mock
npm.cmd run verify
npm.cmd run smoke:server
npm.cmd run judge-preflight
npm.cmd run score
git diff --check
```

## Product acceptance gates

- The main recommendation and completed replay show candidate-specific values with no 115/185 mismatch.
- The visible resilience outcome is exactly: `$14.19` extra fare, `+70 min` buffer, `125 min` remaining for the buffered option, `55 min` counterfactual for the cheaper option, against the registered `60 min` published floor.
- The UI states that this is a deterministic replay/counterfactual, not a missed-connection probability, protected ticket, live flight status, or completed recovery.
- Primary user actions/results are visible before expanded Agent trace detail.
- At 390 px viewport width, `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.

## 第 1 轮追加任务（基于 Reviewer 审计）

- [x] 目标：将推荐候选身份固定为可审计的业务身份，使候选名称、票价、连接分钟、差额和推荐说明始终属于同一候选，且确定性合同拥有最终推荐。验收：主流程与回归检查中不存在 115/185 或候选/票价错配。
- [x] 目标：在旅客推荐与完成航司回放中展示同一份 Connection Resilience Receipt。验收：准确呈现 `$14.19`、`+70 min`、`125 min`、`55 min` 与 `60 min` published floor；明确这是 deterministic replay/counterfactual，不声称概率、实时状态、保护票、真实避险或已完成恢复。
- [x] 目标：重建 Demo 信息层级，使主行动、推荐和结果先于可展开的 Agent trace。验收：旅客、航司回放、Itinerary Lab 的关键完成态先见结果后见展开 trace，完整 provenance 与语义标签保持可用。
- [x] 目标：修复 390px 窄屏横向溢出且不隐藏内容。验收：初始页、推荐结果、完成回放和 Lab 结果均满足 `document.documentElement.scrollWidth <= document.documentElement.clientWidth`；该浏览器验收由主代理独立复验，未取得证据前不标 PASS。
- [x] 目标：建立 Qoder/scorecard 的单一、真实证据合同。验收：总分与分维度一致；自动化仅确认可复现证据；本机 IDE RepoWiki 标为 `LOCAL_PRESENT_IGNORED`，当前提交视觉素材为 `TRACKED_REPRODUCIBLE`，Qoder session/Quest/Canvas provenance 保持 `HUMAN_EXTERNAL`，不得靠硬编码分数伪造 95。

## 第 2 轮追加任务（基于 Reviewer Iteration 2 Addendum）

- [x] 目标：分离确定性推荐与具名 baseline 的 Agent evidence，且 evidence 默认折叠。验收：默认 shortest-start、新鲜运行、先选 buffered、completed buffered replay 均不将 AK707 与无标签 AK727/115-minute evidence 混为同一 recommendation。
- [x] 目标：硬失效 pre-change v5 research cache 并使用当前独立语义版本。验收：未过期 v5 记录被忽略并触发新研究；当前版本有效记录仍能正确命中且标示缓存来源，不放宽时效或来源安全规则。
- [x] 目标：统一 CTA、loading、空态、失败态、mock 状态与评委资料，准确说明 Agent 检查/解释 evidence，确定性比较选择候选。验收：门禁正向保护新合同并拒绝 Agent 是最终 itinerary chooser 的旧表述。
- [x] 目标：让 `WAIVED` video 对评分缺口保持零影响。验收：当 video-recording 为 `WAIVED` 时，门禁与评分输出均无视频 `+N` gap；视频不改为 PASS/CLOSED，仍不纳入本轮范围。
- [x] 目标：保证 390px policy source link 可读且没有横向溢出。验收：Lab source link 不逐字断行，且初始页、推荐、完成 replay、Lab 结果持续满足 `document.documentElement.scrollWidth <= document.documentElement.clientWidth`。
