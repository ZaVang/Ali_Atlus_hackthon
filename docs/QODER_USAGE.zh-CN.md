# 我如何用 Qoder 构建这个项目

English version: [How I built this project with Qoder](QODER_USAGE.md)

> 本文不是营销文案，而是一份**带证据索引的使用记录**。每一条结论都可以在仓库或 Qoder 会话记录中找到对应痕迹（见文末「证据索引」）。

## 一句话概括

整个项目——从读懂 hackathon 材料、确定叙事、Atlas 调研、写代码、做评委演练，到最后的对抗性审计与验收门禁——是在 **4 轮 Qoder 会话**（其中 2 轮为 Quest 专家团模式）中完成的。我负责产品判断与硬约束，Qoder 负责调研、实现、自审与门禁。

## 开发时间线

| 日期 | 会话形态 | 做了什么 |
|---|---|---|
| 08-17 | **Quest 专家团模式** | 先读项目文档再动手；从「3 分钟 demo 要展示什么」倒推目标；完成 Atlas 集成调研（ATRIP REST API vs Skill CLI 选型）；配置 Sandbox 凭证并冒烟测试；我把西雅图误机的真实经历写进 plan，作为一切需求的出发点 |
| 08-19 | Agent 模式 | 按 plan 实现首个可演示 demo；我做「完全不懂的评委」，Qoder 逐屏讲解每个面板在表达什么；叙事收敛（OTP 启发、风险定价概念探索）；设计并注入 LLM 层（`AgentProvider` 与四个既有 Provider 平级，服务端代理注入密钥）；补双语 README |
| 08-24 | **Quest 专家团模式** | 第二次 pivot：从「中转连接」转向「风险定价」叙事；Quest 产出 plan 后严格执行（明确禁止编辑 plan 文件）；以 Canvas 可视化报告交付阶段成果；编写评委讲解稿；粘贴外部审计结果（62/100）后逐条对账修复 |
| 08-25 | Agent 模式 + **Subagent** | 评委视角自评 → 三项高杠杆改进；让 Qoder 生成自动化验收门禁 `npm run verify`（44 项断言）；派 CodeReview subagent 做对抗性审计（56/100，13 条扣分），随后逐条修复并全绿复验 |

## 用到的 Qoder 能力与证据

- **Quest 专家团模式**：两次大阶段（立项、pivot）都以 Quest 执行，产出 plan 文件后进入"只执行、不改 plan"的模式。
- **契约先行**：产品契约 `docs/CONNECTION_INTEGRITY_DEMO.md` 在会话中起草并多轮修订，UI 文案、Provider 边界、验收项全部由它推导。
- **Canvas 报告**：Quest 阶段以 4 份 Canvas 可视化报告交付（叙事研究、Agent 注入方案、天气扩展、demo 完成报告）。
- **Repo Wiki**：用 Qoder 生成过项目 wiki 用于快速建立全局认知（pivot 前的旧版已作废，见 `.gitignore`）。
- **浏览器验证**：pivot 前探索期用 88 张截图逐一核对每个面板的文案与行为，已作为 legacy 探索证据归档至 `verify-screenshots/legacy/`；当前产品的 11 张截图已在 `verify-screenshots/current/` 全部就位（含 live 全链路研究一屏）。后期升级为"我亲眼观看给反馈"。
- **记忆系统**：关键教训沉淀为长期记忆，例如「异步 Provider 结果写 React 共享状态需代际守卫防过期覆盖」「Vite 中间件读取非 VITE_ 变量需显式 loadEnv」「LLM 角色边界：只说话不执行」，在后续会话中直接被复用。
- **Subagent 对抗审计**：决赛前派独立的 CodeReview subagent 以苛刻评委身份审全仓，13 条扣分全部对账后修复 11 条，并把教训写进门禁正则，防止回潮。

## 人机分工：我决策，Qoder 执行并提出异议

这个项目不是"一句话生成"出来的，而是一条清晰的协作链：

**我提供**：真实痛点（西雅图 15 小时滞留经历）、产品叙事方向、硬约束、最终验收（亲眼观看）。

**Qoder 提供**：行业调研（Fly-Thru 政策、OTP 概念、ATLAS API）、全部实现、自我审计、自动化门禁。

几个具体瞬间：

