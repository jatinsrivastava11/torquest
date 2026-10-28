// CORE (lead-owned). The engine layouts a car in the catalog can have.
// Adding or renaming one is a core change: the catalog, the engines module
// and the contract test all depend on this list.

export const ENGINE_TYPES = [
  "i3",
  "i4",
  "i5",
  "i6",
  "v6",
  "v8",
  "v10",
  "v12",
  "v16",
  "w12",
  "w16",
  "flat4",
  "flat6",
  "rotary",
  "electric",
] as const;

export type EngineType = (typeof ENGINE_TYPES)[number];

export const ENGINE_LABELS: Record<EngineType, string> = {
  i3: "Inline-3",
  i4: "Inline-4",
  i5: "Inline-5",
  i6: "Inline-6",
  v6: "V6",
  v8: "V8",
  v10: "V10",
  v12: "V12",
  v16: "V16",
  w12: "W12",
  w16: "W16",
  flat4: "Flat-4",
  flat6: "Flat-6",
  rotary: "Rotary",
  electric: "Electric",
};

export function isEngineType(value: string): value is EngineType {
  return (ENGINE_TYPES as readonly string[]).includes(value);
}
