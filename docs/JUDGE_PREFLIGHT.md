# Judge and recording preflight / 评委与录制前置检查

This is the repeatable delivery check for the current Connection Integrity demo. It is intentionally offline-first: the default path builds a credential-free mock bundle, serves that exact `dist/` through a local static probe, checks the shipped manifest and UI journey, and scans the artifact for server credentials. It does not pretend that a public deployment, live Atlas data, live flight status, Tavily, or an LLM is available.

这是当前 Connection Integrity demo 的可重复交付检查。默认路径优先离线：构建无凭据的 mock 产物，用本地静态探针实际提供这份 `dist/`，检查产物 manifest 和 UI 主流程，并扫描产物中的服务端凭据。它不会把公网部署、实时 Atlas 数据、实时航班动态、Tavily 或 LLM 的可用性说成已验证。

## Commands / 命令

```powershell
npm run judge-preflight
npm run recording-preflight
```

`judge-preflight` and `recording-preflight` print one line per check with exactly one of `PASS`, `FAIL`, or `WAIVED`, followed by a summary. A `WAIVED` item is a deliberately unexecuted external check, not a pass: for example, the live provider route is waived in mock mode and the public URL is waived until an owned URL is supplied.

`judge-preflight` 与 `recording-preflight` 每项检查都打印 `PASS`、`FAIL` 或 `WAIVED`，最后打印汇总。`WAIVED` 表示有意没有执行的外部检查，不等于通过：例如 mock 模式会豁免实时 provider，提交前没有配置自有公网 URL 时会豁免公网探针。

To verify a submission-time public mock entry, do not commit the URL. Deploy only the output of `npm run build:mock` to a stable, owned host, then run:

```powershell
$env:PUBLIC_DEMO_URL = "https://your-owned-demo.example"
npm run recording-preflight -- --public-url $env:PUBLIC_DEMO_URL --require-public-url
```

The preflight expects the host to serve `mock-build-manifest.json`, declare `hosting.api = not-served`, and not answer `/api/agent/chat` with a successful JSON API response. If no URL is supplied, the local static artifact is still checked and the public check is explicitly `WAIVED`; no temporary or anonymous URL is stored in the repository.

提交前如需核对公网 mock 入口，不要把 URL 提交进仓库。只部署 `npm run build:mock` 的产物到自有稳定主机，然后执行上面的命令。preflight 要求主机提供 `mock-build-manifest.json`，其中声明 `hosting.api = not-served`，且 `/api/agent/chat` 不能返回成功的 JSON API 响应。未提供 URL 时仍会检查本地静态产物，并明确输出公网检查为 `WAIVED`；仓库不保存任何临时或匿名 URL。

## What the offline check proves / 离线检查证明什么

- `npm run build:mock` completes with `VITE_FLIGHT_PROVIDER=mock` and `VITE_AGENT_PROVIDER=mock` forced in the process environment.
- `mock-build-manifest.json` declares mock providers, static hosting, no `/api`, and no credentials.
- A real local HTTP probe serves `index.html` and its referenced JavaScript, and the same static probe returns 404 for `/api/agent/chat`.
- The bundle carries the main journey copy and provenance: ATRIP snapshot, Demo fixtures, Demo agent fixture, Agent trace, consent, simulated delay replay, self-transfer, no-policy/unavailable fallbacks, audit trail, and the no-probability boundary.
- Every file in `dist/` is scanned for server credential names, authorization headers, and configured secret values. The check is artifact-based; it is not only a source grep.
- The recording mode parses the numbered shot table and verifies twelve shots, a 180-second total, and an exactly 15-second opening.

- `npm run build:mock` 会强制进程环境中的 `VITE_FLIGHT_PROVIDER=mock` 与 `VITE_AGENT_PROVIDER=mock` 并完成构建。
- `mock-build-manifest.json` 声明 mock provider、静态托管、不提供 `/api`、不包含凭据。
- 本地真实 HTTP 探针提供 `index.html` 和其引用的 JavaScript；同一个静态探针访问 `/api/agent/chat` 时返回 404。
- 产物包含主流程关键文案和来源：ATRIP 快照、Demo fixtures、Demo agent fixture、Agent 轨迹、同意、模拟延误回放、self-transfer、无策略/不可用降级、审计轨迹，以及不声称概率的边界。
- `dist/` 中每个文件都会扫描服务端凭据名、授权请求头和已配置的密钥值。检查针对最终产物，不只是源码 grep。
- recording 模式会解析编号分镜表，验证 12 个镜头、总时长 180 秒、开场恰好 15 秒。

