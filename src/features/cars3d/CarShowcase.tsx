"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { CatalogCar } from "@/core/catalog";
import { ENGINE_LABELS } from "@/core/engines";

const CarViewer = dynamic(() => import("./CarViewer"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-[14px] text-muted">Building the car…</div>,
});
const EngineViewer = dynamic(() => import("@/features/engines").then((m) => m.EngineViewer), {
  ssr: false,
  loading: () => <div className="flex h-[340px] items-center justify-center text-[14px] text-muted">Taking the engine out…</div>,
});

/** The 3D car, and the engine studio it opens into. */
export default function CarShowcase({ car, paint }: { car: CatalogCar; paint: string }) {
  const [engine, setEngine] = useState(false);

  useEffect(() => {
    if (!engine) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEngine(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [engine]);

  return (
    <>
      <div className="h-[58vh] max-h-[620px] min-h-[340px] overflow-hidden bg-black md:rounded-[20px]">
        <CarViewer car={car} paint={paint} onExploreEngine={() => setEngine(true)} />
      </div>
      {engine && (
        <div role="dialog" aria-modal="true" aria-label={`${ENGINE_LABELS[car.engine]} engine`} className="fixed inset-0 z-50 overflow-y-auto bg-black">
          <div className="mx-auto max-w-[960px] px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[20px] font-semibold">
                {car.make} {car.model}: {ENGINE_LABELS[car.engine]}
              </h2>
              <button type="button" onClick={() => setEngine(false)} className="flex h-9 items-center rounded-full bg-raised px-4 text-[14px] font-medium">
                Close
              </button>
            </div>
            <EngineViewer engineType={car.engine} allowLayoutSwitch={false} />
          </div>
        </div>
      )}
    </>
  );
}
