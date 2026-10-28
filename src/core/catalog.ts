// CORE (lead-owned). The shape of a car in the catalog, and how its tier is
// decided. Rules: team/CATALOG.md. Data: data/catalog/*.json.

import type { EngineType } from "./engines";
import type { Tier } from "./tiers";

export const BODY_STYLES = ["sedan", "hatchback", "wagon", "coupe", "convertible", "suv", "pickup", "van", "supercar"] as const;
export type BodyStyle = (typeof BODY_STYLES)[number];

/** One entry as written in data/catalog/<make>.json. */
export interface CatalogEntry {
  id: string;
  model: string;
  generation: string;
  variant?: string;
  years: [number, number | null];
  engine: EngineType;
  body: BodyStyle;
  /** Estimated number on (or regularly seen on) North American roads today. */
  naOnRoad: number;
  /** Worldwide production, if known. */
  built?: number;
  aliases?: string[];
  /** Wikimedia Commons category holding photos of this car. */
  commons?: string;
  tierOverride?: Tier;
  tierReason?: string;
  /** A car people get excited about: points ×1.5. Supercars always are. */
  hype?: boolean;
}

export interface CatalogFile {
  make: string;
  cars: CatalogEntry[];
}

/** A catalog car as the app uses it. */
export interface CatalogCar extends Omit<CatalogEntry, "naOnRoad" | "tierOverride" | "tierReason" | "hype"> {
  make: string;
  tier: Tier;
  hype: boolean;
}

/** Tier bands by estimated number on North American roads (team/CATALOG.md). */
export const TIER_BANDS: [Tier, number][] = [
  ["legendary", 50],
  ["exotic", 1_000],
  ["rare", 10_000],
  ["niche", 100_000],
  ["occasional", 1_000_000],
];

export function tierFromOnRoad(onRoad: number): Tier {
  for (const [tier, below] of TIER_BANDS) if (onRoad < below) return tier;
  return "common";
}

export function toCatalogCar(make: string, e: CatalogEntry): CatalogCar {
  const { naOnRoad, tierOverride, tierReason: _reason, hype, ...rest } = e;
  return { ...rest, make, tier: tierOverride ?? tierFromOnRoad(naOnRoad), hype: hype ?? e.body === "supercar" };
}

export const slug = (...parts: (string | undefined)[]) =>
  parts
    .filter(Boolean)
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** make-model-generation[-variant]; the generation is skipped when it just repeats the model. */
export const carId = (make: string, e: Pick<CatalogEntry, "model" | "generation" | "variant">) =>
  slug(make, e.model, e.generation === e.model ? undefined : e.generation, e.variant);

export const carName = (c: Pick<CatalogCar, "make" | "model" | "variant">) => [c.make, c.model, c.variant].filter(Boolean).join(" ");
export const carYears = (c: Pick<CatalogCar, "years">) => `${c.years[0]}–${c.years[1] ?? "now"}`;
