# 3-Minute Demo Video Script / 3 分钟演示视频分镜脚本

User-recorded screen-capture video; this document is the shot-by-shot script plus a material pack index. It is not itself a recording or proof of human replay. Every fact below was checked against the current code and gates (`npm run verify` = 60 assertions, `npm run test` = 40 cases, `npm run smoke:research`, `npm run smoke:server`). Narration is written in Chinese with an English reference translation per shot.

用户自行录屏的 3 分钟演示视频分镜脚本与素材包索引。本文件本身不是视频，也不是人工回放证据。下述所有事实均与当前代码和门禁核对（`npm run verify` = 60 条断言、`npm run test` = 40 个用例、`npm run smoke:research`、`npm run smoke:server`）。口播以中文撰写，每镜头附英文对照。

## 0. Video meta / 视频元信息

| Item 项目 | Value 取值 |
| --- | --- |
| Total length 总时长 | 180 s（3 分钟） |
| Structure 结构 | 开场 15s → 购买前 live 链路 75s → 参数化框架 15s → 购买后场景回放 45s → 收尾 30s |
| Recording mode 录制模式 | `npm run dev` live 模式（Flight = atlas-sandbox，Agent = deepseek），见附录 A |
| Public entry 公网入口 | 仅使用提交前配置并通过 `npm run recording-preflight -- --require-public-url` 的自有 URL；URL 不写入仓库。 / Use only an owned URL configured before submission and verified with the recording preflight; the URL is intentionally not committed. |
| Gate to quote 可引用门禁 | `npm run verify` 60 passed；`npm run test` 40 cases；`npm run smoke:research`（status=200、attempts=2、official 来源 ×1） |

## 1. Shot list / 分镜表

### Act 1 · Opening（15s）开场：问题陈述

| # | 时长 | 画面内容 | 口播稿（中文） | Narration (EN reference) | 转场/字幕建议 |
| --- | --- | --- | --- | --- | --- |
| 1 | 8s | 首屏静态画面：标题 "Connection Integrity Agent"、标语 "'Sellable' is not the same as 'protected.'"、顶栏 provider 徽标（Flight: atlas-sandbox / Agent: deepseek）。素材：`current-1-header.png` | 一张可以卖的机票，不等于一条被保护的转机。这个问题来自真实的创业起点——西雅图一次没有被保护的转机经历。 | "Sellable" is not the same as "protected". The problem starts from a real founder story — an unprotected connection in Seattle. | 字幕大字：Sellable ≠ Protected；西雅图一句带过，不展开 |
| 2 | 7s | 镜头保持在首屏三个价值卡（ATRIP flight offer / AirAsia public policy / Time fit ≠ ticket protection） | 我们用两段时间讲一个产品：购买前，帮旅客选一条有证据支撑的转机；购买后，当事件威胁这条转机时，帮航司介入。 | Two decisions, one product: before purchase, pick an evidence-backed connection; after purchase, intervene when an event threatens it. | 淡入下一幕；字幕：Before purchase → After purchase |

### Act 2 · Pre-purchase live chain（75s）购买前 live 链路

