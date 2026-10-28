"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import TierBadge from "@/components/TierBadge";
import { carName, carYears } from "@/core/catalog";
import { ENGINE_LABELS } from "@/core/engines";
import { useCatalog } from "@/features/catalog/useCatalog";
import CarShowcase from "@/features/cars3d/CarShowcase";
import { deleteSpot, getSpot, usePhotoUrl, type Spot } from "@/features/spots/store";

export default function CardPage() {
  return (
    <Suspense>
      <Card />
    </Suspense>
  );
}

function Card() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { cars } = useCatalog();
  const [spot, setSpot] = useState<Spot | null | undefined>(undefined);
  useEffect(() => {
    getSpot(id).then((s) => setSpot(s ?? null), () => setSpot(null));
  }, [id]);
  const url = usePhotoUrl(spot?.photo);
  const car = spot && cars?.find((c) => c.id === spot.carId);

  if (spot === null || (spot && cars && !car)) {
    return (
      <main className="px-4 py-10 text-center text-[14px] text-muted">
        This card isn&apos;t in your garage. <Link href="/" className="text-ink underline">Back to your garage</Link>
      </main>
    );
  }
  if (!spot || !car) return <main className="px-4 py-10 text-center text-[14px] text-muted">Loading…</main>;

  const taken = new Date(spot.takenAt);
  return (
    <main className="md:px-6 md:pt-4">
      <CarShowcase car={car} paint={spot.paint} />

      <section className="px-4 pt-4 md:px-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold leading-7">{carName(car)}</h1>
            <p className="text-[14px] text-muted">
              {car.generation !== car.model ? `${car.generation} · ` : ""}
              {carYears(car)}
            </p>
          </div>
          <div className="num flex-none text-[24px] font-semibold leading-7 text-accent">+{spot.points.toLocaleString()}</div>
        </div>
        <div className="mt-2">
          <TierBadge tier={car.tier} />
        </div>
      </section>

      <section className="mt-5 grid gap-3.5 px-4 md:grid-cols-2 md:px-0">
        <div className="overflow-hidden rounded-[20px] bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url && <img src={url} alt={`Your photo of the ${carName(car)}`} className="aspect-[4/3] w-full object-cover" />}
          <p className="px-4 py-3 text-[13px] text-muted">
            Spotted {taken.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} at{" "}
            {taken.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <div className="rounded-[20px] bg-surface px-4 py-3">
          <h2 className="text-[16px] font-semibold">Points</h2>
          <dl className="mt-1">
            {spot.lines.map((l) => (
              <div key={l.label} className="flex justify-between py-1.5 text-[14px]">
                <dt className="text-muted">{l.label}</dt>
                <dd className="num">+{l.points.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
          <h2 className="mt-3 text-[16px] font-semibold">The car</h2>
          <dl className="mt-1">
            {[
              ["Engine", ENGINE_LABELS[car.engine]],
              ["On North American roads", `about ${car.naOnRoad.toLocaleString()}`],
              ["Built", car.built ? `about ${car.built.toLocaleString()}` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 text-[14px]">
                <dt className="text-muted">{k}</dt>
                <dd className="num">{v}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={async () => {
              if (!confirm(`Remove the ${carName(car)} from your garage? Its ${spot.points} points go with it.`)) return;
              await deleteSpot(spot.id);
              router.push("/");
            }}
            className="mt-3 h-9 text-[14px] text-negative"
          >
            Remove from garage
          </button>
        </div>
      </section>
    </main>
  );
}
