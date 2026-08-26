# Connection Integrity Agent

[English](./README.md)

这是一个面向阿里云 × Atlas Agentic AI Hackathon 的原型，聚焦一个具体问题：旅客在购买前如何选中转；当同一条已选行程出现临时事件时，航司如何提前介入。

> 能卖，不等于受保护。

## Agent 如何被治理

这个 demo 的差异点不在于用了 LLM，而在于 LLM 被怎样约束：

- **Agent 只说话，不执行。** LLM 负责理解偏好、检索公开转机证据、生成结构化比较；排序、时间适配规则、同意门槛和所有航司动作都留在确定性引擎里。
- **输出逐字段白名单校验。** 每个 Agent 响应都会被逐字段校验；超出允许枚举、或不属于本次提供报价 id 的内容一律拒绝。失败时不产生结论，而不是编造一个。
- **研究有证据门槛。** 没有至少一条相关官方来源就不产生评估；只有真正包含转机/流程主张的来源才会展示给旅客。
- **密钥不进浏览器。** Atlas、LLM 与 Tavily 凭据只存在于服务端（`server/` 共享模块，由 Vite dev 中间件或独立 Node 服务挂载）。

## 可配置的证据门槛，而非硬编码启发式

demo 中的 60 + 90 是 AirAsia KUL Fly-Thru 公开政策的参数化示范，作为一条策略条目存放在按航司/机场可配置的证据门槛注册表（`src/domain/connection-policies.mjs`，UI 打包产物与 Node 服务共享同一份模块）中。评分规则、Lab 的筛选/排序规则、服务端证据检索（官方域名门、兜底查询模板、披露式政策输入）都按行程解析适用条目；新增一个航司/机场政策只需注册一条策略条目，不需要改规则代码。核心字段：

```ts
interface ConnectionPolicy {
  connectionAirports: string[];        // 匹配条件（机场）
  flightPrefixes: string[];            // 匹配条件（承运人）
  publishedMinimumMinutes: number;     // 如 60（KUL/AirAsia，有出处）
  planningBufferMinutes: number;       // 如 90（可见的规划启发式）
  policySource: { description: string; url?: string; illustrative?: boolean };
  officialDomains: string[];           // 官方证据域名白名单
  queryTemplates: { official: string; community: string; retry: string };
  disclosedFallback: { title: string; url: string; summary: string } | null;
}
```

边界如实说明：注册表目前只有一条有出处的条目（`kul-airasia-flythru`）和一条明确标注 `illustrative` 的示范模板条目（用于证明机制可扩展，其数字不是已验证政策，且不会进入运行时解析）。没有已验证匹配条目的航线走显式的"无策略"路径——UI 如实披露未配置政策参数，研究检索改用无假设的通用查询、不加域名门，查不到官方来源时失败关闭，绝不借用其它机场的数字。

## 当前产品

1. **固定案例比较**：比较两条从 ATRIP 观察到的 PVG → KUL → SIN 报价，展示时间、价格和公开转机证据。
2. **真实搜索与组合**：`Try an itinerary` 在配置 Sandbox 后搜索两段 ATRIP 航班，列出本次返回、且超过已解析策略筛选线（KUL 条目为 60 分钟）的所有可衔接组合。它们明确标为独立的 self-transfer 组合，不假称联票。
3. **用户偏好与 Agent**：用户可选择最低价、最早抵达或最大中转缓冲，也可输入自然语言。Agent 只把文字映射到可见的偏好规则；排序完全基于页面展示的时间和价格。
4. **拆开时间与保障**：`Likely comfortable / Tight / Insufficient` 是由已解析策略条目驱动的透明规划规则——在已注册的 KUL/AirAsia 条目下为公开 60 分钟最低规则加 90 分钟可见规划缓冲；`Ticket protection not confirmed` 是独立的票务披露，绝不等同于“时间不够”。
5. **同一行程进入航司视图**：旅客确认推荐方案后，航司监控基于该方案模拟延误和干预建议。不会产生真实订单、改签或支付。

当前权威产品契约见 [docs/CONNECTION_INTEGRITY_DEMO.md](docs/CONNECTION_INTEGRITY_DEMO.md)。

## 数据与 AI 边界

| 层 | 真实内容 | 不做的声称 |
| --- | --- | --- |
| ATRIP Sandbox | 每次搜索实际返回的报价、价格、routing identifier 和可用时刻 | 全球库存、单一 PNR、行李直挂或受保护中转 |
| PVG → KUL → SIN 主案例 | 曾由 ATRIP 观察到的报价快照，页面明确标注 snapshot | 实时价格、实时库存或真实预订 |
| Tavily + LLM | 公开规则/流程检索、偏好理解、结构化比较 | 历史误机概率、私有思维链或航司责任认定 |
| 时间适配规则 | 已解析策略条目的参数——在已注册的 KUL/AirAsia 条目下为 60 分钟公开下限 + 90 分钟可见规划缓冲；未配置航线如实披露缺口 | OTP 校准概率、机场排队预测，或适用于所有机场的通用规则 |
| 航司操作 | 需同意的 demo proposal | 真实订票、退票、改签或支付 |

只有包含转机或转机流程主张的来源才会展示。实时评估至少需要一条相关官方来源；否则不产生评估结论。

## 本项目如何用 Qoder 构建

