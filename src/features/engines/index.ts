// ENGINES MODULE (teammate-owned). The only file the rest of the app imports
// from. It must keep satisfying EnginesModule in ./contract.ts.

import EngineViewer3D from "./EngineViewer3D";
import { getEngineBlueprint } from "./blueprint";
import type { EnginesModule } from "./contract";

export const EngineViewer: EnginesModule["EngineViewer"] = EngineViewer3D;
export { getEngineBlueprint };
