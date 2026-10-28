import Link from "next/link";
import PageHeader from "@/components/PageHeader";

export default function FriendsPage() {
  return (
    <main>
      <PageHeader title="Friends" sub="See your friends' garages and what they've spotted." />
      <div className="mx-4 rounded-xl border border-line bg-surface p-4">
        <input
          disabled
          placeholder="Search by username"
          className="w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm placeholder:text-muted"
        />
        <p className="mt-3 text-sm text-muted">Friends arrive with accounts (milestones 2 and 6).</p>
      </div>
      <Link href="/ranks/" className="mx-4 mt-3 flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
        <span className="font-medium">Leaderboard</span>
        <span className="text-muted">→</span>
      </Link>
    </main>
  );
}
