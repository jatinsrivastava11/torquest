// CORE (lead-owned). Enforces team/CATALOG.md on every entry.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BODY_STYLES, carId, slug, tierFromOnRoad, toCatalogCar, type CatalogFile } from "@/core/catalog";
import { ENGINE_TYPES } from "@/core/engines";
import { TIERS } from "@/core/tiers";

const dir = join(__dirname, "../../data/catalog");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .map((f) => ({ file: f, data: JSON.parse(readFileSync(join(dir, f), "utf8")) as CatalogFile }));
const all = files.flatMap(({ data }) => data.cars.map((c) => ({ make: data.make, c })));
const thisYear = new Date().getFullYear();

describe("catalog", () => {
  it("has data", () => expect(all.length).toBeGreaterThan(0));

  it.each(files)("$file is named after its make", ({ file, data }) => {
    expect(file).toBe(`${slug(data.make)}.json`);
  });

  it("has unique ids built from make, model, generation and variant", () => {
    const seen = new Set<string>();
    for (const { make, c } of all) {
      expect(c.id, c.id).toBe(carId(make, c));
      expect(seen.has(c.id), `duplicate ${c.id}`).toBe(false);
      seen.add(c.id);
    }
  });

  it("has valid fields", () => {
    for (const { c } of all) {
      const at = c.id;
      expect(ENGINE_TYPES, at).toContain(c.engine);
      expect(BODY_STYLES, at).toContain(c.body);
      expect(c.years[0], at).toBeGreaterThanOrEqual(1900);
      expect(c.years[0], at).toBeLessThanOrEqual(thisYear + 1);
      if (c.years[1] !== null) expect(c.years[1], at).toBeGreaterThanOrEqual(c.years[0]);
      expect(Number.isInteger(c.naOnRoad) && c.naOnRoad >= 0, at).toBe(true);
      if (c.built) expect(c.built, `${at}: more on NA roads than were ever built`).toBeGreaterThanOrEqual(c.naOnRoad);
      if (c.tierOverride) {
        expect(TIERS, at).toContain(c.tierOverride);
        expect(c.tierReason?.length, `${at}: tierOverride needs a tierReason`).toBeGreaterThan(10);
      }
    }
  });

  it("only gives variants an entry when they're rarer than their base car", () => {
    const tier = (make: string, c: (typeof all)[number]["c"]) => TIERS.indexOf(toCatalogCar(make, c).tier);
    for (const { make, c } of all.filter(({ c }) => c.variant)) {
      const base = all.find((b) => b.make === make && b.c.model === c.model && b.c.generation === c.generation && !b.c.variant);
      expect(base, `${c.id} has no base entry`).toBeDefined();
      expect(tier(make, c), `${c.id} isn't rarer than ${base!.c.id}`).toBeGreaterThan(tier(make, base!.c));
    }
  });

  it("maps road counts to tiers at the documented bands", () => {
    expect(tierFromOnRoad(0)).toBe("legendary");
    expect(tierFromOnRoad(49)).toBe("legendary");
    expect(tierFromOnRoad(50)).toBe("exotic");
    expect(tierFromOnRoad(9_999)).toBe("rare");
    expect(tierFromOnRoad(10_000)).toBe("niche");
    expect(tierFromOnRoad(999_999)).toBe("occasional");
    expect(tierFromOnRoad(1_000_000)).toBe("common");
  });
});
