// CORE (lead-owned). Builds a 3D car body for a body style, painted in the
// colour of the user's photo, with the panel over the engine (front hood,
// mid cover or rear deck) cut out so it can open, and the car's engine type
// sitting in the bay underneath.
//
// Units are metres. X runs nose (-) to tail (+), Y up, Z across the car.
// Bodies are extruded from the side profiles in ./profiles.ts; accurate
// per-model bodies are a later milestone.

import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { Brush, Evaluator, INTERSECTION, SUBTRACTION } from "three-bvh-csg";
import type { CatalogCar } from "@/core/catalog";
import { applyExplode, type EngineModel } from "@/features/engines/model";
import { buildEngineModel } from "@/features/engines/registry";
import { PROFILES, engineBay, type EngineBay } from "./profiles";

const LENGTH = 4.6;
const S = LENGTH / 188; // metres per profile unit
const WIDTH = 1.84;
const BEVEL = 0.16; // rounds the body's sides
const WHEEL_R = 12 * S;

const wx = (x: number) => (x - 100) * S;
const wy = (y: number) => (74 - y) * S;

const shapeCache = new Map<string, THREE.Shape[]>();
function shapes(d: string) {
  let s = shapeCache.get(d);
  if (!s) {
    const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
    s = data.paths.flatMap((p) => p.toShapes());
    shapeCache.set(d, s);
  }
  return s;
}

/** Extrude a profile path across the car, in world units. */
function extrudeProfile(d: string, width: number, bevel: number) {
  const depth = Math.max(0.01, width - 2 * bevel) / S;
  const g = new THREE.ExtrudeGeometry(shapes(d), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel / S,
    bevelSize: (bevel * 0.45) / S,
    bevelSegments: 6,
    curveSegments: 40,
  });
  g.translate(-100, -74, -depth / 2);
  g.scale(S, -S, -S); // two flipped axes keep the faces pointing outwards
  g.deleteAttribute("uv");
  g.computeVertexNormals();
  return g;
}

/** The profile's top edge (smallest y) at x, found on the outline's edges. */
function topAt(d: string, x: number) {
  let top = Infinity;
  for (const shape of shapes(d)) {
    const pts = shape.getPoints(24);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
      top = Math.min(top, a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y));
    }
  }
  return top;
}
/** Highest point of the profile between two x positions. */
function roofBetween(d: string, x0: number, x1: number) {
  let top = Infinity;
  for (let x = x0; x <= x1; x += 1) top = Math.min(top, topAt(d, x));
  return top;
}
/** The lowest of the tops between two x positions: where a panel sits lowest. */
function lowestTopBetween(d: string, x0: number, x1: number) {
  let low = -Infinity;
  for (let x = x0; x <= x1; x += 1) low = Math.max(low, topAt(d, x));
  return low;
}

export interface CarBuild {
  root: THREE.Group;
  /** The opening panel, already on its hinge; rotate `.rotation.z` to open. */
  lid: THREE.Object3D;
  lidMesh: THREE.Mesh;
  /** Lid angle (radians) when fully open; the sign opens it the right way. */
  openAngle: number;
  bay: EngineBay;
  bayCenter: THREE.Vector3;
  engine: EngineModel;
  dispose(): void;
}

