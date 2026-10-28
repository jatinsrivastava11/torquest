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
      <PageHeader title="All cars" sub={cars ? `${cars.length.toLocaleString()} cars you can spot, and what each is worth` : "Loading the catalog…"} />
      <div className="sticky top-0 z-20 bg-bg px-4 pb-2 pt-1 md:top-12 md:px-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: 911 GT3, Civic Type R, F40…"
          aria-label="Search the catalog"
          className="h-11 w-full rounded-full bg-surface px-4 text-[16px] placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-control"
        />
        <div className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {[...TIERS].reverse().map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(tier === t ? null : t)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ${tier === t ? "bg-white text-black" : "bg-surface text-[#bbbbbb]"}`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(--color-tier-${t})` }} />
              {TIER_INFO[t].label}
              {cars && <span className="num opacity-60">{cars.filter((c) => c.tier === t).length}</span>}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="px-4 py-8 text-center text-[14px] text-muted">Couldn't load the catalog. Check your connection and reload.</p>}
      {cars && shown.length === 0 && <p className="px-4 py-8 text-center text-[14px] text-muted">No cars match.</p>}

      {groups.map(([make, list]) => (
        <section key={make} className="mt-3">
          <h2 className="px-4 pb-1.5 pt-2 text-[16px] font-semibold md:px-6">
            {make} <span className="num font-normal text-muted">{list.length}</span>
          </h2>
          <ul className="mx-4 overflow-hidden rounded-[20px] bg-surface py-1 md:mx-6">
            {list.map((c) => (
              <li key={c.id}>
                <Link href={`/car/?id=${c.id}`} className="flex min-h-[52px] items-center gap-3 px-4 py-2 active:bg-raised">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">
                      {c.model}
                      {c.variant ? ` ${c.variant}` : ""}
                    </span>
                    <span className="num block truncate text-[13px] text-muted">
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
