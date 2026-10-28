"use client";

import { EngineViewer } from "@/features/engines";

// Dev playground for the engines module. The real entry point will be a
// spotted car's card, which opens the engine for that car's engine type.
export default function EnginesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-xl font-semibold">Engine studio</h1>
      <EngineViewer engineType="v8" allowLayoutSwitch />
    </main>
  );
}
