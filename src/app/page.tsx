"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { carName } from "@/core/catalog";
import { HYPE, TIER_INFO, TIERS, type Tier } from "@/core/tiers";
import { useCatalog } from "@/features/catalog/useCatalog";
import SpotTile from "@/features/spots/SpotTile";
import { useSpots } from "@/features/spots/store";

export default function Garage() {
  const { spots } = useSpots();
  const { cars } = useCatalog();
  const [tier, setTier] = useState<Tier | null>(null);

  const byId = useMemo(() => new Map((cars ?? []).map((c) => [c.id, c])), [cars]);
  const rows = (spots ?? []).flatMap((s) => {
    const car = byId.get(s.carId);
    return car ? [{ spot: s, car }] : [];
  });
  const shown = rows.filter((r) => !tier || r.car.tier === tier);
  const points = rows.reduce((sum, r) => sum + r.spot.points, 0);
  const distinct = new Set(rows.map((r) => r.car.id)).size;
  const best = TIERS.slice().reverse().find((t) => rows.some((r) => r.car.tier === t));
  const loading = spots === null || cars === null;

  return (
    <main>
      <header className="flex items-center gap-4 px-4 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))] md:px-6 md:pt-6">
        <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-raised text-[20px] font-semibold">Y</div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-semibold leading-7">Your garage</h1>
          <p className="text-[14px] text-muted">
            Saved on this phone ·{" "}
            <Link href="/account/" className="text-ink underline decoration-control underline-offset-4">
              sign in to share it
            </Link>
          </p>
        </div>
      </header>

      <section className="mx-4 grid grid-cols-3 rounded-[20px] bg-surface md:mx-6" aria-label="Your numbers">
        <div className="px-4 py-3.5">
          <div className="text-[12px] text-muted">Points</div>
          <div className="num text-[32px] font-semibold leading-10 text-accent">{loading ? "—" : points.toLocaleString()}</div>
        </div>
        <div className="px-4 py-3.5">
          <div className="text-[12px] text-muted">Cars</div>
          <div className="num text-[24px] font-medium leading-10">{loading ? "—" : distinct}</div>
        </div>
        <div className="px-4 py-3.5">
          <div className="text-[12px] text-muted">Rarest</div>
          <div className="flex h-10 items-center text-[16px] font-medium">
            {best ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: `var(--color-tier-${best})` }} />
                {TIER_INFO[best].label}
              </span>
            ) : (
              <span className="text-faint">—</span>
            )}
          </div>
        </div>
      </section>

      {rows.length > 0 && (
        <div className="mt-5 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:px-6">
          {[null, ...TIERS.slice().reverse()].map((t) => {
            const n = t ? rows.filter((r) => r.car.tier === t).length : rows.length;
            if (t && n === 0) return null;
            return (
              <button
                key={t ?? "all"}
                type="button"
                onClick={() => setTier(t)}
                className={`h-8 flex-none rounded-full px-3.5 text-[13px] font-medium ${tier === t ? "bg-white text-black" : "bg-surface text-[#bbbbbb]"}`}
              >
                {t ? TIER_INFO[t].label : "All"} <span className="num opacity-60">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {!loading && rows.length === 0 ? (
        <section className="mx-4 mt-4 flex flex-col items-start gap-4 rounded-[20px] bg-surface px-5 py-6 md:mx-6">
          <div>
            <h2 className="text-[16px] font-semibold">Your garage is empty</h2>
            <p className="mt-1 max-w-[46ch] text-[14px] text-muted">
              Photograph a car you see, parked or passing. It becomes a card here, you can open it in 3D right down to its
              engine, and it earns points by how rare it is.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/spot/" className="flex h-11 items-center rounded-full bg-white px-5 text-[14px] font-semibold text-black">
              Spot your first car
            </Link>
            <Link href="/spot/?from=photos" className="flex h-11 items-center rounded-full bg-raised px-5 text-[14px] font-medium">
              Use a photo you took
            </Link>
          </div>
        </section>
      ) : (
        <section className="mt-3 grid grid-cols-2 gap-3.5 px-4 sm:grid-cols-3 md:px-6 lg:grid-cols-4" aria-label="Your cars">
          {shown.map(({ spot, car }) => (
            <SpotTile key={spot.id} spot={spot} car={car} />
          ))}
        </section>
      )}

      {cars && rows.length < 4 && <WorthHunting cars={cars} have={new Set(rows.map((r) => r.car.id))} />}
    </main>
  );
}

/** The most valuable cars still to find, so a new garage knows what to look for. */
function WorthHunting({ cars, have }: { cars: NonNullable<ReturnType<typeof useCatalog>["cars"]>; have: Set<string> }) {
  const worth = (c: (typeof cars)[number]) => TIER_INFO[c.tier].points * (c.hype ? HYPE : 1);
  const picks = cars
    .filter((c) => !have.has(c.id) && c.years[0] >= 1960 && (c.tier === "exotic" || c.tier === "rare"))
    .sort((a, b) => worth(b) - worth(a) || b.naOnRoad - a.naOnRoad)
    .slice(0, 6);
  return (
    <section className="mx-4 mt-6 md:mx-6" aria-labelledby="hunting">
      <div className="flex items-baseline justify-between">
        <h2 id="hunting" className="text-[16px] font-semibold">
          Worth hunting
        </h2>
        <Link href="/cars/" className="text-[14px] text-muted">
          All cars
        </Link>
      </div>
      <p className="mt-0.5 text-[14px] text-muted">Rare enough to make your day, common enough to actually find.</p>
      <ul className="mt-3 grid gap-x-3.5 rounded-[20px] bg-surface px-4 py-2 md:grid-cols-2">
        {picks.map((c) => (
          <li key={c.id}>
            <Link href={`/car/?id=${c.id}`} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium">{carName(c)}</span>
                <span className="num block text-[13px] text-muted">about {c.naOnRoad.toLocaleString()} on the road</span>
              </span>
              <span className="num flex-none text-[15px] font-semibold text-accent">{Math.round(worth(c)).toLocaleString()}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