| # | 时长 | 画面内容 | 口播稿（中文） | Narration (EN reference) | 转场/字幕建议 |
| --- | --- | --- | --- | --- | --- |
| 3 | 12s | 主案例区：PVG → KUL → SIN · 10 Sep，两张报价卡——CHEAPEST（D73331 + AK727，KUL 07:15 → 09:10，1 h 55 m，$133.91）与 MORE BUFFER（D73331 + AK707，07:15 → 10:20，3 h 5 m，$148.10）；指针划过 "ATRIP Sandbox offer snapshot" 标签。素材：对应 `current-3-assessment.png` 区域 | 这是 ATRIP Sandbox 真实返回的两条 PVG 经 KUL 到 SIN 的报价：便宜的一条只留 115 分钟转机，贵 15 美元的一条多买 70 分钟。报价来自真实搜索，界面如实标注为快照。 | ATRIP Sandbox returns two real PVG–KUL–SIN routings: the cheaper one leaves 115 minutes at KUL; the other buys 70 more minutes for $15. Real search, honestly labelled as a snapshot. | 字幕：ATRIP Sandbox · real search · labelled snapshot |
| 4 | 15s | 点击 CHEAPEST 卡，展示 Agent 推荐面板：Tight — extra buffer helps / Ticket protection not confirmed / Assessment confidence；指出时间适配与票务保障是两个独立披露。素材：`current-3-assessment.png` | 注意这里有两层分开的披露：时间适配说"偏紧"，依据是公开政策参数，不是概率；票务保障另起一行——我们查不到单票联程的证据，就明说未确认。 | Two separate disclosures: time fit says "tight" from published policy parameters — not a probability; ticket protection is a separate line — without evidence of a through ticket we say "not confirmed". | 高亮两个 badge；字幕：Time fit ≠ ticket protection |
| 5 | 30s | 点击 "Check transfer evidence with Agent"，展示具名 baseline 的 live 证据链研究结果：来源列表（Official 来源 ×1 + Community 来源，各自可点击的原文链接）；展开 "How this judgment was made" 遥测面板，逐行扫过：Time-fit rubric（60 min published minimum + 90 min planning buffer (AirAsia Fly-Thru · KLIA Terminal 2)）、Workflow（Tavily evidence search → DeepSeek assessment）、Search sources、Search rounds（2 · round 2 reformulated the official query…）、Policy entry、Result origin。素材：`current-4-live-research.png` | Agent 只检查/解释具名 baseline 的实时证据链；最终候选由确定性比较选择。服务端用有界的 Tavily 检索——最多两轮，第一轮没有官方来源才改写查询重试；官方域名被白名单限定为 airasia.com。每条来源分层展示 official 或 community，全部带原文链接。整个遥测面板公开：跑了几轮、查了几个来源、用了哪条策略条目、结果来自实时运行还是 30 分钟缓存——没有任何黑盒。 | The Agent only checks/explains the named baseline evidence chain; deterministic comparison chooses the final candidate. The bounded Tavily loop uses at most two rounds, with an official-domain gate to airasia.com. Every source is tiered official or community and linked; telemetry shows rounds, source count, policy entry, and live run or 30-minute cache. | 遥测面板逐行下划线强调；字幕：bounded two-round search · official-domain gate |
| 6 | 18s | 结构化结论区：Choose D73331 + AK707、Why、Before purchase、What remains unknown 三段；指针停在 "What remains unknown: Single PNR / Fly-Thru eligibility · Baggage-through confirmation" | 结论是结构化的、逐字段通过白名单校验的：模型只负责理解和表达，排序和结论校验在确定性引擎里。查不到足够官方证据时，产品不出结论，而不是编一个。 | The verdict is structured and validated field by field against a whitelist: the LLM understands and expresses; ranking and validation stay deterministic. Without sufficient official evidence, the product gives no verdict — it never invents one. | 字幕：Whitelist-validated · fail closed |

### Act 3 · Configurable framework（15s）参数化框架一笔

| # | 时长 | 画面内容 | 口播稿（中文） | Narration (EN reference) | 转场/字幕建议 |
| --- | --- | --- | --- | --- | --- |
| 7 | 15s | 指向研究面板顶部的 Policy pill（"Policy: AirAsia Fly-Thru · KLIA Terminal 2 · 60 min minimum + 90 min buffer"）与遥测面板的 Policy entry 行（kul-airasia-flythru）；可快切代码编辑器中 `src/domain/connection-policies.mjs` 注册表一屏 | 60 加 90 不是硬编码的通用规则，而是注册表中 kul-airasia-flythru 这一条有出处 policy 的参数；UI 与独立 Node 服务共享同一份注册表。换一家航司、一个机场，只需注册一条新策略条目，不用改规则代码；没有匹配条目的航线走显式的无策略路径，产品绝不静默借用别人的数字。 | 60 + 90 are not hard-coded rules; they are the parameters of one sourced entry, kul-airasia-flythru, in a registry shared verbatim by the UI and the Node service. A new airline or airport means registering one entry — zero rule-code changes; unconfigured routes take an explicit no-policy path. | 字幕：One registry entry per policy · no hard-coded heuristics |

### Act 4 · Post-purchase scenario replay（45s）购买后场景回放

