import PageHeader from "@/components/PageHeader";
import TierBadge from "@/components/TierBadge";
import { BONUS, CLASSIC_AGE, HYPE, TIER_INFO, TIERS } from "@/core/tiers";
import { TIER_BANDS } from "@/core/catalog";

const pct = (x: number) => `+${Math.round(x * 100)}%`;

export default function AccountPage() {
  const bands = new Map(TIER_BANDS);
  return (
    <main>
      <PageHeader title="Account" />
      <section className="mx-4 rounded-[20px] bg-surface px-4 py-4 md:mx-6">
        <h2 className="text-[16px] font-semibold">Sign in</h2>
        <p className="mt-1 max-w-[52ch] text-[14px] text-muted">
          Sign in with Google or an email link to keep your garage across phones and share it with friends. Until then,
          your cards and photos stay on this phone only.
        </p>
        <button type="button" disabled className="mt-3 h-10 rounded-full bg-raised px-4 text-[14px] font-medium text-faint">
          Sign-in is coming soon
        </button>
      </section>

      <section className="mx-4 mt-3.5 rounded-[20px] bg-surface px-4 py-4 md:mx-6">
        <h2 className="text-[16px] font-semibold">How points work</h2>
        <p className="mt-1 max-w-[60ch] text-[14px] text-muted">
          A car&apos;s tier is how rare it is to see on North American roads. Supercars, exotic makes, performance versions
          and icons score ×{HYPE} on top.
        </p>
        <table className="mt-3 w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12px] text-muted">
              <th className="pb-1.5 font-normal">Tier</th>
              <th className="pb-1.5 font-normal">On the road</th>
              <th className="pb-1.5 text-right font-normal">Points</th>
            </tr>
          </thead>
          <tbody>
            {[...TIERS].reverse().map((t, i, all) => {
              const below = bands.get(t);
              const from = i === all.length - 1 ? 1_000_000 : null;
              const prev = [...TIERS].reverse()[i - 1];
              const lower = prev ? bands.get(prev) : 0;
              return (
                <tr key={t} className="border-t border-rule">
                  <td className="py-2">
                    <TierBadge tier={t} />
                  </td>
                  <td className="num py-2 text-muted">
                    {from ? `${from.toLocaleString()}+` : `${(lower ?? 0).toLocaleString()} – ${((below ?? 0) - 1).toLocaleString()}`}
                  </td>
                  <td className="num py-2 text-right">{TIER_INFO[t].points.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ul className="mt-3 space-y-1 text-[14px] text-muted">
          <li>First time you spot a car: {pct(BONUS.firstForYou)}</li>
          <li>First on Torquest to spot it: {pct(BONUS.firstInTorquest)}</li>
          <li>Classics, {CLASSIC_AGE}+ years old: {pct(BONUS.classic)}</li>
          <li>Spotting a car you already have: {Math.round(BONUS.repeat * 100)}% of its points</li>
        </ul>
      </section>
    </main>
  );
}
