# Scope and Limitations / 边界与局限

This document states, proactively and honestly, what this product is and is not. Every claim below is checked against the current code and acceptance gates (`npm run verify` 60 assertions, `npm run test` 34 numeric cases, `npm run smoke:research` and `npm run smoke:server`). The authoritative product contract remains [CONNECTION_INTEGRITY_DEMO.md](./CONNECTION_INTEGRITY_DEMO.md).

本文档主动、诚实地框定产品边界。下述每条表述都与当前代码和验收门禁核对一致（`npm run verify` 60 条断言、`npm run test` 34 个数值用例、`npm run smoke:research` 与 `npm run smoke:server`）。权威产品契约仍是 [CONNECTION_INTEGRITY_DEMO.md](./CONNECTION_INTEGRITY_DEMO.md)。

## 1. Innovation boundary: one sourced policy, a general mechanism / 创新边界：一条有出处的政策，一套通用机制

The demo's 60 + 90 pair is **the published AirAsia KUL Fly-Thru policy's parameters, carried as one registered entry** — not a universal rule. The mechanism is a configurable evidence-threshold framework:

- The registry lives in `src/domain/connection-policies.mjs`, shared verbatim by the bundled UI and the standalone Node service (`server/logic.mjs`), so dev and deployed behaviour cannot drift.
- `resolveConnectionPolicy({ connectionAirport, flightNumbers })` resolves the applicable entry per itinerary (airport match weighs more than carrier prefix; the highest-scoring entry wins).
- The time-fit rubric, the Itinerary Lab screening/ranking rules, and the server evidence search (official-domain gate, fallback query templates, disclosed policy input) all take their parameters from the resolved entry.
- Adding a policy for a new airline/airport means **registering one entry** — no rule code changes. The type definition and entry shape are documented in the contract's "Configurable evidence-threshold framework" section.

Coverage, honestly stated: the registry currently ships exactly one sourced entry (`kul-airasia-flythru`) plus one explicitly `illustrative` template entry (`pvg-illustrative-template`) whose numbers are **not** a verified published policy. Illustrative entries prove the registry is extensible but are excluded from runtime resolution; routes with no verified matching entry take the explicit **no-policy path**: the Lab keeps time-compatible pairs but discloses that no policy parameters are configured; the evidence search uses generic assumption-free queries with no domain gate and fails closed if no official source is found. The product never silently borrows another airport's numbers.

demo 中的 60 + 90 是 **AirAsia KUL Fly-Thru 公开政策的参数，作为注册表中的一条条目存放**——不是通用规则。机制本身是可配置的证据门槛框架：

- 注册表位于 `src/domain/connection-policies.mjs`，UI 打包产物与独立 Node 服务（`server/logic.mjs`）共享同一份模块，开发与部署行为不会漂移。
- `resolveConnectionPolicy({ connectionAirport, flightNumbers })` 按行程解析适用条目（机场匹配权重高于航司前缀，最高分条目胜出）。
- 时间适配评分、Itinerary Lab 的筛选/排序规则、服务端证据检索（官方域名门、兜底查询模板、披露式政策输入）全部从解析出的条目取参数。
- 新增一个航司/机场政策只需**注册一条策略条目**，不需要改规则代码。类型定义与条目结构见契约文档的 "Configurable evidence-threshold framework" 一节。

覆盖范围如实说明：注册表目前只有一条有出处的条目（`kul-airasia-flythru`）和一条明确标注 `illustrative` 的示范模板条目（`pvg-illustrative-template`），后者的数字**不是**已验证的公开政策，且不会进入运行时解析。没有已验证匹配条目的航线走显式的**无策略路径**：Lab 保留时间兼容配对但如实披露未配置政策参数；证据检索改用无假设的通用查询、不加域名门，查不到官方来源则失败关闭。产品绝不静默借用其它机场的数字。

## 2. Governance-first stance: what we refuse, and what we lack / 治理优先立场：我们拒绝什么，以及我们还缺什么