| # | 时长 | 画面内容 | 口播稿（中文） | Narration (EN reference) | 转场/字幕建议 |
| --- | --- | --- | --- | --- | --- |
| 8 | 8s | 旅客侧点击 "Use deterministic itinerary"（同意门），自动切到 "Airline: intervene after an event" 侧；Booked connection watch 显示所选行程与 DELAY TRIGGER 区（Scenario replay / Manual 两个触发方式）。素材：`current-5-airline-side.png` | 旅客确认确定性比较选择的行程后进入航司侧。注意同意门：没有旅客确认，行程不会进入后续流程。 | After traveller consent to the deterministic result we switch to the airline side — note the consent gate: nothing proceeds without it. | 字幕：Consent required |
| 9 | 27s | 点击 "Run scenario · 一键回放"，四步时间线依次点亮：Inject delay event（+60 min 模拟延误）→ Re-assess connection（55 min remaining is below the 60-min published minimum — insufficient, confidence high）→ Prepare traveller offer（为 D73331 + AK727 起草干预提案）→ Offer recorded · consent pending；重评估面板显示 Insufficient connection time 与 "The event input leaves 55 min, below the 60-minute published minimum"；全程可见 "Simulated operational event" 与 "scripted demo timeline… no live flight-status feed is used" 披露 | 一键回放一条脚本化时间线：入站延误加 60 分钟，剩余转机时间 55 分钟，低于 60 分钟的公开最低标准——时间适配失败，置信度高；系统随即为长缓冲备选航班起草干预提案，记录在案、等待旅客同意。画面上的每一处 Simulated 标注都是产品设计：这是确定性演示模拟，不是实时航班动态。 | One-click scripted replay: a +60-minute inbound delay leaves 55 minutes — below the 60-minute published minimum; time fit fails at high confidence, and an intervention offer for the longer-buffer alternative is drafted, recorded, and pending consent. Every "Simulated" label is by design: deterministic demo simulation, not a live flight-status feed. | 四步逐一圈出；字幕：+60 min delay → 55 min remaining → insufficient |
| 10 | 10s | 指针指向审计条目来源标签 "Scenario replay · demo simulation"；随后可快切 `docs/SCOPE_AND_LIMITATIONS.md` 第 2 节一屏 | 真实的接入点已经留好：购买后页面消费单一的 delayMinutes 输入，接入授权的航班动态源即可替换模拟——这条路线写在边界文档里。 | The real wiring point already exists: the post-purchase page consumes a single delayMinutes input; an authorized flight-status source can replace the simulation. That roadmap is stated in the scope document. | 字幕：delayMinutes — the live wiring point |

### Act 5 · Closing（30s）收尾

| # | 时长 | 画面内容 | 口播稿（中文） | Narration (EN reference) | 转场/字幕建议 |
| --- | --- | --- | --- | --- | --- |
| 11 | 12s | 滚动展示 Audit trail：traveller-consent、scenario-event-injected、scenario-recheck-triggered、airline-proposal-offer、scenario-consent-prompt 等条目，均带时间戳与来源标签；标注 "Persisted in this browser"。素材：`current-6-audit-trail.png` | 每一次同意、每一次注入、每一份提案都写入本机持久化的审计轨迹，带时间戳和来源标签，可当场查验——可审计的同意不是口号。 | Every consent, injected event and proposal is written to a persisted, timestamped audit trail with source labels — auditable consent, inspectable on the spot. | 字幕：Persisted audit trail · timestamped · source-labelled |
| 12 | 18s | 浏览器打开托管页首屏（mock 静态托管，徽标 Flight: mock / Agent: mock）；最后定格在标题页或仓库首页；字幕给出托管 URL 与文档名 | 评委现在就能零安装体验：打开托管链接，mock 模式无需任何凭据即可走完整条治理链路。我们同样诚实地写下边界：一条有出处的政策、一个可扩展的注册表、明确的缺失能力路线图——见 SCOPE AND LIMITATIONS 文档。Connection Integrity Agent：先选对，再守住。 | Reviewers can try it right now, zero setup: open the hosted link and walk the whole governance chain in mock mode with no credentials. We also state our boundaries honestly — one sourced policy, an extensible registry, and an explicit roadmap for what we lack — in the scope document. Connection Integrity Agent: choose right, then keep it safe. | 定格字幕：托管 URL + docs/SCOPE_AND_LIMITATIONS.md；结束画面 |

## Appendix A · Recording checklist / 录制操作清单

