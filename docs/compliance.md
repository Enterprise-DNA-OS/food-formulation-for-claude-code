# Record checks and the reviewer’s responsibility

Checked 5 November 2026. This system organises food formulation records. It does not certify food, approve labels, determine allergen safety or make nutrition claims. The food business and its qualified technical reviewer retain those decisions.

| Rule | What the check does | Authority and limit |
|---|---|---|
| NIP-01 | Flags absent finished yield, serving weight or pack weight | [FSANZ nutrition information panels](https://www.foodstandards.gov.au/consumer/labelling/panels) describes information per serving and per 100 g or 100 mL. Pack weight supports calculating servings per pack. This build handles grams, not volume. |
| NIP-02 | Flags missing energy, protein, fat, saturated fat, carbohydrate, sugars or sodium inputs | [FSANZ NPC guidance](https://www.foodstandards.gov.au/business/labelling/nutrition-panel-calculator/frequently-asked-questions) lists these components and places source-data suitability with the business. Unknown is not zero. |
| ALLERGEN-01 | Flags ingredients with no recorded supplier allergen declaration | [FSANZ allergen guidance](https://www.foodstandards.gov.au/business/labelling/allergen-labelling) explains required names and declaration placement. The check does not verify those names, exemptions, sulphite thresholds, gluten, bold text, compound ingredients or cross-contact. An empty declaration means reviewed as none declared, not proven allergen-free. |
| EVIDENCE-01 | Flags absent source references and past or missing supplier review dates | Local operating policy, not a statutory renewal interval. The operator sets each due date from their risk assessment. |
| FORMULA-01 | Flags recipes with no ingredient quantities | Local completeness check. |
| REVIEW-01 | Flags no review, changed inputs or overdue technical review | Local operating policy. Editing an ingredient invalidates the current review of every recipe using it. Review dates are operator-defined. |

## Calculation scope

Each ingredient carries nutrient values per 100 g. Multiply each value by ingredient grams / 100, add contributions, divide by finished yield and multiply by 100 or by serving grams. Supplier energy is used directly. No invented energy factor or conversion from salt to sodium. Total nutrient retention is assumed: cooking losses, fermentation, absorption, draining, density, rounding, claims, additives, fortification and volume-based foods require a reviewed extension. Do not use these working figures as finished labels.

The nutrition worksheet includes seven components, serving and pack information, but deliberately remains an internal worksheet. It does not assert compliance with the full Food Standards Code. A clean check means only that the listed checks found no missing records. Reviews store the exact inputs and a named reviewer, not a product release.

The demo nutrient values are fictional, created to exercise calculations. No vendor or government nutrient database is bundled. Obtain licensed or supplier-authorised values and review them before production use.
