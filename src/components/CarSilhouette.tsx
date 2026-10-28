import type { BodyStyle } from "@/core/catalog";

// Side profiles used until real photos and 3D bodies exist.
const BODY: Record<BodyStyle, { body: string; glass: string }> = {
  supercar: {
    body: "M8 62C8 56 14 52 26 50L64 45C80 35 100 29 122 29C140 29 156 37 170 44L186 48C192 50 194 56 194 62Z",
    glass: "M72 44C86 35 102 32 120 32C134 32 146 37 156 43Z",
  },
  coupe: {
    body: "M8 62C8 54 14 50 26 48L58 44C72 32 92 26 116 26C136 26 150 34 162 42L184 46C190 48 194 54 194 62Z",
    glass: "M68 43C80 33 96 29 114 29C130 29 142 35 152 42Z",
  },
  convertible: {
    body: "M8 62C8 54 14 50 26 48L70 44L84 34L88 35L82 44L162 44L184 47C190 49 194 54 194 62Z",
    glass: "M84 36L87 36L82 44L79 44Z",
  },
  sedan: {
    body: "M6 62C6 54 10 50 22 48L56 44C68 32 84 26 104 26L130 26C142 26 152 34 160 42L184 46C190 48 194 54 194 62Z",
    glass: "M64 43C74 33 88 29 104 29L128 29C138 29 146 35 152 42Z",
  },
  wagon: {
    body: "M6 62C6 54 10 50 22 48L54 43C66 31 80 25 98 25L170 25C178 25 182 32 184 40L190 46C193 49 194 54 194 62Z",
    glass: "M62 42C72 32 84 28 98 28L168 28C174 28 177 34 178 41Z",
  },
  hatchback: {
    body: "M10 62C10 54 14 50 24 48L56 42C68 30 82 24 100 24L148 24C158 24 166 32 172 42L186 46C190 48 192 54 192 62Z",
    glass: "M64 41C74 31 86 27 100 27L146 27C154 27 160 33 164 41Z",
  },
  suv: {
    body: "M8 62L8 46C8 42 12 40 20 40L48 38C58 24 70 18 88 18L156 18C166 18 172 24 176 34L188 40C192 42 194 48 194 62Z",
    glass: "M56 37C64 26 74 21 88 21L154 21C162 21 167 26 170 35Z",
  },
  pickup: {
    body: "M6 62L6 44C6 40 10 38 18 38L44 36C54 22 64 18 80 18L110 18C116 18 118 22 118 28L118 40L192 40L194 62Z",
    glass: "M52 35C60 25 68 21 80 21L108 21C112 21 114 24 114 28L114 35Z",
  },
  van: {
    body: "M8 62L8 40C8 30 16 24 30 18L50 14L184 14C190 14 194 18 194 24L194 62Z",
    glass: "M34 36L40 20L56 17L56 36Z",
  },
};

export default function CarSilhouette({ body, paint, className }: { body: BodyStyle; paint: string; className?: string }) {
  const { body: b, glass } = BODY[body];
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
      {[50, 150].map((x) => (
        <g key={x}>
          <circle cx={x} cy="62" r="12" fill="#0b0c0f" />
          <circle cx={x} cy="62" r="7" fill="#3a3f48" />
          <circle cx={x} cy="62" r="2.2" fill="#9aa0ab" />
        </g>
      ))}
    </svg>
  );
}