### A.1 Environment (live mode) / 环境准备（live 模式）

1. `npm install`；`Copy-Item .env.example .env.local`，在 `.env.local` 配置（键名以 `.env.example` 为准，值从各控制台获取，**录制中不得展示 `.env.local` 内容**）：
   - `VITE_FLIGHT_PROVIDER=atlas-sandbox` + `ATLAS_BASE_URL` / `ATLAS_CLIENT_ID` / `ATLAS_CLIENT_SECRET`（真实 ATRIP 搜索）；
   - `VITE_AGENT_PROVIDER=deepseek` + `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` + `TAVILY_API_KEY`（live Agent 与证据研究）。
2. `npm run dev` 启动开发服务器；确认顶栏徽标为 Flight: atlas-sandbox / Agent: deepseek。
3. 录制前先跑 `npm run smoke:server`（离线 8 项）确认服务端形状正常；live 链路可用 `npm run smoke:research` 预检（status=200、attempts=2 即链路可用）。
4. 密钥纪律遵守 [docs/KEY_ROTATION.md](./KEY_ROTATION.md)：录屏画面、终端历史、剪贴板中不出现任何密钥；`.env.local` 永不出现在镜头里。

### A.2 Cache pre-warm / 缓存预热时机

- live 证据研究典型延迟 30–60 秒（客户端硬预算 300 秒）。**建议**：正式录制前 10 分钟内先完整跑一次 "Ask agent"，正式录制时结果来自 30 分钟 localStorage 缓存，遥测面板 Result origin 会显示 "This browser's 30-minute cache"。
- **诚实要求**：若使用缓存结果，口播或字幕必须如实说明（镜头 5 的遥测面板本身就会显示 Result origin，不要遮挡该行）。若坚持展示 "Live agent run"，则不预热、接受 30–60 秒等待（可加速播放该段并标注"加速"）。

### A.3 Screen-recording tooling / 录屏工具建议

- Windows：Xbox Game Bar（Win + G）或 OBS Studio（1080p / 30fps，鼠标指针加粗放大）。
- 浏览器窗口最大化、缩放 100%；关闭无关标签页与系统通知（勿扰模式）。
- 分段录制（按幕），后期剪辑拼接；每幕预留 1–2 秒转场余量，总长仍控制在 180 秒。

### A.4 Honest fallback narration / 失败时的诚实口播备选

live 链路失败是产品预设路径之一，**不要掩饰**，改用以下备选口播（失败画面以录制时的实际降级屏为准；`current-7-honest-banner.png` 为诚实横幅示例，`current-4-live-research-fallback.png` 为 Agent: mock 路径的完整结论面板，可作 mock 模式插镜头）：

- 研究超时/无官方来源（镜头 5 备选）："研究没有在预算内找到足够的官方证据，所以产品不出结论——失败关闭，而不是编造一个看起来合理的答案。这就是治理的代价，也是它的价值。" / EN: "The research did not find sufficient official evidence within budget, so the product withholds the verdict — fail closed, never invent a plausible-sounding answer."
- 搜索无结果（镜头 3 备选，对应诚实横幅）："这一程没有返回报价，页面如实显示空结果，而不是编造一条可售行程。" / EN: "Nothing was returned for this leg, and the page says so instead of inventing offers."
- 若 live 链路整体不可用：全程改用 mock 模式（`npm run dev` 不配置 provider 变量即可，或直接用托管 URL），并在开场字幕声明 "Demo runs in mock mode"——mock 模式同样完整覆盖治理面（白名单校验、诚实降级、审计轨迹均可见）。

## Appendix B · Material pack index / 素材包索引（镜头-素材映射）

### B.1 Existing screenshots / 现有截图映射（`verify-screenshots/current/`，11 张）

