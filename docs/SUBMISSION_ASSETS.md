# Submission assets / 提交素材

This index separates repository evidence, visual assets, editable design material, and external items that still require a human. It contains no credentials.

本索引将仓库证据、视觉素材、可编辑设计源文件与仍需人工完成的外部材料分开，不包含任何凭据。

## Canonical links / 核心链接

- Repository / 仓库：<https://github.com/ZaVang/Ali_Atlus_hackthon>
- Editable Figma audit board / 可编辑 Figma 审计板：<https://www.figma.com/design/vjSNq7p6fOq230QfjCc38s?node-id=4-2>
- Final evaluator report / 最终评委报告：[`docs/orch/eval.md`](orch/eval.md)
- Judge score contract / 评委评分合同：[`docs/JUDGE_EVIDENCE.json`](JUDGE_EVIDENCE.json)

## Tracked visual bundle / 已跟踪视觉素材

The complete curated bundle lives under [`verify-screenshots/current/`](../verify-screenshots/current/). Its README distinguishes final product captures from earlier supporting evidence.

完整素材包位于 [`verify-screenshots/current/`](../verify-screenshots/current/)，目录 README 会区分最终界面截图与较早的辅助证据。

Final audit set / 最终审计组：

- `current-11-final-desktop-main.png`
- `current-12-resilience-receipt-mobile.png`
- `current-13-airline-replay-mobile.png`
- `current-14-itinerary-policy-mobile.png`
- `figma-product-audit-board.png`

Supporting material / 辅助素材：

- Provider/research/scenario captures: `current-1` through `current-10`, plus `header-trace.png`, `itinerary-recheck.png`, and `airline-replay.png`.
- `demo-submission.mp4`: an exactly 180-second machine-assembled H.264 visual artifact with no narration/audio. It is supporting material, not proof of a human-recorded final demo.
- `demo-sequence.txt`: the deterministic source sequence for the visual artifact.

## Evidence documents / 证据文档

- Product contract: [`CONNECTION_INTEGRITY_DEMO.md`](CONNECTION_INTEGRITY_DEMO.md)
- Scope and limitations: [`SCOPE_AND_LIMITATIONS.md`](SCOPE_AND_LIMITATIONS.md)
- Judge preflight: [`JUDGE_PREFLIGHT.md`](JUDGE_PREFLIGHT.md)
- Judge scorecard: [`JUDGE_SCORECARD.md`](JUDGE_SCORECARD.md)
- Qoder usage: [`QODER_USAGE.md`](QODER_USAGE.md) / [`QODER_USAGE.zh-CN.md`](QODER_USAGE.zh-CN.md)
- Demo walkthrough: [`DEMO_WALKTHROUGH.zh-CN.md`](DEMO_WALKTHROUGH.zh-CN.md)
- Demo script and artifact evidence: [`DEMO_VIDEO_SCRIPT.md`](DEMO_VIDEO_SCRIPT.md) / [`DEMO_VIDEO_EVIDENCE.md`](DEMO_VIDEO_EVIDENCE.md)

## Intentionally excluded / 有意排除

- `.env.local`, credentials, tokens, and request headers.
- `node_modules/`, `dist/`, `.test-build/`, and machine caches.
- `verify-screenshots/legacy/`: pre-pivot exploration, not current product evidence.
- `.qoder/`: IDE-generated RepoWiki cache, not Qoder session provenance.
- `atrip-sample.json`: one-off raw inspection payload with time-sensitive pricing.

## Human/external submission items / 仍需人工或外部完成

- A human-narrated/replayed public video link, if the official form requires one.
- Qoder session/Quest/Canvas export and human provenance review.
- Authorized real flight-status and Atlas servicing proof; the shipped `+60 min` operational event remains an explicit simulation.
