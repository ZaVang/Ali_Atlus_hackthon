# Scout Report — Iteration 2

## A. 约束与可行性

- [I2-BASELINE] 默认 shortest-start 的 AK707 / 115 混块
  - 可行性：直接做展示层拆分；无需重写 receipt 算法或 Agent trace 状态机。
  - 理由：`receipt.recommendedKey` 和 consent 已稳定选择 `buffered`（AK707），但 `ContractVerdict` 的 fit badge、rationale、Why、confidence 和 nextAction 仍评估当前 `activeCandidate`。默认 active candidate 是 AK727 / 115 min，所以“Deterministic recommendation: AK707”、Tight badge与 115-minute 解释共享一个容器，语义仍像算错。
  - 对规划的建议：确定性 choice/Receipt 独立置顶；Agent 输出放入另一个默认折叠并点名 baseline 的块，例如 `Agent evidence for D73331 + AK727 · scheduled 115 min`。fit、confidence、rationale、Why 与 nextAction 全部留在 baseline 块内。不要把 Agent 文本改写成 AK707 的解释；按它实际收到的候选标注。

- [I2-CACHE] v5 research cache 语义迁移
  - 可行性：选择硬失效旧版本，直接升级 cache namespace/record semantics version；不要 normalize 旧自由文本。
  - 理由：prefix 仍是 `connection-integrity:research:v5:`。当前 whitelist 允许未知额外字段，`tests/whitelist.test.mjs` 还确认任意 `recommendedOption` 不影响通过，所以旧 v5 的 Agent-owned recommendationSummary/rationale 会继续被当作合法 cache brief。
  - 对规划的建议：使用新 namespace（例如 v6）并在 record 中要求精确语义版本；v5 一律不读。保留 TTL、whitelist 和 safe-source校验。验收预置一个未过期 v5 brief，证明页面忽略它并走 fresh mock/live；另测新版本 cache 可命中并显示 `fromCache`。

- [I2-COPY] CTA/research copy 仍说 Agent chooses
  - 可行性：直接修改 UI、mock copy、字符串门禁与相关 judge 文档。
  - 理由：按钮仍为 `Ask agent which itinerary to choose`，research-ready 文案仍说 Agent 回答 `which offer it recommends`。这与 deterministic receipt ownership 冲突；`scripts/judge-preflight.mjs` 和 `tests/preflight.test.mjs` 又把旧 CTA 固化为必需标签。
  - 对规划的建议：统一为“Agent checks/explains transfer evidence；deterministic comparison chooses”。同步 loading、空态、失败态和 mock `nextAction`，更新 preflight/verify 及直接引用旧 CTA 的文档。不要削掉 Agent 的真实职责：公开证据检索、time-fit assessment 与解释仍属于 Agent。

- [I2-VIDEO] final-audit 把 WAIVED video 继续列为 `+4` gap
  - 可行性：直接修 gap 输出并加 evidence-contract 回归。
  - 理由：`docs/JUDGE_EVIDENCE.json` 已把 `video-recording` 标为 `WAIVED`，scorecard 也写 no score effect；但 `scripts/final-audit.mjs` 仍手写 `+4 recorded...`。现有 preflight 只校验状态枚举，没有校验 WAIVED 不得进入加分 gap。
  - 对规划的建议：gap closure 从同一 evidence contract/filter 产生；WAIVED 可显示说明，但不得显示 `+N`。测试证明 `video-recording=WAIVED` 时 gap 无视频加分项。不要把 video 改成 PASS/CLOSED，也不必删除 recording-preflight 中与边界一致性相关的检查。

- [I2-MOBILE-LINK] 390px Lab policy source link 一字一行
  - 可行性：直接修 `PolicyPill` 局部 markup/CSS，不恢复横向溢出。
  - 理由：长 policy 文本和 `<a>source</a>` 同处通用 `.pill` inline-flex；390px 规则给 `.pill` 加 `overflow-wrap:anywhere`，flex 收缩时 link 被逐字折行。数据正确，问题是 anchor shrink/word breaking。
  - 对规划的建议：为 policy正文和 source link 增加专用子元素/class；正文正常换行，link 作为不可逐字收缩的 item，必要时窄屏单独占一行。保留 `scrollWidth <= clientWidth`，并增加 link 单行/足够宽度 DOM 证据与 390px Lab screenshot。不要使用全局 nowrap 或 `overflow-x:hidden`。

## B. 代码地图与坑

- [I2-BASELINE]
  - 相关文件：
    - `src/components/ConnectionIntegrityDemo.tsx`：`ContractVerdict` 是混块根因；`activeCandidate` 是 baseline 身份源，`receipt.recommended*` 是最终选择源。
    - `src/domain/connection-resilience.ts`、`tests/connection-resilience.test.mjs`：AK707、AK727 与 `$14.19 / +70 / 125 / 55 / 60` 的正确确定性合同，本轮无需改 ownership。
    - `src/providers/mock-agent.ts`：fresh brief 的 remaining/fit/rationale/keyFactors 基于 selected baseline，合理但必须被 UI 点名；`nextAction` 仍有旧推荐措辞。
    - `src/providers/bailian-agent.ts`、`server/logic.mjs`：live 合同已移除 `recommendedOption`，prompt 已声明 Agent explanation-only。
    - `scripts/verify-acceptance.mjs`：目前只检查无 `brief.recommendedOption`，不能发现 baseline badge/解释与 deterministic heading 仍共容器。
  - 现有数据流：默认 AK727/115 作为 selected baseline 送入 Agent → Agent返回 AK727 的 evidence assessment → receipt 独立选择 AK707 → consent 用 AK707。正确修复是分层显示，不是把 115 隐去。
  - 注意的坑：`FIT_COPY` badge 与 `fallbackFit` 都属于 baseline；不得用于给 AK707 receipt 着色。验收至少覆盖 default shortest fresh run、preseed v5、用户先选 buffered、booked buffered +60 replay。

