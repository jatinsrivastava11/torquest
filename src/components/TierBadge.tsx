import { TIER_INFO, type Tier } from "@/core/tiers";

export default function TierBadge({ tier, size = "sm" }: { tier: Tier; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-display font-semibold uppercase tracking-wider ${size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"}`}
      style={{ color: `var(--color-tier-${tier})`, background: `color-mix(in srgb, var(--color-tier-${tier}) 16%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(--color-tier-${tier})` }} />
      {TIER_INFO[tier].label}
    </span>
  );
}
