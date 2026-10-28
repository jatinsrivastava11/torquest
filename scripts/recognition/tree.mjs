// CORE (lead-owned). Crawls a Commons category tree (titles only) with a
// disk cache, so repeated runs don't hit the API.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { commons } from "./commons.mjs";

const CACHE = ".cache/recognition/trees";

// Branches that never hold clean photos of a production car.
export const NOISE = /\b(in art|in competition|in police|police|model automobiles|models|toys|logos|interiors?|dashboards?|engines?|manufacture|tuning|concept|development|mules|replicas?|at the |at [A-Z]|museum|in film|in popular culture|accidents?|wrecks?|taxis?|by country|in [A-Z][a-z]+$|quality images|by photographer|by colou?r|crash)\b/i;

async function subcats(title) {
  const out = [];
  let cont = {};
  do {
    const j = await commons({ action: "query", list: "categorymembers", cmtitle: title, cmtype: "subcat", cmlimit: "500", ...cont });
    out.push(...j.query.categorymembers.map((m) => m.title));
    cont = j.continue ?? null;
  } while (cont);
  return out;
}

/** Map of category -> its subcategories, down to `depth` levels. */
export async function crawl(root, depth = 3) {
  mkdirSync(CACHE, { recursive: true });
  const file = `${CACHE}/${root.replace(/[^a-z0-9]+/gi, "_")}.${depth}.json`;
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const tree = {};
  let level = [root];
  for (let d = 0; d < depth && level.length; d++) {
    const next = [];
    for (const t of level) {
      if (tree[t]) continue;
      tree[t] = (await subcats(t)).filter((c) => !NOISE.test(c.replace(/^Category:/, "")));
      next.push(...tree[t]);
    }
    level = next;
  }
  writeFileSync(file, JSON.stringify(tree));
  return tree;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tree = await crawl(process.argv[2], Number(process.argv[3] ?? 2));
  for (const [k, v] of Object.entries(tree)) console.log(`${k}\n  ${v.join("\n  ")}`);
}
