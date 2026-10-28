// CORE (lead-owned). The shape of a car in the catalog.

import type { EngineType } from "./engines";
import type { Tier } from "./tiers";

export const BODY_STYLES = ["sedan", "hatchback", "wagon", "coupe", "convertible", "suv", "pickup", "van", "supercar"] as const;
export type BodyStyle = (typeof BODY_STYLES)[number];

export interface CatalogCar {
  /** Stable slug, e.g. "porsche-911-992-gt3-rs". */
  id: string;
  make: string;
  model: string;
  /** Generation name or code, e.g. "992", "Mk7", "S550". */
  generation: string;
  /** Set only for variants that get their own entry, e.g. "GT3 RS". */
  variant?: string;
  years: [number, number | null];
  tier: Tier;
  engine: EngineType;
  body: BodyStyle;
  /** Rough number built, if known. */
  built?: number;
}

export const carName = (c: CatalogCar) => [c.make, c.model, c.variant].filter(Boolean).join(" ");
export const carYears = (c: CatalogCar) => `${c.years[0]}–${c.years[1] ?? "now"}`;
