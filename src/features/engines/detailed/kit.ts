// ENGINES MODULE (teammate-owned).
// Materials and geometry builders shared by every detailed engine.
// Units: 1 = 10 cm. Z runs along the crankshaft (front = +Z), Y is up.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function createMaterials() {
  const std = (color: number, metalness: number, roughness: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  return {
    castAluminium: std(0xb4b8be, 1, 0.5),
    machinedAluminium: std(0xdde1e6, 1, 0.2, { side: THREE.DoubleSide }),
    forgedSteel: std(0x80858d, 1, 0.3),
    polishedSteel: std(0xcfd4dc, 1, 0.1, { side: THREE.DoubleSide }),
    darkSteel: std(0x4c5057, 1, 0.42),
    paintedBlack: std(0x26272b, 0.4, 0.45),
    blackPlastic: std(0x1c1d20, 0, 0.55),
    rubber: std(0x121212, 0, 0.9),
    copper: std(0xb87333, 1, 0.3),
    ceramic: std(0xf1eee6, 0, 0.25, { side: THREE.DoubleSide }),
    brass: std(0xc9a24a, 1, 0.3),
    wrinkleRed: new THREE.MeshPhysicalMaterial({
      color: 0xa5141d,
      metalness: 0.15,
      roughness: 0.55,
      clearcoat: 0.6,
      clearcoatRoughness: 0.4,
    }),
    // Exhaust steel takes its heat tint from vertex colours.
    exhaust: std(0xffffff, 1, 0.32, { vertexColors: true }),
  };
}

export type Materials = ReturnType<typeof createMaterials>;

export function mesh(geometry: THREE.BufferGeometry, material: THREE.Material) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function group(...children: THREE.Object3D[]) {
  const g = new THREE.Group();
  if (children.length) g.add(...children);
  return g;
}

/** Merge geometries that share a material into one draw call. */
export function merge(geometries: THREE.BufferGeometry[]) {
  const clean = geometries.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const name of Object.keys(n.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "color") n.deleteAttribute(name);
    }
    return n;
  });
  const merged = mergeGeometries(clean, false);
  if (!merged) throw new Error("merge: incompatible geometries");
  return merged;
}

export function at<T extends THREE.BufferGeometry>(g: T, x: number, y: number, z: number) {
  g.translate(x, y, z);
  return g;
}

/** Cylinder lying along Z, centred on the origin. */
export function cylinderZ(radius: number, length: number, segments = 32, radiusTop = radius) {
  return new THREE.CylinderGeometry(radiusTop, radius, length, segments).rotateX(Math.PI / 2);
}

/** Cylinder along Y, centred on the origin. */
export function cylinderY(radius: number, length: number, segments = 24) {
  return new THREE.CylinderGeometry(radius, radius, length, segments);
}

export function extrude(shape: THREE.Shape, depth: number, bevel = 0.012, curveSegments = 24) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function circlePath(r: number, x = 0, y = 0) {
  const p = new THREE.Path();
  p.absarc(x, y, r, 0, Math.PI * 2, true);
  return p;
}

/** Flat ring in the XY plane, extruded along Z. */
export function ring(rOuter: number, rInner: number, depth: number, bevel = 0.01) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
  s.holes.push(circlePath(rInner));
  return extrude(s, depth, bevel, 40);
}

/** Toothed wheel in the XY plane, extruded along Z. */
export function gear(teeth: number, rRoot: number, rTip: number, depth: number, rHole = 0) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = [
      [rRoot, a],
      [rTip, a + step * 0.2],
      [rTip, a + step * 0.45],
      [rRoot, a + step * 0.65],
    ];
    pts.forEach(([r, ang], j) => {
      const x = r * Math.cos(ang);
      const y = r * Math.sin(ang);
      if (i === 0 && j === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  if (rHole > 0) s.holes.push(circlePath(rHole));
  return extrude(s, depth, 0.004, 4);
}

/** Revolve a (radius, y) profile around Y. */
export function lathe(profile: [number, number][], segments = 40) {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private radius: number, private length: number, private turns: number) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(this.radius * Math.cos(a), t * this.length, this.radius * Math.sin(a));
  }
}

/** Coil spring along +Y starting at the origin. */
export function spring(radius: number, wire: number, length: number, turns: number) {
  return new THREE.TubeGeometry(new Helix(radius, length, turns), turns * 16, wire, 6, false);
}

export function tube(points: THREE.Vector3[], radius: number, closed = false, segments = 64, radial = 12) {
  const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
  return new THREE.TubeGeometry(curve, segments, radius, radial, closed);
}

/**
 * Colour a tube along its length, like exhaust steel that has been heat-
 * cycled: blue-violet at the port, gold, then bare steel.
 */
export function heatTint(geometry: THREE.TubeGeometry) {
  const { tubularSegments, radialSegments } = geometry.parameters;
  const stops = [
    [0, new THREE.Color(0x5a4f8f)],
    [0.18, new THREE.Color(0xb08a4a)],
    [0.45, new THREE.Color(0xc9c5bd)],
    [1, new THREE.Color(0xb9b5ae)],
  ] as const;
  const colors: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    let k = 0;
    while (k < stops.length - 2 && u > stops[k + 1][0]) k++;
    const [u0, c0] = stops[k];
    const [u1, c1] = stops[k + 1];
    c.copy(c0).lerp(c1, Math.min(1, (u - u0) / (u1 - u0)));
    for (let j = 0; j <= radialSegments; j++) colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}
