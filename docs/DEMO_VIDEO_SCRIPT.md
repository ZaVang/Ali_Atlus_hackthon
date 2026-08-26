# 3-Minute Demo Video Script / 3 分钟演示视频分镜脚本

This is the judge-facing screen-recording script. The four repository commands must finish with zero failures; their exact counts are printed by the runners. Use [Judge and recording preflight](JUDGE_PREFLIGHT.md) before recording and do not quote a stale assertion count.

这是面向评委的录屏脚本。四个仓库命令都必须以零失败结束；具体数量由运行器现场打印。录制前执行[评委与录制前置检查](JUDGE_PREFLIGHT.md)，不要引用过期的断言数量。

## Video contract / 视频契约

| Item 项目 | Decision 决定 |
| --- | --- |
| Length 时长 | 180 seconds / 3 minutes |
| Recording default 默认录制 | `npm run build:mock` + local/static preview; use live only when recording-day smoke passes. / 默认 mock 加本地/静态预览，live 只有在当天 smoke 通过后才使用。 |
| Public entry 公网入口 | Submission-time owned URL only. Set `PUBLIC_DEMO_URL`, run `npm run recording-preflight -- --public-url $env:PUBLIC_DEMO_URL --require-public-url`, and never commit a temporary URL. / 仅使用提交前配置的自有 URL，不提交临时 URL。 |
| Main facts 主事实 | Seattle = pain origin; PVG → KUL → SIN = separate ATRIP Sandbox snapshot case. / Seattle 是痛点起点；PVG → KUL → SIN 是独立的 ATRIP Sandbox 快照案例。 |

## Shot list / 分镜表

| # | Time 时长 | Screen / action 画面与操作 | Chinese narration 中文口播 | English reference 英文对照 |
| --- | ---: | --- | --- | --- |
| 1 | 8s | Open the hero screen: `Connection Integrity Agent`, `Sellable` ≠ `protected`. | 一张可以卖的机票，不等于一条被保护的转机。问题来自真实的 Seattle 经历：名义合规不代表旅客真的有余量。 | A sellable ticket is not the same as a protected connection. The problem starts from a real Seattle experience: nominal legality is not operational margin. |
| 2 | 7s | Hold on the three value cards. | 我们用两段时间讲一个产品：购买前帮旅客选一条有证据的转机；购买后，当事件威胁同一条转机时，帮航司在同意门内介入。 | One product, two decisions: choose an evidence-backed connection before purchase, then help the airline intervene after an event threatens that same connection, behind consent. |
| 3 | 12s | Show the two `PVG → KUL → SIN` cards and `ATRIP Sandbox offer snapshot`. | 这是第二个现场案例，不是 Seattle 的同一条行程：2026-08-24 从 ATRIP Sandbox 观察到的 PVG→KUL→SIN 报价快照。115 分钟是 $133.91，185 分钟是 $148.10；今天用 mock 回放快照，不把它说成当前库存。 | This is a separate field case, not the Seattle itinerary: a PVG–KUL–SIN offer snapshot observed in ATRIP Sandbox on 2026-08-24. The options are 115 minutes for $133.91 and 185 minutes for $148.10; today the snapshot is replayed in mock mode, not presented as current inventory. |
| 4 | 15s | Select the short card; point to time fit and `Ticket protection not confirmed`. | 这里有两层披露：时间适配依据公开策略参数，不是误机概率；票务保障单独显示为未确认。self-transfer 不是联票，未知保障不能被偷换成“时间不够”。 | Two disclosures stay separate: time fit comes from published policy parameters, not a misconnection probability; ticket protection is separately `not confirmed`. A self-transfer is not a through-ticket. |
| 5 | 30s | Click `Ask agent which itinerary to choose`; open `Agent trace / How this judgment was made`. Show source tiers, rounds, policy entry and result origin. | 这是 Agent trace。live 时，它展示服务端有界的 Tavily 证据链，最多两轮并限制官方域名；mock 时，它明确显示 `Demo agent fixture`，不冒充实时研究。两条路径都公开来源、轮次、策略条目和缓存/实时来源。 | This is the Agent trace. In live mode it shows a server-side Tavily evidence chain bounded to two rounds with an official-domain gate; in mock mode it says `Demo agent fixture`, never live research. Both paths expose sources, rounds, policy entry and cache/live origin. |
| 6 | 18s | Show the structured recommendation and `What remains unknown`. | 结论逐字段通过白名单校验：LLM 只理解和表达，确定性引擎负责排序、时间规则和同意。证据不足时不出结论，而不是编一个。 | The recommendation is whitelist-validated field by field: the LLM understands and expresses, while deterministic code owns ranking, time rules and consent. If evidence is insufficient, the product withholds the verdict. |
| 7 | 15s | Point to `Policy: AirAsia Fly-Thru · ... 60 min minimum + 90 min buffer` and `Policy entry`. | 60 加 90 不是所有机场的硬编码规则，而是 `kul-airasia-flythru` 这条有出处策略的参数。注册表由 UI 和 Node 服务共享；没有匹配策略的路线会显示无策略，不借用别人的数字。 | 60 + 90 are not universal hard-coded rules. They belong to the sourced `kul-airasia-flythru` entry shared by the UI and Node service. Unconfigured routes disclose no policy instead of borrowing another airport's numbers. |
| 8 | 8s | Click `Use recommended itinerary`; show `Traveller consent required`, then the airline tab. | 旅客明确同意后，行程才进入航司观察。这里没有创建订单。 | Only after explicit traveller consent does the itinerary enter the airline watch. No booking is created here. |
| 9 | 27s | Click `Run scenario`; show the four-step delay replay. | 一键回放脚本化场景：入站延误 +60 分钟，115 变成 55 分钟，低于公开 60 分钟下限；系统给长缓冲备选起草 consent-pending 提案。`Simulated operational event` 表明这不是实时航班动态。 | One click replays a scripted event: a +60-minute inbound delay turns 115 into 55 minutes, below the published 60-minute floor; the system drafts a consent-pending offer for the longer-buffer alternative. `Simulated operational event` means this is not live flight status. |
| 10 | 10s | Point to the simulation source label and `docs/SCOPE_AND_LIMITATIONS.md`. | 边界写在画面和文档里：实时航班动态、booking、rebooking、payment 和云部署都未声称完成；静态 mock 构建也不提供 `/api`。 | The boundary is on screen and in the docs: live flight status, booking, rebooking, payment and cloud deployment are not claimed complete; the static mock build also serves no `/api`. |
| 11 | 12s | Show `docs/QODER_USAGE.md`, then the `PASS / FAIL / WAIVED` preflight summary and its deliberate-failure test. | Qoder 证据不是一句“AI 帮我写了”：这里有会话、Quest、Canvas、对抗审计和验收门禁索引；preflight 对故意缺失的 provenance 文案会报 `FAIL`。 | Qoder evidence is not a slogan: sessions, Quests, Canvas reports, adversarial review and acceptance gates are indexed here; the preflight fails on a deliberately missing provenance label. |
| 12 | 18s | Show the persisted audit trail; end on local mock entry or an owned URL only after preflight passes. | 每一次同意、注入和提案都写入带时间戳的本机审计轨迹。评委看到的是可复现的 mock 治理链路；自有公网入口只有通过 preflight 后才分享。Connection Integrity Agent：先选对，再守住。 | Every consent, injected event and proposal is written to a timestamped local audit trail. Reviewers see a reproducible mock governance chain; share a public entry only after an owned URL passes preflight. Connection Integrity Agent: choose right, keep it safe. |

