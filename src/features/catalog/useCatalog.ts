"use client";

import { useEffect, useState } from "react";
import type { CatalogCar } from "@/core/catalog";

let cache: Promise<CatalogCar[]> | null = null;

/** The compiled catalog (public/catalog.json), fetched once per session. */
export function loadCatalog() {
  cache ??= fetch("/catalog.json")
    .then((r) => {
      if (!r.ok) throw new Error(`catalog ${r.status}`);
      return r.json();
    })
    .then((j: { cars: CatalogCar[] }) => j.cars)
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}

export function useCatalog() {
  const [cars, setCars] = useState<CatalogCar[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    loadCatalog().then(setCars, () => setError(true));
  }, []);
  return { cars, error };
}

/** Lowercased text a search query is matched against. */
export const searchText = (c: CatalogCar) =>
  [c.make, c.model, c.generation, c.variant, ...(c.aliases ?? []), String(c.years[0])].filter(Boolean).join(" ").toLowerCase();