- [I2-CACHE]
  - 相关文件：
    - `src/components/ConnectionIntegrityDemo.tsx`：`CONNECTION_RESEARCH_CACHE_PREFIX`、`CachedResearch`、read/write 与 researchKey 均在此；当前无显式 semantics version。
    - `src/providers/bailian-agent.ts`：whitelist 保证形状/安全，不拒绝额外旧字段。
    - `tests/whitelist.test.mjs`：`recommendedOption` 额外字段仍通过，证明 shape validation 不能迁移语义。
    - `scripts/verify-acceptance.mjs`：cache gate 只检查复用 whitelist，需增加新 namespace/version 和拒读 v5 的验收。
  - 现有数据流：localStorage v5 → whitelist → `setBrief`；一旦 cache 命中，不再经过新 server/mock 合同。
  - 注意的坑：删除旧字段不能修复旧 recommendationSummary/rationale；不要正则改写自由文本。升级版本时不得绕过 TTL、source URL 或 whitelist。

- [I2-COPY]
  - 相关文件：
    - `src/components/ConnectionIntegrityDemo.tsx`：CTA、loading、research-ready、error/trace copy 的主落点。
    - `src/providers/mock-agent.ts`：零凭据 demo 的 explanation/nextAction。
    - `scripts/judge-preflight.mjs`、`tests/preflight.test.mjs`：旧 CTA 是硬编码 main-flow anchor。
    - `scripts/verify-acceptance.mjs`：应正向要求新 ownership copy，并负向拒绝旧 CTA。
    - `docs/CONNECTION_INTEGRITY_DEMO.md`、`docs/DEMO_WALKTHROUGH.zh-CN.md`、`docs/DEMO_VIDEO_SCRIPT.md`、`docs/QODER_USAGE.md`、`docs/QODER_USAGE.zh-CN.md`：judge-facing流程引用旧 Ask-agent/Agent-recommends 叙事。
  - 现有数据流：CTA 只触发 evidence review；final candidate 已由 receipt 产生。屏幕文案应准确描述实际调用。
  - 注意的坑：只改按钮会被旧 preflight 拦截；只改门禁不改空态/文档，评委仍会看到 ownership 漂移。

- [I2-VIDEO]
  - 相关文件：
    - `docs/JUDGE_EVIDENCE.json`：video 的机器可读状态已是 WAIVED。
    - `scripts/final-audit.mjs`：classification 正确，gap closure 第 171 行仍硬编码 `+4`。
    - `scripts/judge-preflight.mjs`、`tests/preflight.test.mjs`：可承接“WAIVED evidence 不得生成 scored gap”的快速回归。
    - `docs/JUDGE_SCORECARD.md`：当前 video WAIVED/no score effect 的正确人读合同。
  - 现有数据流：rubric totals 从 JSON 派生，gap closure 仍由 `console.log` 手填；所谓 single source 尚未覆盖 gap。
  - 注意的坑：不要删除 WAIVED 可见性；用户豁免评分不等于视频已验收。

- [I2-MOBILE-LINK]
  - 相关文件：
    - `src/components/ItineraryLab.tsx`：`PolicyPill` 当前的 raw text + anchor flex 结构。
    - `src/styles.css`：通用 `.pill` 与 390px `overflow-wrap:anywhere`；应增加 policy-specific child rules，避免影响全产品 pills。
    - `tests/connection-policy.test.mjs`：只证明 source URL 存在，不证明 link 可读。
  - 现有数据流：resolved `policy.policySource.url` → `PolicyPill` anchor；不涉及 provider或策略计算。
  - 注意的坑：no-overflow gate 已通过但不代表可读；link 验收应同时保持 `scrollWidth <= clientWidth` 并确认 `source` 不被逐字断行。

## C. 新发现的坑

- [语义容器] 候选与数字绑定正确后，baseline badge/解释和 deterministic recommendation 共用一个容器仍会造成“算错”的感知；组件层级本身是产品合同。
- [缓存语义] whitelist 只保证安全形状，不保证属于当前语义版本；删除 provider-owned 字段必须升级持久 cache version。
- [门禁反锁] judge-preflight 当前保护旧 CTA；ownership copy 变更需同时更新正向新标签与负向旧标签断言。
- [单源未闭环] score/status 从 JSON 派生而 gap 仍手填，允许同一脚本同时正确标 WAIVED、又错误列 `+4`。
- [响应式可读性] `overflow-wrap:anywhere` 能让宽度门禁变绿，也能把短操作词排成竖列；移动验收必须同时检查无溢出和关键文字行盒。
