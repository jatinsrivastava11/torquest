"use client";

import { useRef } from "react";
import type { CatalogCar } from "@/core/catalog";
import { TIER_INFO } from "@/core/tiers";
import CarSilhouette from "./CarSilhouette";
import TierBadge from "./TierBadge";

interface Props {
  car: CatalogCar;
  points: number;
  /** The user's photo; without one the card shows the body style drawn in `paint`. */
  photoUrl?: string;
  paint?: string;
}

// A collected car: the photo first, then what it is and what it scored.
export default function SpotCard({ car, points, photoUrl, paint = "#8a919c" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const holo = TIER_INFO[car.tier].holo;

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !holo) return;
    const r = el.getBoundingClientRect();
    el.dataset.active = "true";
    el.style.setProperty("--hx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--hy", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <article className="overflow-hidden rounded-[20px] bg-surface">
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={() => ref.current && (ref.current.dataset.active = "false")}
        className={`${holo ? "holo" : ""} relative aspect-[4/3] bg-raised`}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={`${car.make} ${car.model}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <CarSilhouette body={car.body} paint={paint} className="w-[86%]" />
          </div>
        )}
        <div className="absolute left-2.5 top-2.5">
          <TierBadge tier={car.tier} />
        </div>
      </div>
      <div className="flex items-start justify-between gap-3 px-3.5 pb-3.5 pt-3">
        <div className="min-w-0">
          <div className="truncate text-[16px] font-semibold leading-6">
            {car.model}
            {car.variant ? ` ${car.variant}` : ""}
          </div>
          <div className="truncate text-[12px] text-muted">
            {car.make}
            {car.generation !== car.model ? ` · ${car.generation}` : ""}
          </div>
        </div>
        <div className="num flex-none text-[16px] font-semibold leading-6 text-accent">+{points.toLocaleString()}</div>
      </div>
    </article>
  );
}