Total: 8 + 7 + 12 + 15 + 30 + 18 + 15 + 8 + 27 + 8 + 10 + 12 = **180 seconds**. The first two shots are **15 seconds**.

总时长：8 + 7 + 12 + 15 + 30 + 18 + 15 + 8 + 27 + 8 + 10 + 12 = **180 秒**；前两个镜头合计 **15 秒**。

## Recording checklist / 录制清单

1. Run `npm run judge-preflight` and `npm run recording-preflight`; keep every `FAIL` at zero. `WAIVED` means an external item was not exercised, not that it passed.
2. For a reproducible recording, use `npm run build:mock` and `npm run preview -- --host 127.0.0.1 --port 4173`. Keep `mock-build-manifest.json` visible if the judge asks about hosting.
3. If authorised live credentials are available, run the live smoke checks separately and say `live`; otherwise say `mock`, `snapshot`, or `unavailable` exactly as shown by the UI.
4. Never show `.env.local`, terminal secrets, raw prompts or private chain-of-thought. Never call the simulation booking, rebooking or payment.
5. If a stable public URL is available, pass it to preflight with `--public-url`; if it is not available, record the local mock entry and leave the public check `WAIVED`.

1. 运行 `npm run judge-preflight` 与 `npm run recording-preflight`，确保 `FAIL` 为零；`WAIVED` 表示外部项未执行，不表示通过。
2. 为保证可复现，使用 `npm run build:mock` 与 `npm run preview -- --host 127.0.0.1 --port 4173`。评委询问托管方式时可展示 `mock-build-manifest.json`。
3. 只有在授权的实时凭据通过独立 smoke 后才说 `live`；否则按界面准确说 `mock`、`snapshot` 或 `unavailable`。
4. 绝不展示 `.env.local`、终端密钥、原始 prompt 或私有思维链；不要把模拟流程说成 booking、rebooking 或 payment。
5. 若已有稳定公网 URL，用 `--public-url` 交给 preflight；若没有，录制本地 mock 入口并保留公网检查为 `WAIVED`。

## Score map / 评分映射

The official 30 / 30 / 20 / 20 mapping and evidence list are maintained in [JUDGE_PREFLIGHT.md](JUDGE_PREFLIGHT.md). The six judge-critical beats are deliberately budgeted here: Atlas provenance (12s), Agent trace (30s), consent (8s), delay replay (27s), Qoder evidence (12s), and boundary disclosure (10s plus the final 18s).

官方 30 / 30 / 20 / 20 的映射与证据清单维护在[JUDGE_PREFLIGHT.md](JUDGE_PREFLIGHT.md)。六个评委关键点已经在本片分配时间：Atlas 来源（12 秒）、Agent trace（30 秒）、同意（8 秒）、延误回放（27 秒）、Qoder 证据（12 秒）、边界披露（10 秒加最后 18 秒）。
