"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import SpotCard from "@/components/SpotCard";
import { carName, carYears } from "@/core/catalog";
import { ENGINE_LABELS } from "@/core/engines";
import { HYPE, TIER_INFO } from "@/core/tiers";
import { useCatalog } from "@/features/catalog/useCatalog";

const EngineViewer = dynamic(() => import("@/features/engines").then((m) => m.EngineViewer), {
  ssr: false,
  loading: () => <div className="flex h-[340px] items-center justify-center text-sm text-muted">Loading engine…</div>,
});

// Neutral paint for catalog previews; spotted cars use the photo's colour.
const PAINT = "#8a919c";

export default function CarPage() {
  return (
    <Suspense>
      <CarDetail />
    </Suspense>
  );
}

function CarDetail() {
  const id = useSearchParams().get("id");
  const { cars, error } = useCatalog();
  const [engineOpen, setEngineOpen] = useState(false);
  const car = cars?.find((c) => c.id === id);

  if (!cars) return <main className="p-6 text-center text-sm text-muted">{error ? "Couldn't load the catalog." : "Loading…"}</main>;
  if (!car) {
    return (
      <main className="p-6 text-center text-muted">
        Car not found. <Link href="/cars/" className="text-accent underline">All cars</Link>
      </main>
    );
  }
  const points = Math.round(TIER_INFO[car.tier].points * (car.hype ? HYPE : 1));
  const related = cars.filter((c) => c.make === car.make && c.model === car.model && c.id !== car.id);

  return (
    <main className="px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <Link href="/cars/" className="text-sm text-muted">← All cars</Link>
      <div className="mx-auto mt-3 max-w-[280px]">
        <SpotCard car={car} paint={PAINT} points={points} size="hero" />
      </div>

      <h1 className="mt-6 font-display text-3xl font-bold leading-tight">{carName(car)}</h1>
      <p className="text-sm text-muted">
        {car.generation !== car.model ? `${car.generation} · ` : ""}
        {carYears(car)}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {[
          ["Tier", TIER_INFO[car.tier].label],
          ["Points", `${points.toLocaleString()}${car.hype ? " (hype ×1.5)" : ""}`],
          ["On NA roads", `~${car.naOnRoad.toLocaleString()}`],
          ["Built", car.built ? `~${car.built.toLocaleString()}` : "—"],
          ["Engine", ENGINE_LABELS[car.engine]],
          ["Body", car.body[0].toUpperCase() + car.body.slice(1)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-surface px-3 py-2">
            <dt className="text-[10px] uppercase tracking-widest text-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted">
        Base points. Spotting it for the first time adds 50%, and being first on Torquest adds 100% more.
      </p>

      <button
        type="button"
        onClick={() => setEngineOpen((v) => !v)}
        className="mt-5 w-full rounded-xl bg-accent px-4 py-3 font-display text-lg font-bold uppercase tracking-wide text-accent-ink"
      >
        {engineOpen ? "Close the hood" : `Open the hood · ${ENGINE_LABELS[car.engine]}`}
      </button>
      {engineOpen && (
        <section className="mt-4">
          <EngineViewer engineType={car.engine} allowLayoutSwitch={false} />
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-6">
          <h2 className="pb-1 text-xs uppercase tracking-widest text-muted">Other {car.make} {car.model}s</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {related.map((c) => (
              <li key={c.id}>
                <Link href={`/car/?id=${c.id}`} className="flex items-center justify-between px-3 py-2.5 text-sm">
                  <span>
                    {c.variant ?? c.generation} <span className="text-muted">· {carYears(c)}</span>
                  </span>
                  <span style={{ color: `var(--color-tier-${c.tier})` }}>{TIER_INFO[c.tier].label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="h-6" />
    </main>
  );
}
