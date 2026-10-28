// CORE (lead-owned). The interface between the app and the engines module.
// The engines module (teammate-owned) must satisfy this; the app only talks
// to the engines module through these types. Changing this file needs Jatin.

import type { ComponentType } from "react";
import type { EngineType } from "@/core/engines";

export interface EnginePart {
  /** Stable id, unique within one engine. Used for selection and tests. */
  id: string;
  /** Label shown to the user, e.g. "Crankshaft". */
  name: string;
  /** One or two plain-English sentences on what the part does. */
  description: string;
  /** Position when assembled. */
  rest: [number, number, number];
  /** Position when fully exploded. */
  exploded: [number, number, number];
}

export interface EngineBlueprint {
  type: EngineType;
  label: string;
  subtitle: string;
  parts: EnginePart[];
}

export interface EngineViewerProps {
  engineType: EngineType;
  /** Show the dropdown that lets the user compare other layouts. */
  allowLayoutSwitch?: boolean;
  /** Called when the user taps a part (or clears the selection with null). */
  onPartSelect?: (partId: string | null) => void;
}

/** What `src/features/engines/index.ts` must export. */
export interface EnginesModule {
  getEngineBlueprint: (type: EngineType) => EngineBlueprint;
  EngineViewer: ComponentType<EngineViewerProps>;
}
