# Catalog rows

Compact source rows for `data/catalog/<make>.json`, one file per make. Regenerate a make with:

    node scripts/catalog-from-rows.mjs "<Make>" data/catalog-rows/<make>.txt

Format and rules: the header of `scripts/catalog-from-rows.mjs` and `team/CATALOG.md`.
`_excluded-*.json` files hold models from Jatin's list left out on purpose, merged into
`data/catalog/_excluded.json`.
