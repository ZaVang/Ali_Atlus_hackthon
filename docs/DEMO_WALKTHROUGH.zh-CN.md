# Connection Integrity Agent — 3 分钟演示讲稿

这是当前录屏与评审动线。English shot-by-shot reference is maintained in [DEMO_VIDEO_SCRIPT.md](DEMO_VIDEO_SCRIPT.md); judge/recording gates are in [JUDGE_PREFLIGHT.md](JUDGE_PREFLIGHT.md)。

## 先讲清两条案例线

Seattle 是创始人亲历的**问题起点**：一次名义合规的转机最终因为真实机场流程失败。它解释为什么“能卖”不等于“值得推荐”。

PVG → KUL → SIN 是本产品的**第二个现场案例**：2026-08-24 从 ATRIP Sandbox 观察到的亚太报价快照，用来展示选择、公开检索、Agent trace、旅客 consent 与航司延误回放（delay replay）。不要把它讲成 Seattle 的同一条行程，也不要声称是实时库存或单一联票。

## 0:00–3:00 动线

| 时间 | 操作 | 要说的话 |
| --- | --- | --- |
| 0:00–0:15 | 打开 `Connection Integrity`，停在 hero 和价值卡 | “Seattle 的经历说明：合法中转不一定是好选择。我们不做黑盒误机概率，而是让用户购买前看见时间适配、票务保障和替代方案；LLM 只理解和表达，不排序、订票或执行。” |
| 0:15–0:35 | 展示 `PVG → KUL → SIN` 两张卡 | “这是第二个现场案例，不是 Seattle 的同一行程。115 分钟 / $133.91 与 185 分钟 / $148.10 是 ATRIP Sandbox snapshot；本次用 mock 回放，不说成当前库存。” |
| 0:35–1:05 | 选短卡，点击 `Check transfer evidence with Agent`，展开具名 baseline 的 `Agent evidence / How this judgment was made` | “Agent 只检查并解释证据；确定性比较选择最终候选。live 时是最多两轮的官方证据检索；mock 时明确写 `Demo agent fixture`。来源层级、轮次、Policy entry、Result origin 都可见；时间适配和 ticket protection 只属于具名 baseline。” |
| 1:05–1:20 | 指向 `Policy entry` 与 60 + 90 行 | “60 + 90 来自已注册的 KUL/AirAsia policy entry，不是所有机场的硬编码规则。无匹配策略会走 no-policy path。” |
| 1:20–1:40 | 点击 `Use deterministic itinerary` | “这是 traveller consent gate。确定性比较选择的行程只有在明确同意后才进入航司观察；这里不创建 booking。” |
| 1:40–2:00 | 打开 `Airline: intervene after an event` | “这里接收同一条已选行程。默认值可以用于脚本回放，画面会标为 `default demo itinerary` 或 traveller-selected itinerary。” |
| 2:00–2:28 | 点击 `Run scenario`，展示 +60 分钟、55 分钟剩余、insufficient 和提案 | “这是确定性的延误回放（delay replay）：+60 让 115 变成 55，低于 60 分钟公开下限，系统起草需同意的替代方案。`Simulated operational event` 说明没有接实时航班动态。” |
| 2:28–2:40 | 展示 `docs/QODER_USAGE.md`、`npm run judge-preflight` 输出和 deliberate-failure test | “Qoder evidence 有会话、Quest、Canvas、对抗审计和验收索引；preflight 对故意缺失的 provenance 文案会报 `FAIL`，不是只做截图。” |
| 2:40–2:55 | 展示 `docs/SCOPE_AND_LIMITATIONS.md` 与 `mock-build-manifest.json` | “边界明确：booking、rebooking、payment、实时航班动态和云部署都未声称完成；静态 mock 入口不提供 `/api`。live、mock、snapshot、unavailable 是不同状态。” |
| 2:55–3:00 | 展示本机审计轨迹并收尾 | “同意、注入和提案都写入带时间戳的本机审计轨迹。自有公网 URL 只有通过 recording-preflight 后才分享：先选对，再守住。” |

## 录制前验收

1. 运行 `npm run judge-preflight` 与 `npm run recording-preflight`，`FAIL` 必须为零；`WAIVED` 只表示 live/provider 或公网项未执行。
2. 默认用 `npm run build:mock` 与 `npm run preview -- --host 127.0.0.1 --port 4173` 录制。顶栏若是 `mock`，口播必须说 mock；若是 snapshot，必须说 snapshot。
3. 若使用 live Agent/Atlas，录制当天另跑 live smoke 并保留实际结果；不能用 mock 门禁证明 live 可用。
4. 每个 Agent 结论都要保留 `Agent-generated · <model>` 或 `Demo agent fixture`；调用不可用时只能显示 unavailable/不出结论。
5. 所有组合都要标注 self-transfer；航司 proposal、订单和改签都必须带 demo/consent 说明。本项目没有真实 booking 或 rebooking 能力。
6. 录屏不得出现 `.env.local`、API key、原始 prompt 或私有思维链。

## 评委常问

| 问题 | 回答 |
| --- | --- |
| Seattle 和 KUL 是同一案例吗？ | 不是。Seattle 是痛点起点；PVG → KUL → SIN 是 ATRIP 支持的第二个亚太 snapshot 案例。 |
| 为什么不用准确误机概率？ | 当前只有报价快照与公开证据，没有历史机场流程样本；我们使用可见的规划规则，不伪造概率。 |
| 60 分钟是不是所有机场的 MCT？ | 不是。它是 KUL/AirAsia 注册策略的公开参数；独立 self-transfer 仍需确认签证、行李、入境和再次值机流程。 |
| LLM 真正做了什么？ | 它检索/表达/理解偏好；排序、白名单校验、consent 和模拟动作由确定性代码控制。 |
| 你们已经完成 booking/rebooking 或云部署了吗？ | 没有。当前是 mock/static 可复现 demo；实时 provider、真实服务能力和自有公网部署都要单独验证，并在材料中标为 live/unavailable 或 WAIVED。 |
