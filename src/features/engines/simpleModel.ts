// ENGINES MODULE (teammate-owned).
// Wraps the simple box-and-cylinder blueprints (blueprint.ts) as an
// EngineModel, so engines without a detailed build still work in the studio.
// Each engine type should eventually get its own file in detailed/.

import * as THREE from "three";
import type { EngineType } from "@/core/engines";
import { getEngineBlueprint as getSimpleBlueprint, type EngineMaterialKind } from "./blueprint";
import { disposeObject, piece, type EngineModel } from "./model";

const MATERIALS: Record<EngineMaterialKind, THREE.MeshStandardMaterialParameters> = {
  block: { color: 0xb4b8be, metalness: 1, roughness: 0.5 },
  head: { color: 0xa5141d, metalness: 0.2, roughness: 0.5 },
  piston: { color: 0xdde1e6, metalness: 1, roughness: 0.2 },
  crank: { color: 0x80858d, metalness: 1, roughness: 0.3 },
  exhaust: { color: 0xc4c0b8, metalness: 1, roughness: 0.3 },
  copper: { color: 0xb87333, metalness: 1, roughness: 0.3 },
  accent: { color: 0xc9a24a, metalness: 1, roughness: 0.3 },
};

export function buildSimpleModel(type: EngineType): EngineModel {
  const bp = getSimpleBlueprint(type);
  const root = new THREE.Group();
  const materials = new Map<EngineMaterialKind, THREE.Material>();
  const movers: ((theta: number) => void)[] = [];

  const parts = bp.parts.map((spec) => {
    let geometry: THREE.BufferGeometry;
    if (spec.shape === "cylinder") {
      geometry = new THREE.CylinderGeometry(spec.size[0] / 2, spec.size[0] / 2, spec.size[1], 28);
      if (spec.axis === "x") geometry.rotateZ(Math.PI / 2);
      if (spec.axis === "z") geometry.rotateX(Math.PI / 2);
    } else {
      geometry = new THREE.BoxGeometry(...spec.size);
    }
    geometry.computeBoundingBox();
    if (!materials.has(spec.material)) {
      materials.set(spec.material, new THREE.MeshStandardMaterial(MATERIALS[spec.material]));
    }
    const mesh = new THREE.Mesh(geometry, materials.get(spec.material));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.set(...spec.rest);
    if (spec.bankTiltZRad) mesh.rotation.z = spec.bankTiltZRad;
    root.add(mesh);

    const p = piece(mesh, [
      spec.exploded[0] - spec.rest[0],
      spec.exploded[1] - spec.rest[1],
      spec.exploded[2] - spec.rest[2],
    ]);
    const motion = spec.motion;
    if (motion?.kind === "reciprocate" && motion.dir) {
      const dir = new THREE.Vector3(...motion.dir);
      const rest = p.base.clone();
      movers.push((t) => p.base.copy(rest).addScaledVector(dir, Math.sin(t + (motion.phase ?? 0)) * (motion.amplitude ?? 0.15)));
    } else if (motion?.kind === "spin") {
      movers.push((t) => (mesh.rotation.z = t));
    } else if (motion?.kind === "orbit") {
      const rest = p.base.clone();
      const amp = motion.amplitude ?? 0.08;
      movers.push((t) => {
        p.base.set(rest.x + Math.cos(t + (motion.phase ?? 0)) * amp, rest.y + Math.sin(t + (motion.phase ?? 0)) * amp, rest.z);
        mesh.rotation.z = -t / 3;
      });
    }
    const stage = spec.id === "block" || spec.id === "stator" || spec.id === "rotor-housing" ? 0 : 0.2;
    return { id: spec.id, name: spec.name, description: spec.description, stage, pieces: [p] };
  });

  return {
    type,
    label: bp.label,
    subtitle: bp.subtitle,
    root,
    parts,
    center: new THREE.Vector3(0, 0, 0),
    radius: 4.5,
    setCrankAngle(theta) {
      for (const move of movers) move(theta);
    },
    dispose() {
      disposeObject(root);
    },
  };
}