| 现有文件 | 内容 | 映射镜头 | 用途 |
| --- | --- | --- | --- |
| `current-1-header.png` | 顶栏与 provider 徽标 | 镜头 1 | 开场定格参考画面 |
| `current-2-itinerary-input.png` | `Try an itinerary` 搜索表单 | 未入主分镜 | 备用：若加拍 Lab 实时搜索插镜头 |
| `current-3-assessment.png` | Agent 推荐面板（时间适配/票务保障/所选方案） | 镜头 3、4 | 购买前推荐区参考画面 |
| `current-4-live-research.png` | live 证据链研究（OFFICIAL×1 + COMMUNITY×2、search rounds 遥测、结构化结论） | 镜头 5、6 | live 链路核心参考画面 |
| `current-4-live-research-fallback.png` | mock agent 完整结论面板（Agent: mock 路径示例） | 未入主分镜 | 备用：mock 模式插镜头 |
| `current-5-airline-side.png` | 航司侧模拟延误与需同意的干预建议 | 镜头 8 | 航司侧入口参考画面 |
| `current-6-audit-trail.png` | 持久化审计轨迹（时间戳 + 来源标签） | 镜头 11 | 收尾审计轨迹参考画面 |
| `current-7-honest-banner.png` | 诚实的搜索失败横幅 | 附录 A.4 | 失败备选口播的对应画面 |
| `current-8-policy-pill.png` | Itinerary Lab Policy pill（AirAsia Fly-Thru · KLIA Terminal 2 · 60 min minimum + 90 min buffer · source 链接），68 个返回配对与组合卡 | 镜头 4/5/7 | 策略披露核心参考画面 |
| `current-9-scenario-replay.png` | Scenario replay 四步时间线（3 完成 + 1 进行中）、insufficient 结论、干预提案与 "Scenario replay · demo simulation" 审计条目 | 镜头 9 | 场景回放核心参考画面 |
| `current-10-hosted-demo.png` | Vercel 托管 mock 构建首屏（Flight: mock / Agent: mock 徽标、hero 文案、Policy pill） | 镜头 12 | 收尾托管入口参考画面 |

### B.2 Previously missing captures — now in place / 原待补拍画面（已就位）

以下 3 张画面曾为任务 8/9/11 新增 UI 的补拍项，现已全部就位于 `verify-screenshots/current/`（拍摄要点达成情况如下）：

| 文件 | 对应镜头 | 就位状态 |
| --- | --- | --- |
| `current-8-policy-pill.png` | 镜头 4/5/7 | 已就位：Itinerary Lab Policy pill（"Policy: AirAsia Fly-Thru · KLIA Terminal 2 · 60 min minimum + 90 min buffer" + source 链接）与 68 个返回配对、组合卡同屏；Flight = atlas-sandbox 真实搜索，策略由 `connection-policies` 注册表解析 |
| `current-9-scenario-replay.png` | 镜头 9 | 已就位：四步时间线（3 完成 + 1 进行中）、insufficient 结论、干预提案与 "Scenario replay · demo simulation" 审计条目同屏；确定性 demo fixture 回放（全模拟） |
| `current-10-hosted-demo.png` | 镜头 12 | 提交前替换为通过 preflight 的自有公网首屏（Flight: mock / Agent: mock 徽标、hero 文案、Policy pill）；不在仓库固化临时 URL。 |

索引同步状态：`verify-screenshots/current/README.md` 与 `docs/QODER_USAGE.md` / `docs/QODER_USAGE.zh-CN.md` 的截图清单均已更新为 11 张（双语、逐张标注数据路径）。

---

## Consistency notes / 一致性说明

- 全文数字来源：案例报价与分钟数（`src/data/connection-integrity.ts`，ATRIP 快照 2026-08-24）、60 + 90 与条目名 `kul-airasia-flythru`（`src/domain/connection-policies.mjs`）、场景 +60 min/55 min 剩余（`src/components/ConnectionIntegrityDemo.tsx` 的 `AIRLINE_SCENARIO.delayMinutes: 60` 与 fixture 判定）、有界两轮与域名门（`server/logic.mjs`）、门禁数 60/34（`npm run verify` / `npm run test` 实跑）、托管 URL 与认领方式（`README.md` / `README.zh-CN.md` "Live demo" 节实查）、30 分钟缓存与 30–60 秒延迟（`docs/SCOPE_AND_LIMITATIONS.md` 第 4 节）、`delayMinutes` 接入点（`docs/SCOPE_AND_LIMITATIONS.md` 第 2 节表格与 `ConnectionIntegrityDemo.tsx` 实现）。
- 措辞红线：全片不得出现任何未校准概率（"X% 误机风险"类表述一律禁止）；所有模拟环节必须保留 Simulated / demo simulation 披露入镜。