**Refusing to fabricate a missed-connection probability is a design choice, not a capability defect.** Search ranking, a single demo case and a visible planning heuristic cannot support a calibrated probability; presenting one would be invention. The product therefore separates what can be evidenced (public rules, transfer process claims, supplied offer facts) from what cannot (a calibrated chance of missing a connection), and says so on screen.

**"拒绝伪造误机概率"是设计选择，不是能力缺陷。** 检索排名、单点案例和可见的规划启发式支撑不了校准概率；给出概率即是编造。因此产品把"可以举证的事实"（公开规则、转机流程主张、所给报价事实）与"无法举证的事实"（校准后的误机概率）分开呈现，并在界面上如实说明。

Capabilities that competing products have and this prototype honestly lacks, each with its prerequisite and route in:

竞品具备而本原型如实缺失的硬能力，以及各自的前置条件与接入路线：

| Missing capability 缺失能力 | Why absent now 当前为何没有 | Prerequisite / route 前置条件与路线 |
| --- | --- | --- |
| Real-time flight status 实时航班动态 | The delay input is a labelled simulation; no live feed is integrated. 延误输入是明确标注的模拟，未接实时源。 | Integrate an authorized flight-status source (airline feed / FlightStats-class API); the post-purchase page already consumes a single `delayMinutes` input, so the wiring point exists. 接入授权的航班动态源；购买后页面已消费单一 `delayMinutes` 输入，接入点已存在。 |
| Calibrated probability model 校准概率模型 | No historical airport-process sample exists in this prototype. 原型内没有历史机场流程样本。 | Actuarial/data partnership (insurance-grade OTP and transfer-process data); only then would a probability surface be honest. 与保险精算级数据方合作；只有届时概率呈现才是诚实的。 |
| Global inventory 全球库存 | ATRIP Sandbox covers selected Asia-Pacific routes; empty legs degrade to an honest banner. Sandbox 仅覆盖部分亚太航线；空结果降级为诚实提示。 | Broader ATRIP coverage or a second GDS/NDC source behind the same provider adapter. 更广的 ATRIP 覆盖，或经同一 provider 适配器接入第二数据源。 |
| Real rebooking / payment 真实改签/支付 | All airline actions are consent-required demo proposals; nothing is booked. 所有航司动作都是需同意的演示提案，不产生订单。 | Enable only once Atlas booking/servicing capabilities open; until then the servicing surface stays simulation-only by design. 待 Atlas booking/servicing 能力开放后再接入；在此之前服务面按设计保持纯模拟。 |

## 3. Data plane reality / 数据面现状

- **ATRIP Sandbox coverage:** selected Asia-Pacific routes. The live chooser (`Try an itinerary`) states this on screen: when a leg returns nothing, the page shows an honest banner instead of inventing offers.
- **The main case is a snapshot.** The PVG → KUL → SIN offers (115 min / $133.91 and 185 min / $148.10) were observed from ATRIP Sandbox on **2026-08-24** and are labelled as a snapshot in the UI. Fares and schedules are date-dependent; they are demo evidence, not a live quote.
- **Refreshing the fixture:** re-run the two ATRIP searches for the same routing/date, verify the returned pairs still satisfy the contract (screening floor, currency, timetable fields), then update `src/data/connection-integrity.ts` and re-run `npm run verify`, which re-checks the fixture numbers and every disclosure label against the built bundle.

- **ATRIP Sandbox 覆盖**：部分亚太航线。实时试用面（`Try an itinerary`）在界面上如实说明：某一段搜不到结果时显示诚实提示，而不是编造报价。
- **主案例是快照**。PVG → KUL → SIN 报价（115 分钟 / $133.91 与 185 分钟 / $148.10）观察于 **2026-08-24** 的 ATRIP Sandbox，界面标注为 snapshot。价格与时刻依赖日期，是演示证据而非实时报价。
- **fixture 刷新方式**：对同一航线/日期重跑两次 ATRIP 搜索，确认返回配对仍满足契约（筛选线、币种、时刻字段），再更新 `src/data/connection-integrity.ts` 并运行 `npm run verify`——它会重新核对 fixture 数值与全部披露标签。

