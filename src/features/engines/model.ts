// ENGINES MODULE (teammate-owned).
// An EngineModel is a ready-to-render Three.js engine: its parts, how they
// explode, and how they move with the crankshaft. Detailed engines (see
// detailed/) and the simple placeholder engines both produce one, so the
// studio renders them the same way.

import * as THREE from "three";
import type { EngineType } from "@/core/engines";
import type { EngineBlueprint } from "./contract";

export interface EnginePiece {
  object: THREE.Object3D;
  /** Assembled position in the parent's frame. Kinematics may update it. */
  base: THREE.Vector3;
  /** Offset in the parent's frame when fully exploded. */
  explode: THREE.Vector3;
}

export interface EngineModelPart {
  id: string;
  name: string;
  description: string;
  /** 0 leaves first when exploding, 1 leaves last. */
  stage: number;
  pieces: EnginePiece[];
}

export interface EngineModel {
  type: EngineType;
  label: string;
  subtitle: string;
  root: THREE.Group;
  parts: EngineModelPart[];
  /** Where the camera should look. */
  center: THREE.Vector3;
  /** Rough size when exploded, for framing the camera. */
  radius: number;
  /** Pose every moving part for a crankshaft angle in radians. */
  setCrankAngle(theta: number): void;
  dispose(): void;
}

export function piece(object: THREE.Object3D, explode: [number, number, number]): EnginePiece {
  return { object, base: object.position.clone(), explode: new THREE.Vector3(...explode) };
}

const smooth = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

/** Moves every piece to its exploded position for t in 0..1, in stages. */
export function applyExplode(model: EngineModel, t: number) {
  for (const part of model.parts) {
    const k = smooth((t - part.stage * 0.5) / 0.5);
    for (const p of part.pieces) {
      p.object.position.copy(p.base).addScaledVector(p.explode, k);
    }
  }
}

export function partBounds(part: EngineModelPart, target = new THREE.Box3()) {
  target.makeEmpty();
  for (const p of part.pieces) target.expandByObject(p.object);
  return target;
}

export function disposeObject(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const m = mesh.material;
    (Array.isArray(m) ? m : [m]).forEach((x) => materials.add(x));
  });
  materials.forEach((m) => m.dispose());
}

/** Data-only view of a model, for the contract (assembled vs exploded centres). */
export function toBlueprint(model: EngineModel): EngineBlueprint {
  const centre = (part: EngineModelPart) => {
    model.root.updateMatrixWorld(true);
    return partBounds(part).getCenter(new THREE.Vector3()).toArray() as [number, number, number];
  };
  applyExplode(model, 0);
  const rest = model.parts.map(centre);
  applyExplode(model, 1);
  const exploded = model.parts.map(centre);
  applyExplode(model, 0);
  return {
    type: model.type,
    label: model.label,
    subtitle: model.subtitle,
    parts: model.parts.map((p, i) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      rest: rest[i],
      exploded: exploded[i],
    })),
  };
}
