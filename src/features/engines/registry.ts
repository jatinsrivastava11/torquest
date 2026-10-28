// ENGINES MODULE (teammate-owned).
// Which engine types have a detailed build. Add each new one here.

import type { EngineType } from "@/core/engines";
import type { EngineBlueprint } from "./contract";
import { buildV8 } from "./detailed/v8";
import { toBlueprint, type EngineModel } from "./model";
import { buildSimpleModel } from "./simpleModel";

const DETAILED: Partial<Record<EngineType, () => EngineModel>> = {
  v8: buildV8,
};

export const hasDetailedModel = (type: EngineType) => type in DETAILED;

export function buildEngineModel(type: EngineType): EngineModel {
  return (DETAILED[type] ?? (() => buildSimpleModel(type)))();
}

export function getEngineBlueprint(type: EngineType): EngineBlueprint {
  const model = buildEngineModel(type);
  try {
    return toBlueprint(model);
  } finally {
    model.dispose();
  }
}
