# Iteration 2 Negotiation

## 对 Iteration 2 Reviewer Addendum 的回应

1. **Critical — 将 deterministic recommendation 与具名 baseline Agent evidence 分开**
   - 决定：接受。
   - 理由：结果正确但语义容器混杂，仍足以让评委把 115/185 看成未修复的计算错误。
   - 本轮行动：让确定性 choice/Receipt 独立可见；把 Agent evidence 默认折叠并明确它属于哪一个 baseline 候选。

2. **Critical — 使 pre-change v5 browser research cache 失效或迁移**
   - 决定：接受，选择不接受旧 v5 语义。
   - 理由：旧自由文本不能被安全地重新解释为当前 ownership 合同；让它继续读取会破坏当前产品结论。
   - 本轮行动：当前流程只接受有明确新语义身份的记录，并证明未过期 v5 不会重现旧文案。

3. **Important — CTA 与 research-ready 文案不再称 Agent 选择最终候选**
   - 决定：接受。
   - 理由：用户可见文案必须与已经落地的确定性选择责任一致。
   - 本轮行动：所有核心状态与评委资料说明 Agent 查证/解释 evidence，确定性比较作出候选选择；不削弱 Agent 的证据、time-fit 与解释职责。

4. **Important — 从评分 gap 中移除 WAIVED video 的 `+4`，并回归验证**
   - 决定：接受。
   - 理由：豁免事项不应成为完成分数的虚假缺口，也不能反向抬高产品改进的必要范围。
   - 本轮行动：保持 video 为可见的 `WAIVED` 边界，确保评分输出和门禁都不给它加分或扣分含义。

5. **Important — 390px policy source link 保持可读且无横向溢出**
   - 决定：接受。
   - 理由：移动端不溢出只是最低要求，逐字换行仍不是可展示的体验。
   - 本轮行动：将 source link 作为可读文本验收，同时保留四个关键状态的 no-overflow 证明。

## 不可协商边界

- 决定性比较拥有最终选择；Agent 只负责受约束的证据查证、time-fit assessment 与解释。
- 不将缓存、mock、snapshot 或 deterministic 结果伪称为实时 Atlas、实时航班状态或真实服务执行。
- video 继续 `WAIVED` 且排除本轮评分；不得将其伪造为 PASS 或作为 95 分补分。
- Receipt 与反事实继续不得声明真实避险、保护票、概率或因果成功。
