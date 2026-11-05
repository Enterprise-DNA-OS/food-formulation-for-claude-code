---
description: Change specified ingredient fields. Read where-used first because this changes recipe calculations.
---

# set-ingredient

Change specified ingredient fields. Read where-used first because this changes recipe calculations.

Run `npm run formulation -- set-ingredient` with the operator’s record and required flags. Consult `npm run formulation -- help` for accepted flags. Use `--json` when reading the result programmatically. For mutations, supply `--by` with the operator’s name. If the record is ambiguous, show the candidates and obtain the intended code. Do not guess.

Show the records behind the answer. Unknown inputs stay unknown. Outputs are internal review material. Drafts stay in `drafts/` and nothing is sent or published.
