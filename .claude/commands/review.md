---
description: Record a technical review with a named reviewer and note after evidence checks pass. This is not label approval.
---

# review

Record a technical review with a named reviewer and note after evidence checks pass. This is not label approval.

Run `npm run formulation -- review` with the operator’s record and required flags. Consult `npm run formulation -- help` for accepted flags. Use `--json` when reading the result programmatically. For mutations, supply `--by` with the operator’s name. If the record is ambiguous, show the candidates and obtain the intended code. Do not guess.

Show the records behind the answer. Unknown inputs stay unknown. Outputs are internal review material. Drafts stay in `drafts/` and nothing is sent or published.
