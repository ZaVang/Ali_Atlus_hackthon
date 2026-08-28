# Iteration 2 Plan

## 本轮目标

消除“确定性选择”和“Agent 对基线方案的证据评估”之间最后的语义混淆，并完成缓存语义、现场文案、豁免评分与移动可读性的诚信闭环。视频仍明确排除，且不会以任何形式作为补分缺口。

## 本轮任务（按依赖顺序）

1. **分离确定性推荐与具名 baseline Agent evidence**
   - 为什么：AK707 的确定性结果与未标明归属的 AK727/115 分钟解释仍出现在同一语义容器，评委会合理地把它读成一次计算错误。
   - 目标：确定性 recommendation 与 Receipt 保持独立、主导；Agent evidence 默认折叠，并清楚标示其评估的具名 baseline 候选。Agent 的 fit、置信度、理由与下一步仅解释该 baseline，不被误读为最终推荐的属性。
   - 验收：默认 shortest-start、新鲜运行、先选择 buffered、以及 buffered 完成 replay 都没有候选/分钟/归属混读；默认屏幕不会把 AK707 和无标签 115 分钟解释放进同一 recommendation 块。

2. **淘汰 pre-change v5 cache 的旧语义**
   - 为什么：安全形状校验不能迁移自由文本的业务归属；旧缓存会让已修复的 ownership 语言在用户浏览器中复活。
   - 目标：旧 v5 research cache 一律不参与当前流程；当前语义有明确、独立的版本身份，并继续遵守既有时效与来源安全边界。
   - 验收：预置且未过期的 v5 记录会被忽略并触发新研究；当前版本的有效记录可以命中且正确标示缓存来源；不因迁移放宽任何安全或时效规则。

3. **统一 Agent 只查证据、确定性比较作选择的全流程文案**
   - 为什么：CTA、loading、空态与资料仍暗示 Agent 选择行程，和真实职责及产品治理承诺相冲突。
   - 目标：所有用户可见状态和评委材料准确表达：Agent 检查/解释 transfer evidence，确定性比较选择最终候选；同时保留 Agent 的证据检索、time-fit assessment 与解释职责。
   - 验收：主行动、加载、空态、失败态、mock 状态与评委材料不再称 Agent 为最终 itinerary chooser；验收门禁正向保护新合同并拒绝旧 ownership 表述。

4. **让 WAIVED video 与评分缺口完全一致**
   - 为什么：已被豁免的视频若仍显示为 `+4` gap，会使单一证据合同失去可信度，并错误地把排除事项计入 95 分差距。
   - 目标：视频保持 `WAIVED`、可见且零评分影响；评分缺口只反映仍会影响本次四维分数的真实未满足项目。
   - 验收：当 video-recording 为 `WAIVED` 时，门禁与评分输出均不生成视频加分或 gap 项；视频不被改写为 PASS、CLOSED 或本轮任务。

5. **390px policy source link 的可读性与无溢出并存**
   - 为什么：宽度门禁通过而 source 逐字竖排仍会损害移动 Demo 的实际可用性。
   - 目标：移动 Lab 的 policy source link 保持可读的完整词/独立行表现，同时初始页、推荐、完成 replay 与 Lab 结果继续没有横向页面溢出。
   - 验收：390px Lab screenshot 与 DOM 证据证明 source link 未逐字断行；四个关键状态持续满足 `document.documentElement.scrollWidth <= document.documentElement.clientWidth`。

## 采纳的 Reviewer 改进项

- 接受：将 deterministic choice/Receipt 与具名 baseline 的 Agent evidence 分离，且 evidence 默认折叠。
- 接受：旧 v5 cache 的硬失效与新语义版本边界。
- 接受：CTA、loading、空态和资料的 Agent evidence-only 叙事。
- 接受：WAIVED video 不再构成 `+4` 或任何评分缺口，并以门禁保护。
- 接受：390px source link 可读性与 no-overflow 的双重验收。

## 相关 pitfalls

- Provider honesty、Atlas boundary 与 No fake probability：不改变 mock/live/snapshot/unavailable 边界，不借文案修复伪造实时状态、恢复能力或概率。
- Candidate identity 与 Counterfactual wording：所有候选属性保持具名归属，Receipt 继续只是确定性反事实比较。
- Video waiver：豁免保持可见但零评分影响，录制仍不在本轮范围。
- Shared worktree 与 Windows：只处理本轮必要变更，保留并发改动，验收使用 `npm.cmd`。

## 验收命令

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
