"use client";

import Link from "next/link";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import SpotCard from "@/components/SpotCard";
import { TIER_INFO, TIERS, type Tier } from "@/core/tiers";
import { DEMO_SPOTS } from "@/features/collection/demo";

export default function Garage() {
  const [filter, setFilter] = useState<Tier | null>(null);
  const spots = DEMO_SPOTS.filter((s) => !filter || s.car.tier === filter);
  const total = DEMO_SPOTS.reduce((sum, s) => sum + s.points, 0);

  return (
    <main>
      <PageHeader title="Garage" demo />
      <section className="mx-4 grid grid-cols-3 gap-2">
        {[
          ["Points", total.toLocaleString()],
          ["Cars", DEMO_SPOTS.length],
          ["Best", TIER_INFO.legendary.label],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-surface px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
            <div className="font-display text-2xl font-bold tabular-nums">{value}</div>
          </div>
        ))}
      </section>

      <div className="mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Chip active={!filter} onClick={() => setFilter(null)}>
          All
        </Chip>
        {[...TIERS].reverse().map((t) => (
          <Chip key={t} active={filter === t} onClick={() => setFilter(filter === t ? null : t)} color={`var(--color-tier-${t})`}>
            {TIER_INFO[t].label}
          </Chip>
        ))}
      </div>

      <section className="mt-3 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3">
        {spots.map((s) => (
          <Link key={s.id} href={`/card/?id=${s.id}`} className="block">
            <SpotCard car={s.car} paint={s.paint} points={s.points} city={s.city} />
          </Link>
        ))}
      </section>
      {spots.length === 0 && <p className="mt-10 text-center text-sm text-muted">No {filter} cars yet.</p>}
    </main>
  );
}

function Chip({ active, onClick, color, children }: { active: boolean; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${active ? "border-accent bg-accent/15 text-accent" : "border-line text-muted"}`}
      style={active && color ? { borderColor: color, color, background: `color-mix(in srgb, ${color} 14%, transparent)` } : undefined}
    >
      {children}
    </button>
  );
}
