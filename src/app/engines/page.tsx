"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { isEngineType } from "@/core/engines";
import { EngineViewer } from "@/features/engines";

// Dev playground for the engines module: /engines?engine=i4 opens a given engine.
export default function EnginesPage() {
  return (
    <Suspense>
      <Studio />
    </Suspense>
  );
}

function Studio() {
  const engine = useSearchParams().get("engine") ?? "";
  return (
    <main className="px-4 py-6">
      <h1 className="mb-4 font-display text-2xl font-bold uppercase">Engine studio</h1>
      <EngineViewer engineType={isEngineType(engine) ? engine : "v8"} allowLayoutSwitch />
    </main>
  );
}
