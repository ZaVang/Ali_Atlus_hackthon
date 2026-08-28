# Product Loop Pitfalls

- **Provider honesty:** mock, snapshot, deterministic, live, user, and unavailable states must remain distinct; no static or mock path may be described as a live provider call.
- **Atlas boundary:** only the confirmed read-only `search.do` contract is implemented. Do not add or claim verify, booking, payment, servicing, flight-status, or protected-ticket execution without separate authority and evidence.
- **No fake probability:** the product may compare published thresholds and deterministic event outcomes, but it must not show a calibrated missed-connection probability.
- **Candidate identity:** every displayed fare, connection time, remaining time, and recommendation must remain bound to the named flight combination.
- **Counterfactual wording:** `55 vs 125` is a deterministic replay comparison, not proof of a real avoided misconnect or causal pilot outcome.
- **Shared worktree:** preserve unrelated changes, stage only owned files if committing, and never reset or clean the workspace.
- **Windows:** use `npm.cmd`; do not infer a failed gate from a missing dependency or a PowerShell subprocess quirk.
- **Video waiver:** do not spend this sprint on video recording. On-screen demo clarity and existing video-independent checks remain in scope.
