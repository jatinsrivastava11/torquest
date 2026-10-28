import PageHeader from "@/components/PageHeader";
import TierBadge from "@/components/TierBadge";
import { TIERS } from "@/core/tiers";

export default function ProfilePage() {
  return (
    <main>
      <PageHeader title="Profile" demo />
      <section className="mx-4 flex items-center gap-4 rounded-xl border border-line bg-surface p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-raised font-display text-2xl font-bold text-accent">Y</div>
        <div>
          <div className="text-lg font-semibold">@you</div>
          <div className="text-sm text-muted">Sign-in arrives in milestone 2</div>
        </div>
      </section>
      <section className="mx-4 mt-4 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-xs uppercase tracking-widest text-muted">Tiers</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TIERS.map((t) => (
            <TierBadge key={t} tier={t} size="md" />
          ))}
        </div>
      </section>
    </main>
  );
}
