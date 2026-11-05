---
description: Read a recipe’s supplier allergen declarations. Unknown is not allergen-free.
---

# allergens

Read a recipe’s supplier allergen declarations. Unknown is not allergen-free.

Run `npm run formulation -- allergens` with the operator’s record and required flags. Consult `npm run formulation -- help` for accepted flags. Use `--json` when reading the result programmatically. For mutations, supply `--by` with the operator’s name. If the record is ambiguous, show the candidates and obtain the intended code. Do not guess.

Show the records behind the answer. Unknown inputs stay unknown. Outputs are internal review material. Drafts stay in `drafts/` and nothing is sent or published.
