// CORE (lead-owned). Compiles data/catalog/*.json into public/catalog.json,
// the file the app downloads. Runs before dev and build.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toCatalogCar, type CatalogFile } from "../src/core/catalog.ts";

const dir = "data/catalog";
const cars = readdirSync(dir)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .sort()
  .flatMap((f) => {
    const file = JSON.parse(readFileSync(join(dir, f), "utf8")) as CatalogFile;
    return file.cars.map((c) => toCatalogCar(file.make, c));
  });

mkdirSync("public", { recursive: true });
writeFileSync("public/catalog.json", JSON.stringify({ generated: new Date().toISOString(), cars }));
console.log(`catalog: ${cars.length} cars`);
