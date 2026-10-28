"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import TierBadge from "@/components/TierBadge";
import { carName, carYears } from "@/core/catalog";
import { ENGINE_LABELS } from "@/core/engines";
import { HYPE, TIER_INFO } from "@/core/tiers";
import { useCatalog } from "@/features/catalog/useCatalog";
import CarShowcase from "@/features/cars3d/CarShowcase";

const SILVER = "#9aa0a8";

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
  const car = cars?.find((c) => c.id === id);

  if (!cars) return <main className="px-4 py-10 text-center text-[14px] text-muted">{error ? "Couldn't load the catalog." : "Loading…"}</main>;
  if (!car) {
    return (
      <main className="px-4 py-10 text-center text-[14px] text-muted">
        Car not found. <Link href="/cars/" className="text-ink underline">All cars</Link>
      </main>
    );
  }
  const base = Math.round(TIER_INFO[car.tier].points * (car.hype ? HYPE : 1));
  const related = cars.filter((c) => c.make === car.make && c.model === car.model && c.id !== car.id);

  return (
    <main className="md:px-6 md:pt-4">
      <CarShowcase car={car} paint={SILVER} />
      <section className="px-4 pt-4 md:px-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold leading-7">{carName(car)}</h1>
            <p className="text-[14px] text-muted">
              {car.generation !== car.model ? `${car.generation} · ` : ""}
              {carYears(car)}
            </p>
          </div>
          <div className="text-right">
            <div className="num text-[24px] font-semibold leading-7 text-accent">{base.toLocaleString()}</div>
            <div className="text-[12px] text-muted">points{car.hype ? ", hype ×1.5" : ""}</div>
          </div>
        </div>
        <div className="mt-2">
          <TierBadge tier={car.tier} />
        </div>
      </section>

      <section className="mt-5 grid gap-3.5 px-4 md:grid-cols-2 md:px-0">
        <dl className="rounded-[20px] bg-surface px-4 py-3">
          {[
            ["On North American roads", `about ${car.naOnRoad.toLocaleString()}`],
            ["Built", car.built ? `about ${car.built.toLocaleString()}` : "—"],
            ["Engine", ENGINE_LABELS[car.engine]],
            ["Body", car.body[0].toUpperCase() + car.body.slice(1)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 text-[14px]">
              <dt className="text-muted">{k}</dt>
              <dd className="num">{v}</dd>
            </div>
          ))}
          <p className="pt-2 text-[13px] text-muted">A first spot adds 50%; being the first on Torquest doubles it.</p>
        </dl>
        {related.length > 0 && (
          <div className="rounded-[20px] bg-surface px-2 py-2">
            <h2 className="px-2 pb-1 pt-1 text-[16px] font-semibold">
              Other {car.make} {car.model}s
            </h2>
            <ul>
              {related.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link href={`/car/?id=${c.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-[14px] active:bg-raised">
                    <span className="truncate">
                      {c.variant ?? c.generation} <span className="text-muted">· {carYears(c)}</span>
                    </span>
                    <TierBadge tier={c.tier} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
