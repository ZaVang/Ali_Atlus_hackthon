# Connection Integrity Agent

[English](./README.md)

这是一个面向阿里云 × Atlas Agentic AI Hackathon 的原型，聚焦一个具体问题：旅客在购买前如何选中转；当同一条已选行程出现临时事件时，航司如何提前介入。

> 能卖，不等于受保护。

## Agent 如何被治理

这个 demo 的差异点不在于用了 LLM，而在于 LLM 被怎样约束：

- **Agent 只说话，不执行。** LLM 负责理解偏好、检索公开转机证据、生成结构化比较；排序、时间适配规则、同意门槛和所有航司动作都留在确定性引擎里。
- **输出逐字段白名单校验。** 每个 Agent 响应都会被逐字段校验；超出允许枚举、或不属于本次提供报价 id 的内容一律拒绝。失败时不产生结论，而不是编造一个。
- **研究有证据门槛。** 没有至少一条相关官方来源就不产生评估；只有真正包含转机/流程主张的来源才会展示给旅客。
- **密钥不进浏览器。** Atlas、LLM 与 Tavily 凭据只存在于服务端 Vite 代理中。

## 当前产品

1. **固定案例比较**：比较两条从 ATRIP 观察到的 PVG → KUL → SIN 报价，展示时间、价格和公开转机证据。
2. **真实搜索与组合**：`Try an itinerary` 在配置 Sandbox 后搜索两段 ATRIP 航班，列出本次返回、且超过公开 60 分钟下限的所有可衔接组合。它们明确标为独立的 self-transfer 组合，不假称联票。
3. **用户偏好与 Agent**：用户可选择最低价、最早抵达或最大中转缓冲，也可输入自然语言。Agent 只把文字映射到可见的偏好规则；排序完全基于页面展示的时间和价格。
4. **拆开时间与保障**：`Likely comfortable / Tight / Insufficient` 使用公开 60 分钟最低规则加 90 分钟可见规划缓冲；`Ticket protection not confirmed` 是独立的票务披露，绝不等同于“时间不够”。
5. **同一行程进入航司视图**：旅客确认推荐方案后，航司监控基于该方案模拟延误和干预建议。不会产生真实订单、改签或支付。

当前权威产品契约见 [docs/CONNECTION_INTEGRITY_DEMO.md](docs/CONNECTION_INTEGRITY_DEMO.md)。

## 数据与 AI 边界

| 层 | 真实内容 | 不做的声称 |
| --- | --- | --- |
| ATRIP Sandbox | 每次搜索实际返回的报价、价格、routing identifier 和可用时刻 | 全球库存、单一 PNR、行李直挂或受保护中转 |
| PVG → KUL → SIN 主案例 | 曾由 ATRIP 观察到的报价快照，页面明确标注 snapshot | 实时价格、实时库存或真实预订 |
| Tavily + LLM | 公开规则/流程检索、偏好理解、结构化比较 | 历史误机概率、私有思维链或航司责任认定 |
| 时间适配规则 | 60 分钟公开下限 + 90 分钟规划缓冲 | OTP 校准概率或机场排队预测 |
| 航司操作 | 需同意的 demo proposal | 真实订票、退票、改签或支付 |

只有包含转机或转机流程主张的来源才会展示。实时评估至少需要一条相关官方来源；否则不产生评估结论。

## 本项目如何用 Qoder 构建

项目全程通过 Qoder 的 agentic 工作流开发。完整的使用记录与证据索引（会话、Quest plan、Canvas 报告、记忆、对抗性审计）见 [docs/QODER_USAGE.zh-CN.md](docs/QODER_USAGE.zh-CN.md)（[English](docs/QODER_USAGE.md)）：

- **契约先行迭代**：产品契约（`docs/CONNECTION_INTEGRITY_DEMO.md`）在 agent 会话中起草并多次修订；UI 文案、Provider 边界与验收项全部由它推导。
- **对抗性评审循环**：每个里程碑前跑一轮独立的"评委式"全仓审计（代码+文档），每条发现都先对照真实代码核实，再修复。
- **Agent 生成的验收门禁**：`npm run verify` 由契约验收项生成，每次改动都会复核案例数值、60+90 规则、全部披露标签与"无概率声称"规则。
- **Provider 层工程**：服务端代理、白名单校验与失败关闭降级路径均通过 agent 驱动的编辑实现与重构，以 `tsc` 作为回归门禁。

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

要使用实时 Agent，配置 `VITE_AGENT_PROVIDER=deepseek`、`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL` 和 `TAVILY_API_KEY`。密钥只在 Vite 服务端代理中使用，绝不可提交。

```powershell
npm run build
```

`npm run verify` 是验收门禁：执行带类型检查的生产构建，并自动验证产物遵守契约的验收标准（案例数值、可见的 60+90 规则、全部披露标签，且不含任何未校准的概率声称）。

## 旧材料

早期 Seattle / Journey Risk Pricing 文档已归档至 [docs/legacy/](docs/legacy/)。它们记录了创始人的原始经历和已放弃的探索方向，不是当前产品契约，不能用于声称概率、定价或生产级服务能力。
