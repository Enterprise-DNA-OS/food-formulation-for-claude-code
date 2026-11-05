<h1 align="center">Food Formulation for Claude Code</h1>

<p align="center">
  <strong>The open-source food formulation register that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your Genesis R&D data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=genesis-rd">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/genesis-rd?utm_source=github&utm_medium=readme&utm_campaign=genesis-rd">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-genesis-rd">Instead of Genesis R&D</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Food Formulation for Claude Code covers the formulation record work inside Genesis R&D, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and combines the records into the questions below. No claim is made that Genesis cannot report the same data.

Genesis does not publish a licence price on its [product page](https://www.trustwell.com/products/genesis/food-formulation-and-labeling/) (checked 5 November 2026). Historical user reports describe five-figure renewals, but they are not current quotes or verified NZ/AU invoices. Compare your own renewal with the work your team uses before switching.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=genesis-rd).

This is the formulation desk for a small food manufacturer: ingredient quantities, supplier specifications, recipe costs, working nutrition calculations, review dates and retained source reports. It keeps missing evidence visible and records who reviewed the inputs. It does not replace a licensed nutrient library, approve labels or certify regulatory compliance.

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no tiers, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

No separate database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/food-formulation-for-claude-code.git
cd food-formulation-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type a slash command. Start with `/attention`. The fictional demonstration has an overdue honey specification shared by three recipes, missing cocoa values, a stale review and a trial without quantities.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
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
| /customise | Change your fields and rules, with a migration and tests. |
| /new-view | Add a read-only report. |

| Command | What it does |
|---|---|
| `/...` | ... |

## Instead of Genesis R&D

The native text import preserves Genesis Recipe Analysis and Report Sections exports unchanged. It does not reconstruct ingredient quantities or extract a licensed nutrient database. Editable records use explicitly mapped CSV after checking units and source values. See [the switching guide](docs/replace-genesis-rd.md) for the commands, mapping and reconciliation checks.

## Architecture

```
food-formulation-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the thesis and the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Food Formulation for Claude Code for your business, migrates your Genesis R&D data, connects it to the rest of your tools, and runs it for you as part of **Omni by Enterprise DNA**, our managed Command Centre. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=genesis-rd)
- Read more: [enterprisedna.co/omni/instead-of/genesis-rd](https://enterprisedna.co/omni/instead-of/genesis-rd?utm_source=github&utm_medium=readme&utm_campaign=genesis-rd)

## License

MIT. Copyright (c) 2026 Enterprise DNA.

## Working model and limits

All seven nutrient values are stored per 100 g of ingredient. Quantities and finished yield drive the working calculations. A missing value makes that nutrient unknown. Mixed currencies make cost unknown. Ingredient edits make any earlier recipe review stale. Reviews retain the exact inputs used. No automatic labels, market claims, cooking retention factors, cross-contact decisions, subrecipe expansion or nutrient library are provided.

`npm run view` writes three read-only reports. `npm run docs` writes recipe cards, draft nutrition worksheets and technical review packs. Set `brand.json` once for business name, colours and logo. `npm test` checks commands, calculations, stale reviews, import rollback, CSV edge cases and generated documents. `npm run demo` installs fictional records and is repeatable. Do not seed a production database with demonstration data.

## Ten questions to ask across your records

These are implemented queries, not claims about what another vendor cannot do.

1. Which recipes have the most missing evidence? `insights blockers`
2. Which overdue supplier sheets affect several recipes? `insights shared-specs`
3. Which servings cost the most to make? `insights cost-per-serve`
4. Which ingredients contribute most of each recipe’s sugar? `insights sugar-drivers`
5. Where is each recipe’s sodium coming from? `insights sodium-drivers`
6. Which recipes lose the most weight during processing? `insights yield-loss`
7. Which recipes depend on each declared allergen? `insights allergen-impact`
8. Which recipes changed after their last technical review? `insights review-changes`
9. Which recipes have a retained Genesis export? `insights import-coverage`
10. Which trials have no recent progress note? `insights quiet-trials`

## Your first hour: ten things to ask for

1. Show this week’s evidence gaps.
2. Show the almond granola’s source records.
3. Find every recipe affected by the overdue honey specification.
4. Compare the two breakfast granola trials.
5. Scale the almond granola to a finished batch of 18 kilograms.
6. Show the sodium contributed by each ingredient in the snack bar.
7. Draft the supplier specification request.
8. Prepare the weekly review for the technical manager.
9. Add a supplier contact field with `/customise`.
10. Add a view of recipes grouped by owner with `/new-view`.
