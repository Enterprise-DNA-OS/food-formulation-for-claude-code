# Moving records from Genesis R&D

## Keep the original export

Trustwell’s [Recipe Export Options](https://esharesearch.atlassian.net/wiki/spaces/GENFOOD/pages/2448031759/Recipe+Export+Options) documents **Recipe Analysis** as a text export and **Report Sections** as a single text file. Open the recipe, select the export option and save the text file. Convert an old Windows encoding to UTF-8 if needed. The native recipe archive is `.exl`; this importer does not read it.

Create a recipe shell, then retain its exported report in one command:

```bash
npm run formulation -- add-recipe --code=MY-001 --name="My recipe" --by="Technical manager"
npm run formulation -- import genesis-rd imports/my-recipe.txt --recipe=MY-001 --by="Technical manager" --dry-run
npm run formulation -- import genesis-rd imports/my-recipe.txt --recipe=MY-001 --by="Technical manager"
```

The report is stored unchanged as evidence, with a checksum, import time and operator. Repeating the same report for the same recipe adds no duplicate. Different versions remain available. Dry run rolls back everything. This is a source-report import, not an editable recipe import. No nutrient value or ingredient quantity is guessed from a report’s layout.

## Bring across editable records

Export the reports containing your ingredient quantities and nutrient values, then prepare CSV files using the headers in `examples/`. Genesis report layouts vary; a technical reviewer must confirm units, the per-100-g basis and the meaning of each column. This mapping is part of the managed switch. The free version provides the mapping importer; it does not claim that our example is a vendor export.

```bash
npm run formulation -- import csv imports/ingredients.csv --kind=ingredients --by="Technical manager" --dry-run
npm run formulation -- import csv imports/ingredients.csv --kind=ingredients --by="Technical manager"
npm run formulation -- import csv imports/recipes.csv --kind=recipes --by="Technical manager"
npm run formulation -- import csv imports/lines.csv --kind=lines --by="Technical manager"
```

For differently named source headers, supply `--map=imports/map.json`. It maps destination fields to source headers, for example `{"code":"Item Code","name":"Description","sodium_mg":"Sodium mg per 100g"}`. Only explicitly mapped fields are read. Unknown unmapped headers fail rather than disappearing. Every file imports atomically and duplicate keys within a file fail. Codes are stable, case-sensitive import keys; use the same case on repeat imports. Existing codes update only supplied fields. Blank cells leave fields unchanged; `unknown` clears a numeric value or review date. Allergen names use `|`; `none` records a reviewed empty declaration. Missing allergen evidence stays unknown.

Ingredient costs are per kilogram and each recipe has one currency. No exchange-rate conversion. Nutrients are per 100 g, energy in kJ and sodium in mg. Ingredients, recipes and lines are separate imports in that order. No nested recipe quantities are inferred: flatten a subrecipe under review or add a versioned subrecipe extension with `/customise`.

## Reconcile before switching

Compare recipe counts, ingredient counts, weights, finished yields and a sample of nutrient calculations with the source. Check every currency and unit. Run `/compliance`, keep missing evidence visible, and have the technical reviewer sign the input records. Retain the previous system until those checks pass. The move is not promised in a day when source mapping or evidence is incomplete.

What stays outside: Trustwell’s licensed ingredient library, EXL archives, label artwork, historical permissions, cloud connections, regulatory updates and market-specific certification. Export only records you have rights to use. The new working database keeps your own records, supplier evidence and review history.

`export` writes all seven record types to CSV, including raw report text and review snapshots. These are readable backups, not an automatic full-database restore format; use database backups for recovery. The structured import accepts the documented business fields, not exported internal IDs or audit columns.
