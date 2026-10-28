// ENGINES MODULE (teammate-owned). The only file the rest of the app imports
// from. It must keep satisfying EnginesModule in ./contract.ts.

import EngineStudio from "./EngineStudio";
import type { EnginesModule } from "./contract";
import { getEngineBlueprint } from "./registry";

export const EngineViewer: EnginesModule["EngineViewer"] = EngineStudio;
export { getEngineBlueprint };
