---
description: Write the Monday review to drafts from attention, costs and spec-renewals. Present the most urgent supplier and review gaps.
---

# weekly-review

Write the Monday review to drafts from attention, costs and spec-renewals. Present the most urgent supplier and review gaps.

Run `npm run formulation -- weekly-review` with the operator’s record and required flags. Consult `npm run formulation -- help` for accepted flags. Use `--json` when reading the result programmatically. For mutations, supply `--by` with the operator’s name. If the record is ambiguous, show the candidates and obtain the intended code. Do not guess.

Show the records behind the answer. Unknown inputs stay unknown. Outputs are internal review material. Drafts stay in `drafts/` and nothing is sent or published.
