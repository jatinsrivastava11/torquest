#!/usr/bin/env node
// CORE (lead-owned). Checks every model in Jatin's original list is either in
// the catalog (by model name, variant or alias) or in _excluded.json.
//   npm run coverage            # summary and the first misses
//   npm run coverage -- --all   # every miss

import { readdirSync, readFileSync } from "node:fs";

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const list = readdirSync("data/source/jatin-list")
  .filter((f) => f.endsWith(".tsv"))
  .flatMap((f) => readFileSync(`data/source/jatin-list/${f}`, "utf8").trim().split("\n").slice(1).map((l) => l.split("\t")))
  .map(([make, model]) => ({ make, model }));

const names = new Set();
for (const f of readdirSync("data/catalog").filter((f) => f.endsWith(".json") && !f.startsWith("_"))) {
  const d = JSON.parse(readFileSync(`data/catalog/${f}`, "utf8"));
  for (const c of d.cars) {
    const forms = [c.model, `${c.model} ${c.variant ?? ""}`, `${c.model} ${c.generation}`, c.variant, `${c.generation} ${c.variant ?? ""}`, ...(c.aliases ?? [])];
    for (const n of forms) if (n) names.add(`${norm(d.make)}|${norm(n)}`);
  }
}
const excluded = new Map(JSON.parse(readFileSync("data/catalog/_excluded.json", "utf8")).models.map((x) => [`${norm(x.make)}|${norm(x.model)}`, x.reason]));

const misses = list.filter(({ make, model }) => {
  const k = `${norm(make)}|${norm(model)}`;
  return !names.has(k) && !excluded.has(k);
});
const byMake = new Map();
for (const m of misses) byMake.set(m.make, [...(byMake.get(m.make) ?? []), m.model]);
console.log(`Jatin's list: ${list.length} models. Covered: ${list.length - misses.length}. Missing: ${misses.length}.`);
const all = process.argv.includes("--all");
for (const [make, models] of [...byMake].sort()) console.log(`  ${make}: ${(all ? models : models.slice(0, 8)).join(", ")}${!all && models.length > 8 ? ` (+${models.length - 8})` : ""}`);
process.exit(misses.length ? 2 : 0);
