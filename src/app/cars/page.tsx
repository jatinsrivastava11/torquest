"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import TierBadge from "@/components/TierBadge";
import { carYears, type CatalogCar } from "@/core/catalog";
import { TIER_INFO, TIERS, type Tier } from "@/core/tiers";
import { searchText, useCatalog } from "@/features/catalog/useCatalog";

export default function CarsPage() {
  const { cars, error } = useCatalog();
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<Tier | null>(null);

  const shown = useMemo(() => {
    if (!cars) return [];
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return cars
      .filter((c) => (!tier || c.tier === tier) && words.every((w) => searchText(c).includes(w)))
      .sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || a.years[0] - b.years[0]);
  }, [cars, query, tier]);

  const groups = useMemo(() => {
    const m = new Map<string, CatalogCar[]>();
    for (const c of shown) m.set(c.make, [...(m.get(c.make) ?? []), c]);
    return [...m];
  }, [shown]);

  return (
    <main>
      <PageHeader title="All cars" sub={cars ? `${cars.length} cars in the catalog` : "Loading the catalog…"} />
      <div className="sticky top-0 z-20 bg-bg/95 px-4 pb-2 pt-1 backdrop-blur">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: 911 GT3, Civic Type R, F40…"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <div className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {[...TIERS].reverse().map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(tier === t ? null : t)}
              className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium"
              style={
                tier === t
                  ? { borderColor: `var(--color-tier-${t})`, color: `var(--color-tier-${t})`, background: `color-mix(in srgb, var(--color-tier-${t}) 14%, transparent)` }
                  : { borderColor: "var(--color-line)", color: "var(--color-muted)" }
              }
            >
              {TIER_INFO[t].label}
              {cars ? ` ${cars.filter((c) => c.tier === t).length}` : ""}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="px-4 py-8 text-center text-sm text-muted">Couldn't load the catalog. Check your connection and reload.</p>}
      {cars && shown.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">No cars match.</p>}

      {groups.map(([make, list]) => (
        <section key={make} className="mt-3">
          <h2 className="px-4 pb-1 font-display text-sm font-semibold uppercase tracking-widest text-muted">
            {make} <span className="text-muted/60">· {list.length}</span>
          </h2>
          <ul className="mx-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {list.map((c) => (
              <li key={c.id}>
                <Link href={`/car/?id=${c.id}`} className="flex items-center gap-3 px-3 py-2.5 active:bg-raised">
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: `var(--color-tier-${c.tier})` }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {c.model}
                      {c.variant ? ` ${c.variant}` : ""}
                      {c.hype && <span className="ml-1.5 text-xs text-accent">★</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {c.generation !== c.model ? `${c.generation} · ` : ""}
                      {carYears(c)}
                    </span>
                  </span>
                  <TierBadge tier={c.tier} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="h-6" />
    </main>
  );
}