Use `--simulate missing-ui-label` or `--simulate wrong-provenance` to prove the checker fails closed against a deliberately corrupted in-memory artifact. This does not modify `dist/`.

可用 `--simulate missing-ui-label` 或 `--simulate wrong-provenance` 验证检查器会对故意损坏的内存产物报 `FAIL`；不会修改 `dist/`。

## Official score alignment / 官方评分维度对齐

| Dimension / 维度 | Weight / 权重 | Evidence to show / 应展示证据 | Time budget / 时间预算 |
| --- | ---: | --- | ---: |
| Innovation / 创新 | 30 | Seattle is the pain origin; PVG → KUL → SIN is a separate ATRIP Sandbox snapshot case; the policy registry, evidence gate, and LLM-only-speaking boundary make the idea concrete. / Seattle 是痛点起点；PVG → KUL → SIN 是独立的 ATRIP Sandbox 快照案例；策略注册表、证据门槛和“LLM 只说话”边界把想法落成产品。 | 0:00–0:15 and 1:30–1:45 / 15s + 15s |
| Feasibility / 可行性 | 30 | ATRIP provenance, shared Vite/Node handlers, deterministic mock replay, fail-closed unavailable paths, and the explicit static-without-API deployment boundary. Booking, rebooking, payment, cloud deployment, and live status remain unimplemented or unverified. / 展示 ATRIP 来源、Vite/Node 共享 handler、确定性 mock 回放、不可用时失败关闭，以及静态不提供 API 的部署边界。预订、改签、支付、云部署和实时航班动态仍未实现或未验证。 | 0:15–1:30 and 1:45–2:30 / 75s + 45s |
| Qoder evidence / Qoder 证据 | 20 | Show the traceable `docs/QODER_USAGE.md` record, the Agent trace panel, the preflight output, and the deliberate-failure test. / 展示可追溯的 `docs/QODER_USAGE.md` 使用记录、Agent trace 面板、preflight 输出和故意失败测试。 | 2:28–2:40 / 12s |
| Demo / 演示 | 20 | One clear promise in the first 15 seconds; compare the two offers; pass consent; replay the +60-minute event; disclose every live/mock/snapshot/unavailable boundary. / 前 15 秒说清承诺；比较两张报价；经过同意门；回放 +60 分钟事件；披露 live/mock/snapshot/unavailable 的每个边界。 | 0:00–3:00 / 180s |

The score table is a presentation map, not a claim that any judge has awarded these points. The actual acceptance state is the preflight output plus the four required repository commands.

这张表是演示编排，不是声称评委已经给出这些分数。实际验收状态以 preflight 输出和四个必跑仓库命令为准。

## Recording truth table / 录制事实表

| Label / 标签 | Meaning / 含义 |
| --- | --- |
| `live` | A credential-backed route actually exercised by the recording-day smoke check. / 录制当天通过 smoke 的凭据链路。 |
| `mock` | Deterministic provider fixtures and agent fixture; no external provider call. / 确定性 provider fixture 与 Agent fixture，不调用外部 provider。 |
| `snapshot` | The PVG → KUL → SIN values observed from ATRIP on 2026-08-24 and replayed as evidence. / 2026-08-24 从 ATRIP 观察到、作为证据回放的 PVG → KUL → SIN 数值。 |
| `unavailable` | A provider or API path was not available; the product withholds the live result. / provider 或 API 不可用，产品不冒充实时结果。 |

The hosted static mock entry is a convenience surface for judges, not the live product. A live demo requires an owned server deployment of `npm run build` plus `npm run server` with server-side credentials; that deployment is not included or claimed complete by this repository.

托管静态 mock 入口只是方便评委体验，不是实时产品。实时 demo 需要自有服务部署 `npm run build` 与 `npm run server`，并在服务端配置凭据；本仓库不包含、也不声称公网云部署已经完成。
