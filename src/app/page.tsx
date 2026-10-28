import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Torquest</h1>
      <p className="mt-2 opacity-75">Spot cars in the wild. Build your collection.</p>
      <p className="mt-8 text-sm opacity-60">Early build. Nothing here is final.</p>
      <Link href="/engines" className="mt-4 inline-block text-amber-400 underline">
        Engine studio →
      </Link>
    </main>
  );
}
