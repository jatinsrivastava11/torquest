"use client";

import { useRef } from "react";
import { carName, type CatalogCar } from "@/core/catalog";
import { TIER_INFO } from "@/core/tiers";
import CarSilhouette from "./CarSilhouette";
import TierBadge from "./TierBadge";

interface Props {
  car: CatalogCar;
  paint: string;
  points: number;
  city?: string;
  size?: "grid" | "hero";
}

// A collectible card. Rare and above get holographic foil that follows the
// pointer and tilts the card.
export default function SpotCard({ car, paint, points, city, size = "grid" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const holo = TIER_INFO[car.tier].holo;
  const tierColor = `var(--color-tier-${car.tier})`;

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !holo) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.dataset.active = "true";
    el.style.setProperty("--hx", `${x * 100}%`);
    el.style.setProperty("--hy", `${y * 100}%`);
    el.style.transform = `perspective(700px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg)`;
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.dataset.active = "false";
    el.style.transform = "";
  };

  const hero = size === "hero";
  return (
    <div
      className="rounded-2xl p-[2px] transition-transform duration-200 ease-out"
      style={{ background: `linear-gradient(150deg, ${tierColor}, color-mix(in srgb, ${tierColor} 25%, #1c1f26) 45%, ${tierColor})` }}
    >
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className={`${holo ? "holo" : ""} flex aspect-[5/7] flex-col overflow-hidden rounded-[14px] bg-surface transition-transform duration-150 ease-out`}
      >
        <div className="flex items-center justify-between px-3 pt-3">
          <TierBadge tier={car.tier} size={hero ? "md" : "sm"} />
          <span className={`font-display font-bold tabular-nums text-accent ${hero ? "text-xl" : "text-sm"}`}>+{points.toLocaleString()}</span>
        </div>
        <div
          className="relative mx-3 mt-2 flex flex-1 items-center justify-center overflow-hidden rounded-lg"
          style={{ background: `radial-gradient(120% 90% at 50% 100%, color-mix(in srgb, ${paint} 30%, #1c1f26), #101216 70%)` }}
        >
          <CarSilhouette body={car.body} paint={paint} className="w-[92%]" />
        </div>
        <div className={hero ? "px-4 pb-4 pt-3" : "px-3 pb-3 pt-2"}>
          <div className={`uppercase tracking-widest text-muted ${hero ? "text-xs" : "text-[10px]"}`}>{car.make}</div>
          <div className={`font-display font-bold leading-tight ${hero ? "text-3xl" : "text-lg"}`}>
            {carName(car).slice(car.make.length + 1)}
          </div>
          <div className={`text-muted ${hero ? "text-sm" : "text-[11px]"}`}>
            {car.generation}
            {city ? ` · ${city}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
