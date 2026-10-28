import { TIER_INFO, type Tier } from "@/core/tiers";

export default function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className="inline-flex h-5 flex-none items-center gap-1.5 whitespace-nowrap rounded-full bg-raised px-2 text-[12px] font-medium">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(--color-tier-${tier})` }} />
      {TIER_INFO[tier].label}
    </span>
  );
}