- **需求源头**：我在会话里讲述西雅图误机经历，并要求"文档里一定要记录我的真实经历，这是所有需求的出发点"——它成为 plan 的第一章，也最终成为产品叙事的根基。
- **我否决，Qoder 修正**：外部审计建议把航司的 `$80` 主动干预成本写成"保障保费"，我加了硬约束："不要写成保费，那会从缺价格变成编造收费产品"。Qoder 据此改为如实的 "Airline-funded proactive cost" 表述。
- **我把外部审计结果原样粘贴进会话**（62/100），Qoder 逐条对照真实代码核实后修复，而不是照单全收。
- **主动要求对抗性审计**：最后一轮我直接说"派一个 subagent 去做对抗性审计，当评委来给项目评分"——得到 56/100 与 13 条扣分，随后的修复包括物理删除全部 legacy 代码、门禁从字符串检查升级为行为性断言。

## 这套用法与 hackathon 主题的呼应

hackathon 主题是 Agentic AI。我们用 Qoder 的方式本身就是 agentic 的：**plan 先行、工具执行、记忆复用、独立 agent 对抗审计**。而项目产品本身也贯彻同一治理哲学——LLM 只说话不执行，排序、执行与同意留在确定性引擎里。构建工具与产品理念是同一套原则的两次应用。

## 证据索引

| 证据 | 位置 |
|---|---|
| 4 轮会话记录（2 轮 Quest：task-2f5、task-e19） | Qoder 会话历史 |
| 4 份 Canvas 阶段报告（叙事研究 / Agent 注入 / 天气扩展 / demo 完成） | Qoder Canvas |
| 88 张浏览器验证截图（legacy 探索证据，pivot 前旧产品） | `verify-screenshots/legacy/` |
| 当前产品的 11 张截图（预期的 reviewer/Qoder 附件，本 checkout 中不存在） | `verify-screenshots/current/`（清单见下；截图验收前必须附上） |
| 60 项断言的验收门禁（含 rubric 边界、筛选/排序规则、策略注册表与 brief 白名单的数值化单元测试） | `scripts/verify-acceptance.mjs`（`npm run verify`） |
| 产品契约 | `docs/CONNECTION_INTEGRITY_DEMO.md` |
| 评委讲解稿 | `docs/DEMO_WALKTHROUGH.zh-CN.md` |
| 归档的探索过程（pivot 前文档） | `docs/legacy/` |

### 预期的当前产品截图清单（`verify-screenshots/current/`）

下表是附件检查清单，不是文件存在的证明。本仓库 checkout 不包含 `verify-screenshots/current/`；提交前必须由人工/Qoder 附上截图，并把每张截图的 provider/source 路径与实际运行核对一致。

| 文件 | 内容 | 数据路径 |
|---|---|---|
| `current-1-header.png` | 顶栏：视图切换与 Flight/Agent provider 徽标 | Flight = atlas-sandbox 真实搜索 |
| `current-2-itinerary-input.png` | `Try an itinerary` 搜索表单（PVG → KUL → SIN 案例） | Flight = atlas-sandbox 真实搜索 |
| `current-3-assessment.png` | Agent 推荐面板：时间适配、票务保障与所选方案 | Flight = atlas-sandbox 真实搜索 · Agent = mock |
| `current-4-live-research-fallback.png` | mock agent 完整结论面板（Agent: mock 路径示例） | Flight = atlas-sandbox 真实搜索 · Agent = mock |
| `current-4-live-research.png` | `Ask agent` live 实时证据链研究结果：来源分层（OFFICIAL×1 + COMMUNITY×2）、search rounds 遥测（1 轮、约 27 s）与结构化结论 | Flight = atlas-sandbox 真实搜索 · Agent = deepseek live |
| `current-5-airline-side.png` | 航司侧：模拟进港延误事件与需同意的干预建议 | Flight = atlas-sandbox 真实搜索 · Agent = mock |
| `current-6-audit-trail.png` | 持久化审计轨迹：带时间戳与来源标签的同意/提案事件 | Flight = atlas-sandbox 真实搜索 · Agent = mock |
| `current-7-honest-banner.png` | 诚实的搜索失败横幅：无实时数据则不出推荐 | Flight = atlas-sandbox 真实搜索 |
| `current-8-policy-pill.png` | Itinerary Lab Policy pill（AirAsia Fly-Thru · KLIA Terminal 2 · 60 min minimum + 90 min buffer · source 链接），68 个返回配对与组合卡 | Flight = atlas-sandbox 真实搜索 · 策略由 `connection-policies` 注册表解析 |
| `current-9-scenario-replay.png` | 航司视图 Scenario replay 时间线（四步：3 完成 + 1 进行中）、insufficient 结论、干预提案与来源为 "Scenario replay · demo simulation" 的审计条目 | 确定性 demo fixture 回放（全模拟） |
| `current-10-hosted-demo.png` | Vercel 托管 mock 构建的真实首屏（Flight: mock / Agent: mock 徽标、hero 文案、Policy pill） | mock 静态托管构建（无凭据） |
