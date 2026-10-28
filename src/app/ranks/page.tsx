import PageHeader from "@/components/PageHeader";

const DEMO = [
  ["you", 6860],
  ["apex_hunter", 5210],
  ["boxer6", 3480],
  ["vtec_yo", 1290],
  ["dailydriver", 410],
] as const;

export default function RanksPage() {
  return (
    <main>
      <PageHeader title="Ranks" sub="Points this season among you and your friends." demo />
      <ol className="mx-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {DEMO.map(([name, pts], i) => (
          <li key={name} className={`flex items-center gap-3 px-4 py-3 ${name === "you" ? "bg-accent/10" : ""}`}>
            <span className="w-6 font-display text-xl font-bold text-muted">{i + 1}</span>
            <span className="flex-1 font-medium">@{name}</span>
            <span className="font-display text-lg font-bold tabular-nums">{pts.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