项目全程通过 Qoder 的 agentic 工作流开发。完整的使用记录与证据索引（会话、Quest plan、Canvas 报告、记忆、对抗性审计）见 [docs/QODER_USAGE.zh-CN.md](docs/QODER_USAGE.zh-CN.md)（[English](docs/QODER_USAGE.md)）：

- **契约先行迭代**：产品契约（`docs/CONNECTION_INTEGRITY_DEMO.md`）在 agent 会话中起草并多次修订；UI 文案、Provider 边界与验收项全部由它推导。
- **对抗性评审循环**：每个里程碑前跑一轮独立的"评委式"全仓审计（代码+文档），每条发现都先对照真实代码核实，再修复。
- **Agent 生成的验收门禁**：`npm run verify` 由契约验收项生成，每次改动都会复核案例数值、已注册 KUL 策略的 60+90 规则、策略注册表断言、全部披露标签与"无概率声称"规则。
- **Provider 层工程**：服务端模块（`server/`）、白名单校验与失败关闭降级路径均通过 agent 驱动的编辑实现与重构，以 `tsc` 作为回归门禁。

## Demo 入口与提交前托管

仓库不提交任何临时或匿名公网 URL。评委的规范入口是可重复的 **mock** 构建；公网 URL 只在提交前配置，必须是自有、可替换、经过检查的入口。

- **本地评委入口**：运行 `npm run build:mock`，再用 `npm run preview -- --host 127.0.0.1 --port 4173` 提供 `dist/`。产物含 `mock-build-manifest.json`，声明 `Flight: mock`、`Agent: mock`、静态托管和 `api: not-served`。
- **稳定公网入口**：只把这份 `dist/` 部署到自有静态主机，在本机设置 `PUBLIC_DEMO_URL`，再执行 `npm run recording-preflight -- --public-url $env:PUBLIC_DEMO_URL --require-public-url`。URL 有意不写入仓库。
- **mock 模式能力范围**：无需任何凭据即可体验完整治理面——PVG → KUL → SIN 报价对比（标注为 ATRIP 快照 fixture）、Agent 推荐（标注 Demo fixture）、Itinerary Lab（mock fixture、诚实的空结果降级、已注册 KUL/AirAsia 60 + 90 策略条目的披露与显式无策略路径）、航司侧延误场景回放（确定性、明确标注的模拟）。不含实时 Tavily/LLM 证据研究与实时航班动态。
- **live 模式**：按[本地运行](#本地运行)在本机配置 `.env.local` 后运行 `npm run dev`，或在自有服务上运行 `npm run build` 加 `npm run server`。纯静态构建按设计不提供 `/api`；预订、支付、改签和云部署均未声称完成。
- **Preflight**：`npm run judge-preflight` 检查 mock 产物与边界；`npm run recording-preflight` 额外检查 180 秒脚本、15 秒开场、双语演示锚点和四个官方评分维度。详见 [评委与录制前置检查](docs/JUDGE_PREFLIGHT.md)。

`npm run build:mock` 是一键、Windows PowerShell 兼容的包装脚本（`scripts/build-mock.mjs`）：以进程环境变量强制 `VITE_FLIGHT_PROVIDER=mock`、`VITE_AGENT_PROVIDER=mock`（覆盖任何 `.env.local` 值），执行类型检查与生产构建，写入静态托管 manifest，产出无凭据的 `dist/`（没有任何密钥带 `VITE_` 前缀，因此不可能被打包）。

## 本地运行

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

要使用真实 ATRIP Sandbox 搜索，在 `.env.local` 配置：

```ini
VITE_FLIGHT_PROVIDER=atlas-sandbox
ATLAS_BASE_URL=...
ATLAS_CLIENT_ID=...
ATLAS_CLIENT_SECRET=...
```

要使用实时 Agent，配置 `VITE_AGENT_PROVIDER=deepseek`、`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL` 和 `TAVILY_API_KEY`。密钥只在服务端（Vite dev 中间件或独立 Node 服务）使用，绝不可提交。

```powershell
npm run build
```

`/api/atlas`、`/api/agent/chat` 与 `/api/agent/connection-research` 的服务端逻辑位于 `server/`（`server/logic.mjs`）。dev 模式下 Vite dev server 以中间件形式挂载同一套 handler；部署时运行 `npm run server`——一个零额外依赖的 Node HTTP 服务（端口 8787，可用 `PORT` 覆盖），同时提供三个端点，并在 `npm run build` 产出 `dist/` 后由同一进程托管构建后的 UI。纯静态构建本身不提供 `/api`。预订、支付与售后服务仍不在本项目范围内。

`npm run verify` 是验收门禁：执行带类型检查的生产构建，运行针对规则边界（在已注册 KUL 策略的 60+90 下）、筛选/排序规则、策略注册表与 brief 白名单的数值化单元测试，并自动验证产物遵守契约的验收标准（案例数值、可见的规则披露、全部披露标签，且不含任何未校准的概率声称）。`live`、`mock`、`snapshot` 和 `unavailable` 是不同状态；mock 门禁通过不等于实时 provider 或公网部署已验证。

## 旧材料

早期 Seattle / Journey Risk Pricing 文档已归档至 [docs/legacy/](docs/legacy/)。它们记录了创始人的原始经历和已放弃的探索方向，不是当前产品契约，不能用于声称概率、定价或生产级服务能力。
