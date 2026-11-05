# Food Formulation for Claude Code

## Operator

Business: [your business]. Operator: [your name]. Priority: accurate formulation records and named technical review.

Read this file first. Work with the operator’s database through `npm run formulation`. `npm run formulation -- help` lists accepted flags. Reads support `--json`; mutations need `--by`. Record codes and unique names resolve case-insensitively; ambiguous matches list candidates and fail. Dates use YYYY-MM-DD. Numeric unknowns are never zero.

| Job | Outcome |
|---|---|
| /ingredients | Read ingredient prices, sources and review dates. |
| /recipes | Read the recipe register and owners. |
| /recipe | Read one recipe, its ingredients, notes and retained reports. Use a code or unique name. |
| /costs | Compare batch and serving ingredient costs. Unknown inputs stay unknown. |
| /nutrition | Read a recipe’s working nutrition values. These are not approved labels. |
| /allergens | Read a recipe’s supplier allergen declarations. Unknown is not allergen-free. |
| /spec-renewals | Find missing, overdue and near-due supplier specifications. |
| /where-used | Find every recipe using one ingredient. |
| /changes | Find recipes whose technical review is stale. |
| /attention | Read all evidence and review gaps, grouped by recipe. |
| /compliance | Run the limited record checks with their sources. Read docs/compliance.md and explain the limits. |
| /insights | Run the ten management questions. One key selects one question. |
| /scale | Scale a recipe’s quantities to a target finished weight without changing the database. |
| /compare | Compare the calculated nutrients of two recipe versions. |
| /add-ingredient | Create an ingredient from supplied evidence. Do not invent nutrients or allergen declarations. |
| /set-ingredient | Change specified ingredient fields. Read where-used first because this changes recipe calculations. |
| /add-recipe | Create a recipe shell with a unique code, owner and weights where known. |
| /set-recipe | Change recipe details or archive a recipe. Preserve unknowns. |
| /set-line | Set an ingredient quantity in a recipe. Read the recipe first. |
| /log | Add a dated note to a recipe, or use --ingredient for an ingredient. |
| /review | Record a technical review with a named reviewer and note after evidence checks pass. This is not label approval. |
| /import | Read docs/replace-genesis-rd.md. Retain native text reports or import explicitly mapped CSV. Dry run first, reconcile counts, then apply. |
| /export | Write every record type as CSV to a new private directory. |
| /weekly-review | Write the Monday review to drafts from attention, costs and spec-renewals. Present the most urgent supplier and review gaps. |
| /draft-spec-request | Read an ingredient and its usage, then draft a supplier evidence request. Never send. |
| /customise | Change a field, rule or view through a new migration and meaningful tests. |
| /new-view | Add a read-only HTML report using views.json. |

Never invent supplier evidence, nutrients, prices, allergens, source provenance or a reviewer. Read the whole record and where-used before changing an ingredient. Ask for the actual human’s name for a review. Reviews attest to the input records only and never authorise label release. Read docs/compliance.md before interpreting any findings.

Nothing sends, publishes, deletes or writes to external services. All messages are drafts. Preserve historical source reports and review snapshots. No arbitrary SQL supplied by files is executed by import. Use new migration files for schema changes; do not edit applied migrations. Reconcile exports and test backup recovery before moving production data.

Local PGlite lives under .data/db. DATABASE_URL selects an operator-managed Postgres database. Do not load operational credentials into tests. npm test always uses an isolated temporary database unless TEST_DATABASE_URL explicitly names an empty disposable Postgres database.

Built by Enterprise DNA. Managed setup and ongoing operation: Omni by Enterprise DNA.