## 4. Cost and latency / 成本与延迟

- **Live evidence research is a deep check, not instant comparison.** One run performs bounded Tavily searches (at most two evidence rounds) plus a thinking-mode synthesis; typical latency is 30–60 seconds with a hard 300-second client budget, and every search is metered/billed by usage. The product positions it as a pre-purchase deep verification of one chosen connection, not a per-keystroke price comparator.
- **The 30-minute browser cache is a demo strategy.** Repeated views of the same assessment re-use a `localStorage` cache (labelled `This browser's 30-minute cache` in the UI). Mock mode exists so the whole governance story can be exercised with zero credentials. For production this must move to server-side caching/queueing with per-user budgets — that work is out of scope for this hackathon build.

- **实时证据研究是深度核查，不是即时比价。** 一次运行执行有界的 Tavily 检索（最多两轮）加一次 thinking 合成，典型延迟 30–60 秒，客户端硬预算 300 秒，且每次检索按量计费。产品把它定位为对一条已选行程的购买前深度核查，而不是逐次点击的比价工具。
- **30 分钟浏览器缓存是演示策略。** 同一评估的重复查看复用 `localStorage` 缓存（界面标注 `This browser's 30-minute cache`）；mock 模式让零凭据也能完整体验治理链路。生产化需要服务端缓存/队列化与按用户预算——不在本次 hackathon 范围内，如实说明。

## 5. Deployment forms / 部署形态

- **Standalone service (deployable today):** `npm run server` runs a dependency-free Node HTTP service (port 8787, `PORT` overridable) that serves the three `/api` endpoints and, after `npm run build`, the built UI from the same process. The Vite dev middlewares mount the exact same handlers, so dev and deployed behaviour cannot drift. `npm run smoke:server` re-checks the fail-closed shapes.
- **Mock static hosting (zero-friction demo):** with `VITE_FLIGHT_PROVIDER=mock` and `VITE_AGENT_PROVIDER=mock`, a static build demonstrates the full governance surface without any credentials. A static build alone does not serve `/api` — that is stated in the README.
- **Roadmap:** container image / serverless deployment of `server/index.mjs` plus managed caching; no code change to the governance layer is expected because all secrets already live server-side.

- **独立服务（今天即可部署）**：`npm run server` 运行零额外依赖的 Node HTTP 服务（端口 8787，可用 `PORT` 覆盖），同时提供三个 `/api` 端点，并在 `npm run build` 后由同一进程托管 UI。Vite dev 中间件挂载同一套 handler，开发与部署行为不漂移；`npm run smoke:server` 复核失败关闭形状。
- **mock 静态托管（零门槛体验）**：`VITE_FLIGHT_PROVIDER=mock` 且 `VITE_AGENT_PROVIDER=mock` 时，静态构建即可演示完整治理面，无需任何凭据。纯静态构建不提供 `/api`——README 已如实说明。
- **路线图**：将 `server/index.mjs` 容器化/云函数化并配托管缓存；由于密钥已全部在服务端，治理层代码预期无需改动。

## 6. Post-purchase intervention is a simulation / 购买后干预是模拟

Everything after "Use recommended itinerary" is a **deterministic demo simulation**: the inbound delay is injected and labelled simulated, the scenario replay is scripted, audit entries carry the `Scenario replay · demo simulation` source label, and no real booking, rebooking or payment occurs. This is the designed shape of the airline-side story until an authorized real-time flight-status source and real servicing capabilities are integrated; both prerequisites are listed in section 2.

"Use recommended itinerary" 之后的一切都是**确定性演示模拟**：入站延误由注入产生并标注 simulated，场景回放是脚本化的，审计条目带 `Scenario replay · demo simulation` 来源标签，不产生真实订单、改签或支付。在接入授权的实时航班动态源与真实服务能力之前，这就是航司侧故事的既定形态；两项前置条件见第 2 节。