export function buildCar(car: Pick<CatalogCar, "make" | "model" | "body" | "engine">, paint: string): CarBuild {
  const profile = PROFILES[car.body];
  const bay = engineBay(car);
  const range = (bay === "front" ? profile.front : bay === "mid" ? profile.mid : profile.rear) ?? profile.front;

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: paint,
    metalness: 0.55,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  });
  const bayMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, metalness: 0.3, roughness: 0.7, side: THREE.DoubleSide });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0c10, metalness: 0.4, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb9bdc4, metalness: 1, roughness: 0.25 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf4f2ea, emissive: 0xfff6d8, emissiveIntensity: 0.6 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x8a0d12, emissive: 0xc0111a, emissiveIntensity: 0.5 });

  // ---------------------------------------------------------------- body
  const evaluator = new Evaluator();
  evaluator.attributes = ["position", "normal"];
  evaluator.useGroups = true;
  const brush = (g: THREE.BufferGeometry, m: THREE.Material, place?: (b: Brush) => void) => {
    const b = new Brush(g, m);
    place?.(b);
    b.updateMatrixWorld();
    return b;
  };
  const box = (x0: number, x1: number, y0: number, y1: number, halfZ: number) => {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, halfZ * 2);
    g.deleteAttribute("uv");
    return { g, place: (b: Brush) => b.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0) };
  };

  let body = brush(extrudeProfile(profile.body, WIDTH, BEVEL), paintMat);

  // Wheel arches.
  for (const x of profile.wheels) {
    const g = new THREE.CylinderGeometry(WHEEL_R + 0.05, WHEEL_R + 0.05, WIDTH + 0.4, 40).rotateX(Math.PI / 2);
    g.deleteAttribute("uv");
    body = evaluator.evaluate(body, brush(g, bayMat, (b) => b.position.set(wx(x), WHEEL_R, 0)), SUBTRACTION);
  }

  // The opening panel: a slab off the top of the body over the engine,
  // with the bay cut out beneath it.
  const [px0, px1] = range;
  const x0 = wx(px0), x1 = wx(px1);
  const lidBottom = wy(lowestTopBetween(profile.body, px0, px1)) - 0.06;
  const halfZ = WIDTH / 2 - 0.2;
  const lidBox = box(x0, x1, lidBottom, 3, halfZ);
  const bayBox = box(x0 + 0.04, x1 - 0.04, WHEEL_R + 0.02, lidBottom + 0.01, halfZ - 0.03);
  const bodyBrush = body;
  const lidResult = evaluator.evaluate(bodyBrush, brush(lidBox.g, bayMat, lidBox.place), INTERSECTION);
  body = evaluator.evaluate(bodyBrush, brush(lidBox.g.clone(), bayMat, lidBox.place), SUBTRACTION);
  body = evaluator.evaluate(body, brush(bayBox.g, bayMat, bayBox.place), SUBTRACTION);

  const root = new THREE.Group();
  const bodyMesh = new THREE.Mesh(body.geometry, body.material);
  root.add(bodyMesh);

  // Hinge: front hoods hinge at the windscreen end, rear and mid covers at
  // the cabin end. Both are the end nearer the middle of the car.
  const hingeX = bay === "front" ? x1 : x0;
  const hingeY = wy(topAt(profile.body, hingeX / S + 100));
  const lidGeom = lidResult.geometry;
  lidGeom.translate(-hingeX, -hingeY, 0);
  const lidMesh = new THREE.Mesh(lidGeom, lidResult.material);
  const lid = new THREE.Group();
  lid.position.set(hingeX, hingeY, 0);
  lid.add(lidMesh);
  root.add(lid);

  // ------------------------------------------------------------- glass
  // Side windows stand a few millimetres proud of the flanks; the windscreen
  // and rear window are ribbons that follow the roofline.
  const sideWidth = WIDTH - 2 * BEVEL + 0.06;
  const glass = new THREE.Mesh(extrudeProfile(profile.glass, sideWidth, 0), glassMat);
  glass.scale.z = (WIDTH + 0.008) / sideWidth;
  root.add(glass);
  const ribbon = ([a, b]: [number, number]) => {
    const steps = 18;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = a + ((b - a) * i) / steps;
      const y = wy(topAt(profile.body, x)) + 0.085; // clears the bevel, which grows the outline by ~0.07
      const half = WIDTH / 2 - BEVEL - 0.02 - 0.08 * (i / steps);
      pos.push(wx(x), y, -half, wx(x), y, half);
      if (i < steps) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, glassMat);
    root.add(m);
  };
  ribbon(profile.windscreen);
  if (profile.backlight) ribbon(profile.backlight);

  // ------------------------------------------------------------- wheels
  const tire = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.25, 40).rotateX(Math.PI / 2);
  const rim = new THREE.CylinderGeometry(WHEEL_R * 0.66, WHEEL_R * 0.66, 0.26, 40).rotateX(Math.PI / 2);
  const spoke = new THREE.BoxGeometry(0.04, WHEEL_R * 1.2, 0.02);
  for (const x of profile.wheels) {
    for (const side of [-1, 1]) {
      const wheel = new THREE.Group();
      wheel.add(new THREE.Mesh(tire, rubber), new THREE.Mesh(rim, rimMat));
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(spoke, rimMat);
        s.rotation.z = (i / 5) * Math.PI;
        s.position.z = side * 0.135;
        wheel.add(s);
      }
      wheel.position.set(wx(x), WHEEL_R, side * (WIDTH / 2 - 0.15));
      root.add(wheel);
    }
  }

  // ------------------------------------------------------------- lights
  const frontX = wx(Math.min(...shapes(profile.body)[0].getPoints(60).map((p) => p.x))) + 0.04;
  const rearX = wx(Math.max(...shapes(profile.body)[0].getPoints(60).map((p) => p.x))) - 0.04;
  const lampY = wy(52);
  for (const side of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.34), headMat);
    head.position.set(frontX, lampY, side * 0.58);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), tailMat);
    tail.position.set(rearX, lampY + 0.04, side * 0.56);
    root.add(head, tail);
  }

  // ------------------------------------------------------------- engine
  const engine = buildEngineModel(car.engine);
  engine.setCrankAngle(0);
  applyExplode(engine, 0);
  const holder = new THREE.Group();
  holder.add(engine.root);
  holder.rotation.y = Math.PI / 2; // crank along the car
  holder.updateMatrixWorld(true);
  const ebox = new THREE.Box3().setFromObject(holder);
  const esize = ebox.getSize(new THREE.Vector3());
  const bayLen = x1 - x0 - 0.12, bayWid = 2 * halfZ - 0.1, bayHt = lidBottom - WHEEL_R - 0.02;
  const k = Math.min(bayLen / esize.x, bayWid / esize.z, (bayHt + 0.12) / esize.y);
  holder.scale.setScalar(k);
  holder.updateMatrixWorld(true);
  const placed = new THREE.Box3().setFromObject(holder);
  const centre = placed.getCenter(new THREE.Vector3());
  holder.position.set((x0 + x1) / 2 - centre.x, WHEEL_R + 0.04 - placed.min.y, -centre.z);
  root.add(holder);

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.castShadow = m.receiveShadow = true;
  });

  const materials = [paintMat, bayMat, glassMat, rubber, rimMat, headMat, tailMat];
  return {
    root,
    lid,
    lidMesh,
    openAngle: bay === "front" ? -1.05 : 0.95,
    bay,
    bayCenter: new THREE.Vector3((x0 + x1) / 2, lidBottom - 0.1, 0),
    engine,
    dispose() {
      engine.dispose();
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
      materials.forEach((m) => m.dispose());
    },
  };
}
