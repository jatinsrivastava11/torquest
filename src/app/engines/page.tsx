import { isEngineType } from "@/core/engines";
import { EngineViewer } from "@/features/engines";

// Dev playground for the engines module: /engines?engine=i4 opens a given
// engine. The real entry point will be a spotted car's card.
export default async function EnginesPage({ searchParams }: { searchParams: Promise<{ engine?: string }> }) {
  const { engine } = await searchParams;
  const type = engine && isEngineType(engine) ? engine : "v8";
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-xl font-semibold">Engine studio</h1>
      <EngineViewer engineType={type} allowLayoutSwitch />
    </main>
  );
}
