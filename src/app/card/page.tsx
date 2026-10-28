"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import SpotCard from "@/components/SpotCard";
import { carName, carYears } from "@/core/catalog";
import { ENGINE_LABELS } from "@/core/engines";
import { DEMO_SPOTS } from "@/features/collection/demo";

const EngineViewer = dynamic(() => import("@/features/engines").then((m) => m.EngineViewer), {
  ssr: false,
  loading: () => <div className="flex h-[340px] items-center justify-center text-sm text-muted">Loading engine…</div>,
});

export default function CardPage() {
  return (
    <Suspense>
      <CardDetail />
    </Suspense>
  );
}

function CardDetail() {
  const id = useSearchParams().get("id");
  const spot = DEMO_SPOTS.find((s) => s.id === id);
  const [engineOpen, setEngineOpen] = useState(false);

  if (!spot) {
    return (
      <main className="p-6 text-center text-muted">
        Card not found. <Link href="/" className="text-accent underline">Back to garage</Link>
      </main>
    );
  }
  const { car } = spot;

  return (
    <main className="px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <Link href="/" className="text-sm text-muted">← Garage</Link>
      <div className="mx-auto mt-3 max-w-[300px]">
        <SpotCard car={car} paint={spot.paint} points={spot.points} city={spot.city} size="hero" />
      </div>

      <h2 className="mt-6 font-display text-2xl font-bold">{carName(car)}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {[
          ["Generation", car.generation],
          ["Years", carYears(car)],
          ["Engine", ENGINE_LABELS[car.engine]],
          ["Built", car.built ? `~${car.built.toLocaleString()}` : "—"],
          ["Spotted", `${spot.city}, ${spot.date}`],
          ["Points", `+${spot.points.toLocaleString()}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-surface px-3 py-2">
            <dt className="text-[10px] uppercase tracking-widest text-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={() => setEngineOpen((v) => !v)}
          className="rounded-xl bg-accent px-4 py-3 font-display text-lg font-bold uppercase tracking-wide text-accent-ink"
        >
          {engineOpen ? "Close the hood" : `Open the hood · ${ENGINE_LABELS[car.engine]}`}
        </button>
        <div className="rounded-xl border border-dashed border-line px-4 py-3 text-center text-sm text-muted">3D body model: coming in a later milestone</div>
      </div>

      {engineOpen && (
        <section className="mt-4">
          <EngineViewer engineType={car.engine} allowLayoutSwitch={false} />
        </section>
      )}
    </main>
  );
}
