"use client";

import PageHeader from "@/components/PageHeader";
import { useSpots } from "@/features/spots/store";

export default function FriendsPage() {
  const { spots } = useSpots();
  const points = (spots ?? []).reduce((s, x) => s + x.points, 0);
  return (
    <main>
      <PageHeader title="Friends" sub="See your friends' garages and who's spotted the rarest cars." />
      <section className="mx-4 rounded-[20px] bg-surface px-4 py-4 md:mx-6">
        <h2 className="text-[16px] font-semibold">Find friends</h2>
        <input
          disabled
          placeholder="Search by username"
          aria-label="Search by username"
          className="mt-3 h-11 w-full rounded-full bg-raised px-4 text-[16px] placeholder:text-faint"
        />
        <p className="mt-2 text-[13px] text-muted">Friends arrive with sign-in.</p>
      </section>
      <section className="mx-4 mt-3.5 rounded-[20px] bg-surface px-4 py-3 md:mx-6">
        <h2 className="text-[16px] font-semibold">Leaderboard</h2>
        <ol className="mt-1">
          <li className="flex items-center gap-3 py-2 text-[14px]">
            <span className="num w-5 text-muted">1</span>
            <span className="flex-1 font-medium">You</span>
            <span className="num font-semibold text-accent">{spots ? points.toLocaleString() : "—"}</span>
          </li>
        </ol>
        <p className="pb-1 text-[13px] text-muted">Your friends show up here once they join.</p>
      </section>
    </main>
  );
}
