import type { BodyStyle } from "@/core/catalog";
import { PROFILES } from "@/features/cars3d/profiles";

export default function CarSilhouette({ body, paint, className }: { body: BodyStyle; paint: string; className?: string }) {
  const { body: b, glass, wheels } = PROFILES[body];
  const id = `paint-${body}-${paint.slice(1)}`;
  return (
    <svg viewBox="0 0 200 80" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.35" />
          <stop offset="0.35" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="black" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="72" rx="92" ry="5" fill="black" opacity="0.45" />
      <path d={b} fill={paint} />
      <path d={b} fill={`url(#${id})`} />
      <path d={glass} fill="#0d1117" opacity="0.85" />
      {wheels.map((x) => (
        <g key={x}>
          <circle cx={x} cy="62" r="12" fill="#0b0c0f" />
          <circle cx={x} cy="62" r="7" fill="#3a3f48" />
          <circle cx={x} cy="62" r="2.2" fill="#9aa0ab" />
        </g>
      ))}
    </svg>
  );
}
