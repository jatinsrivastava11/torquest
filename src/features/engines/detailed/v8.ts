// ENGINES MODULE (teammate-owned).
// A detailed 90° V8: cross-plane crank, DOHC, 4 valves per cylinder, roughly
// the proportions of a modern 5.0 L (92 mm bore, 92.7 mm stroke, 150.7 mm
// rods). Every moving part is driven by the real kinematics of the crank
// angle, and the valves follow the actual cam lobes in firing order.
//
// This is the reference for the other detailed engines: build parts in the
// bank frame where they belong, register them as parts with an explode
// direction, and drive motion from setCrankAngle.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { ENGINE_LABELS } from "@/core/engines";
import { disposeObject, piece, type EngineModel, type EngineModelPart, type EnginePiece } from "../model";
import {
  at,
  createMaterials,
  cylinderY,
  cylinderZ,
  extrude,
  gear,
  group,
  heatTint,
  lathe,
  merge,
  mesh,
  ring,
  spring,
  tube,
} from "./kit";

const deg = (d: number) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const wrap = (a: number) => a - TAU * Math.floor((a + Math.PI) / TAU);

// Dimensions. 1 unit = 10 cm.
const THROW = 0.4635; // crank throw: half the stroke
const ROD = 1.507; // con-rod centre to centre
const PISTON_H = 0.3; // wrist pin to crown
const BORE = 0.46; // bore radius
const DECK = THROW + ROD + PISTON_H; // crank centre to block deck
const GASKET = 0.03;
const HEAD_H = 0.42;
const HEAD_FLOOR = DECK + GASKET; // combustion chamber roof
const HEAD_TOP = HEAD_FLOOR + HEAD_H;
const HEAD_HALF_W = 0.66;
const COVER_H = 0.7;
const COVER_TOP = HEAD_TOP + COVER_H;
const BANK = deg(45); // each bank leans 45°: a 90° V
const ROD_OFFSET = 0.11; // paired rods share a crank pin, side by side
const PIN_Z = [1.5, 0.5, -0.5, -1.5]; // front (+Z) to back
const PIN_ANGLES = [0, 90, 270, 180].map(deg); // cross-plane crank
const MAIN_Z = [2, 1, 0, -1, -2];
const VALVE_TILT = deg(12);
const VALVE_X = 0.17;
const VALVE_DZ = 0.17;
const CAM_BASE = 0.12;
const CAM_LIFT = 0.09;
const CAM_HALF = Math.PI / 3; // lobe half-width in cam degrees (240° crank duration)
const CAM_REACH = 0.81; // valve seat to cam centre, along the valve
const INTAKE_PEAK = deg(470); // in the 720° cycle, 0 = firing TDC
const EXHAUST_PEAK = deg(250);

interface Bank {
  side: "left" | "right";
  beta: number; // lean from vertical, + towards +X
  outer: 1 | -1; // which local X points out of the V
  frame: THREE.Group; // local +Y runs up the bores
}

interface Cylinder {
  num: number;
  bank: Bank;
  pin: number;
  z: number;
  fire: number; // crank angle of firing TDC, 0..4π
}

const lobeProfile = (a: number) =>
  Math.abs(a) < CAM_HALF ? CAM_LIFT * Math.cos((a / CAM_HALF) * (Math.PI / 2)) ** 2 : 0;

function hull(points: THREE.Vector2[]) {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: THREE.Vector2[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: THREE.Vector2[] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

const circlePoints = (x: number, y: number, r: number, n = 24) =>
  Array.from({ length: n }, (_, i) => new THREE.Vector2(x + r * Math.cos((i / n) * TAU), y + r * Math.sin((i / n) * TAU)));

/** A closed loop (belt or chain) wrapped around a set of wheels. */
function loop(wheels: [number, number, number][], z: number, radius: number, m: THREE.Material) {
  const pts = hull(wheels.flatMap(([x, y, r]) => circlePoints(x, y, r, 32)));
  return mesh(tube(pts.map((p) => new THREE.Vector3(p.x, p.y, z)), radius, true, 240, 6), m);
}

export function buildV8(): EngineModel {
  const mat = createMaterials();
  const stainless = new THREE.MeshStandardMaterial({ color: 0xc4c0b8, metalness: 1, roughness: 0.3 });
  const root = new THREE.Group();
  const parts: EngineModelPart[] = [];
  const movers: ((theta: number) => void)[] = [];

  const addPart = (id: string, name: string, stage: number, description: string, pieces: EnginePiece[]) =>
    parts.push({ id, name, stage, description, pieces });

  const banks: Bank[] = (
    [
      { side: "left", beta: -BANK, outer: -1 },
      { side: "right", beta: BANK, outer: 1 },
    ] as const
  ).map((b) => {
    const frame = new THREE.Group();
    frame.rotation.z = -b.beta;
    root.add(frame);
    return { ...b, frame };
  });

  const toWorld = (bank: Bank, x: number, y: number, z: number) =>
    new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 0, 1), -bank.beta);

  // Left bank holds the odd cylinders and sits slightly forward; the left
  // bank fires on the first crank revolution and the right on the second,
  // which spaces all eight firings 90° apart.
  const cylinders: Cylinder[] = [];
  PIN_Z.forEach((pz, pin) => {
    banks.forEach((bank, b) => {
      const tdc = bank.beta - PIN_ANGLES[pin];
      cylinders.push({
        num: 2 * pin + b + 1,
        bank,
        pin,
        z: pz + (b === 0 ? ROD_OFFSET : -ROD_OFFSET),
        fire: (((tdc + (b === 1 ? TAU : 0)) % (2 * TAU)) + 2 * TAU) % (2 * TAU),
      });
    });
  });
  const ofBank = (bank: Bank) => cylinders.filter((c) => c.bank === bank);

  // ---------------------------------------------------------------- block
  {
    const corner = (bank: Bank, along: number) => {
      const d = new THREE.Vector2(Math.sin(bank.beta), Math.cos(bank.beta));
      const n = new THREE.Vector2(Math.cos(bank.beta), -Math.sin(bank.beta));
      return d.multiplyScalar(DECK).addScaledVector(n, along * bank.outer);
    };
    const [L, R] = banks;
    const outline = [
      new THREE.Vector2(-1.3, -0.62),
      new THREE.Vector2(1.3, -0.62),
      new THREE.Vector2(1.3, 0.25),
      corner(R, 0.64),
      corner(R, -0.64),
      new THREE.Vector2(0.38, 1.3),
      new THREE.Vector2(-0.38, 1.3),
      corner(L, -0.64),
      corner(L, 0.64),
      new THREE.Vector2(-1.3, 0.25),
    ];
    const shape = new THREE.Shape(outline);
    const evaluator = new Evaluator();
    evaluator.attributes = ["position", "normal"];
    evaluator.useGroups = false;
    const strip = (g: THREE.BufferGeometry) => {
      g.deleteAttribute("uv");
      return g;
    };
    let block = new Brush(strip(extrude(shape, 4.5, 0.03, 4)));
    block.updateMatrixWorld();
    const cut = (g: THREE.BufferGeometry, place: (b: Brush) => void) => {
      const tool = new Brush(strip(g));
      place(tool);
      tool.updateMatrixWorld();
      block = evaluator.evaluate(block, tool, SUBTRACTION);
    };
    for (const c of cylinders) {
      cut(cylinderY(BORE, 1.9, 40), (b) => {
        b.position.copy(toWorld(c.bank, 0, 1.8, c.z));
        b.rotation.z = -c.bank.beta;
      });
    }
    PIN_Z.forEach((z) => cut(new THREE.BoxGeometry(1.9, 1.5, 0.76), (b) => b.position.set(0, 0.1, z)));
    cut(cylinderZ(0.31, 4.8, 32), () => {});

    const caps = merge(MAIN_Z.map((z) => at(new RoundedBoxGeometry(0.95, 0.22, 0.22, 2, 0.03), 0, -0.4, z)));
    const blockGroup = group(mesh(block.geometry, mat.castAluminium), mesh(caps, mat.forgedSteel));
    root.add(blockGroup);
    addPart(
      "block",
      "Engine block",
      0,
      "The cast-aluminium core of the engine. Eight cylinders are bored into it in two banks of four, set 90° apart, and the crankshaft spins in the bulkheads along its bottom.",
      [piece(blockGroup, [0, 0, 0])],
    );
  }

  // ------------------------------------------------------------ crankshaft
  {
    const web = new THREE.Shape();
    web.moveTo(0.3, THROW);
    web.absarc(0, THROW, 0.3, 0, Math.PI, false);
    web.absarc(0, 0, 0.78, Math.PI + 0.6, TAU - 0.6, false);
    web.lineTo(0.3, THROW);

    const webs: THREE.BufferGeometry[] = [];
    const journals: THREE.BufferGeometry[] = [];
    PIN_Z.forEach((z, k) => {
      const a = PIN_ANGLES[k];
      for (const side of [-1, 1]) {
        webs.push(extrude(web, 0.12, 0.015).rotateZ(-a).translate(0, 0, z + side * 0.285));
      }
      journals.push(at(cylinderZ(0.24, 0.45), THROW * Math.sin(a), THROW * Math.cos(a), z));
    });
    MAIN_Z.forEach((z) => journals.push(at(cylinderZ(0.3, 0.24), 0, 0, z)));
    journals.push(at(cylinderZ(0.2, 0.95), 0, 0, 2.5)); // snout
    webs.push(at(cylinderZ(0.45, 0.12), 0, 0, -2.2)); // flywheel flange

    const sprockets = merge([at(gear(20, 0.26, 0.31, 0.06), 0, 0, 2.33), at(gear(20, 0.26, 0.31, 0.06), 0, 0, 2.43)]);
    const crank = group(mesh(merge(webs), mat.forgedSteel), mesh(merge(journals), mat.polishedSteel), mesh(sprockets, mat.darkSteel));
    root.add(crank);
    movers.push((t) => (crank.rotation.z = -t));
    addPart(
      "crankshaft",
      "Crankshaft",
      0.7,
      "Turns the pistons' up-and-down push into rotation. This is a cross-plane crank: its four pins sit 90° apart, which gives a V8 its smooth, burbling rumble.",
      [piece(crank, [0, -2.2, 0])],
    );
  }

  // ------------------------------------------------- pistons and con-rods
  {
    const pistonProfile: [number, number][] = [
      [0, 0.1], [0.4, 0.1], [0.4, -0.22], [0.452, -0.22], [0.452, 0.17], [0.443, 0.17], [0.443, 0.185],
      [0.452, 0.185], [0.452, 0.215], [0.443, 0.215], [0.443, 0.23], [0.452, 0.23], [0.452, 0.26],
      [0.443, 0.26], [0.443, 0.275], [0.452, 0.275], [0.452, 0.3], [0.32, 0.3], [0.24, 0.285], [0, 0.285],
    ];
    const ringAt = (y: number) => lathe([[0.444, y], [0.455, y], [0.455, y + 0.013], [0.444, y + 0.013]], 48);
    const pistonBody = lathe(pistonProfile, 48);
    const rings = merge([ringAt(0.171), ringAt(0.216), ringAt(0.261)]);
    const wristPin = cylinderY(0.105, 0.74, 20).rotateZ(Math.PI / 2);

    const rodGeometry = (() => {
      const beam = new THREE.Shape([
        new THREE.Vector2(-0.14, 0.28),
        new THREE.Vector2(0.14, 0.28),
        new THREE.Vector2(0.085, ROD - 0.13),
        new THREE.Vector2(-0.085, ROD - 0.13),
      ]);
      const rail = (s: number) =>
        new THREE.Shape([
          new THREE.Vector2(s * 0.14, 0.28),
          new THREE.Vector2(s * 0.1, 0.28),
          new THREE.Vector2(s * 0.05, ROD - 0.13),
          new THREE.Vector2(s * 0.085, ROD - 0.13),
        ]);
      return merge([
        ring(0.34, 0.245, 0.2),
        at(ring(0.17, 0.112, 0.2), 0, ROD, 0),
        extrude(beam, 0.08, 0.01),
        extrude(rail(1), 0.2, 0.01),
        extrude(rail(-1), 0.2, 0.01),
        at(cylinderY(0.045, 0.2, 12), 0.27, -0.22, 0),
        at(cylinderY(0.045, 0.2, 12), -0.27, -0.22, 0),
      ]);
    })();

    const pistonPieces: EnginePiece[] = [];
    const rodPieces: EnginePiece[] = [];
    for (const c of cylinders) {
      const pistonObj = group(mesh(pistonBody, mat.machinedAluminium), mesh(rings, mat.darkSteel), mesh(wristPin, mat.polishedSteel));
      const rodObj = mesh(rodGeometry, mat.forgedSteel);
      c.bank.frame.add(pistonObj, rodObj);
      const p = piece(pistonObj, [0, 2.2, 0]);
      const r = piece(rodObj, [0, 1.25, 0]);
      pistonPieces.push(p);
      rodPieces.push(r);
      movers.push((theta) => {
        const a = theta + PIN_ANGLES[c.pin] - c.bank.beta; // pin angle in the bank frame
        const px = THROW * Math.sin(a);
        const py = THROW * Math.cos(a);
        const s = py + Math.sqrt(ROD * ROD - px * px);
        p.base.set(0, s, c.z);
        r.base.set(px, py, c.z);
        rodObj.rotation.z = -Math.atan2(-px, s - py);
      });
    }
    addPart(
      "pistons",
      "Pistons",
      0.6,
      "Eight aluminium plugs that slide in the cylinders. Burning fuel above each one shoves it down with several tonnes of force. The three rings seal in the pressure and scrape oil off the walls.",
      pistonPieces,
    );
    addPart(
      "rods",
      "Connecting rods",
      0.6,
      "Forged steel links from each piston down to the crankshaft. Two rods share each crank pin, one from each bank, which is why the banks are slightly offset front to back.",
      rodPieces,
    );
  }

  // ------------------------------------- head gaskets, heads, valvetrain
  const camCentres: { bank: Bank; x: number; y: number }[] = [];
  {
    const gasketPieces: EnginePiece[] = [];
    const headPieces: EnginePiece[] = [];
    const valvePieces: EnginePiece[] = [];
    const camPieces: EnginePiece[] = [];

    const valveGeo = lathe([[0, 0], [0.135, 0], [0.135, 0.018], [0.06, 0.06], [0.024, 0.11], [0.024, 0.66], [0, 0.66]], 28);
    const springGeo = spring(0.07, 0.013, 0.22, 6);
    const retainerGeo = lathe([[0.03, 0], [0.085, 0.02], [0.085, 0.035], [0.03, 0.035]], 24);
    const bucketGeo = at(cylinderY(0.085, 0.07, 24), 0, 0.035, 0);
    const lobeShape = new THREE.Shape(
      Array.from({ length: 72 }, (_, i) => {
        const a = (i / 72) * TAU;
        const r = CAM_BASE + lobeProfile(wrap(a));
        return new THREE.Vector2(r * Math.cos(a), r * Math.sin(a));
      }),
    );

    for (const bank of banks) {
      const cyls = ofBank(bank);

      // Head gasket: a thin sheet with a hole for every bore.
      const sheet = new THREE.Shape();
      sheet.moveTo(-HEAD_HALF_W, -2.22);
      sheet.lineTo(HEAD_HALF_W, -2.22);
      sheet.lineTo(HEAD_HALF_W, 2.22);
      sheet.lineTo(-HEAD_HALF_W, 2.22);
      sheet.closePath();
      for (const c of cyls) {
        const h = new THREE.Path();
        h.absarc(0, -c.z, BORE + 0.01, 0, TAU, true);
        sheet.holes.push(h);
      }
      const gasket = mesh(extrude(sheet, GASKET, 0, 48).rotateX(-Math.PI / 2).translate(0, DECK + GASKET / 2, 0), mat.copper);
      bank.frame.add(gasket);
      gasketPieces.push(piece(gasket, [0, 0.7, 0]));

      // Cylinder head, with port bosses and cam bearing caps.
      const headParts: THREE.BufferGeometry[] = [at(new RoundedBoxGeometry(HEAD_HALF_W * 2, HEAD_H, 4.5, 2, 0.04), 0, HEAD_FLOOR + HEAD_H / 2, 0)];
      for (const c of cyls) {
        for (const s of [-1, 1]) {
          headParts.push(at(new RoundedBoxGeometry(0.09, 0.26, 0.36, 2, 0.02), s * (HEAD_HALF_W + 0.03), HEAD_FLOOR + 0.24, c.z));
        }
      }
      const camY = HEAD_FLOOR + 0.01 + CAM_REACH * Math.cos(VALVE_TILT);
      const camX = VALVE_X + CAM_REACH * Math.sin(VALVE_TILT);
      for (const z of MAIN_Z) {
        for (const s of [-1, 1]) {
          headParts.push(at(new RoundedBoxGeometry(0.3, camY - HEAD_TOP + 0.02, 0.14, 2, 0.02), s * camX, (HEAD_TOP + camY) / 2, z * 0.98));
        }
      }
      const head = mesh(merge(headParts), mat.castAluminium);
      bank.frame.add(head);
      headPieces.push(piece(head, [0, 1.7, 0]));

      // Valves (exhaust on the outer side, intake inside the V) and cams.
      const valveGroup = new THREE.Group();
      bank.frame.add(valveGroup);
      for (const kind of ["intake", "exhaust"] as const) {
        const side = kind === "exhaust" ? bank.outer : -bank.outer;
        const u = new THREE.Vector2(side * Math.sin(VALVE_TILT), Math.cos(VALVE_TILT));
        const towardValve = Math.atan2(-u.y, -u.x);
        const peak = kind === "intake" ? INTAKE_PEAK : EXHAUST_PEAK;

        const cam = new THREE.Group();
        cam.position.set(side * camX, camY, 0);
        const lobes: THREE.BufferGeometry[] = [];
        const journals: THREE.BufferGeometry[] = [cylinderZ(0.065, 4.55, 16)];
        MAIN_Z.forEach((z) => journals.push(at(cylinderZ(0.1, 0.12, 20), 0, 0, z * 0.98)));
        for (const c of cyls) {
          const lobeAngle = towardValve + (c.fire + peak) / 2;
          for (const dz of [-VALVE_DZ, VALVE_DZ]) {
            lobes.push(extrude(lobeShape, 0.1, 0.008, 6).rotateZ(lobeAngle).translate(0, 0, c.z + dz));

            const assy = new THREE.Group();
            assy.position.set(side * VALVE_X, HEAD_FLOOR + 0.01, c.z + dz);
            assy.rotation.z = -side * VALVE_TILT;
            const valve = mesh(valveGeo, mat.polishedSteel);
            const sp = mesh(springGeo, mat.forgedSteel);
            sp.position.y = 0.4;
            const retainer = mesh(retainerGeo, mat.darkSteel);
            const bucket = mesh(bucketGeo, mat.polishedSteel);
            assy.add(valve, sp, retainer, bucket);
            valveGroup.add(assy);
            movers.push((theta) => {
              const lift = lobeProfile(wrap((c.fire + peak - theta) / 2));
              valve.position.y = -lift;
              retainer.position.y = 0.6 - lift;
              bucket.position.y = 0.62 - lift;
              sp.scale.y = (0.22 - lift) / 0.22;
            });
          }
        }
        const sprocket = at(gear(40, 0.4, 0.44, 0.06, 0.08), 0, 0, bank.side === "left" ? 2.33 : 2.43);
        cam.add(mesh(merge(journals), mat.forgedSteel), mesh(merge(lobes), mat.polishedSteel), mesh(sprocket, mat.darkSteel));
        bank.frame.add(cam);
        movers.push((theta) => (cam.rotation.z = -theta / 2));
        camPieces.push(piece(cam, [0, 3.6, 0]));
        camCentres.push({ bank, x: side * camX, y: camY });
      }
      valvePieces.push(piece(valveGroup, [0, 2.8, 0]));
    }

    addPart(
      "gaskets",
      "Head gaskets",
      0.55,
      "Thin layered metal sheets between the block and each head. They seal the combustion pressure, coolant and oil passages from one another.",
      gasketPieces,
    );
    addPart(
      "heads",
      "Cylinder heads",
      0.5,
      "One aluminium head caps each bank. It forms the roof of every combustion chamber and holds the valves, spark plugs and camshafts.",
      headPieces,
    );
    addPart(
      "valves",
      "Valves & springs",
      0.45,
      "Thirty-two valves, four per cylinder: two let air and fuel in, two let exhaust out. Stiff springs snap each one shut after the cam pushes it open, up to 100 times a second.",
      valvePieces,
    );
    addPart(
      "camshafts",
      "Camshafts",
      0.4,
      "Four camshafts, two per head, turning at half the crank's speed. Each egg-shaped lobe presses a valve open at exactly the right moment in the firing order.",
      camPieces,
    );
  }

  // ------------------------------------------- spark plugs and coil packs
  {
    const metal = lathe([[0, 0], [0.012, 0], [0.012, 0.04], [0.055, 0.04], [0.055, 0.24], [0.085, 0.24], [0.085, 0.32], [0.05, 0.32], [0.05, 0.34], [0, 0.34]], 6);
    const insulator = lathe([[0, 0.33], [0.046, 0.33], [0.04, 0.7], [0.02, 0.74], [0.012, 0.74], [0.012, 0.8], [0, 0.8]], 20);
    const coil = merge([
      at(new RoundedBoxGeometry(0.28, 0.24, 0.32, 2, 0.04), 0, 0.12, 0),
      at(new RoundedBoxGeometry(0.12, 0.1, 0.14, 2, 0.02), 0.12, 0.27, 0.06),
    ]);
    const plugPieces: EnginePiece[] = [];
    const coilPieces: EnginePiece[] = [];
    for (const bank of banks) {
      const plugs = new THREE.Group();
      const coils = new THREE.Group();
      for (const c of ofBank(bank)) {
        const plug = group(mesh(metal, mat.forgedSteel), mesh(insulator, mat.ceramic));
        plug.position.set(0, HEAD_FLOOR + 0.02, c.z);
        plugs.add(plug);
        const pack = mesh(coil, mat.blackPlastic);
        pack.position.set(0, COVER_TOP - 0.02, c.z);
        coils.add(pack);
      }
      bank.frame.add(plugs, coils);
      plugPieces.push(piece(plugs, [0, 4.9, 0]));
      coilPieces.push(piece(coils, [0, 6.9, 0]));
    }
    addPart(
      "plugs",
      "Spark plugs",
      0.3,
      "One per cylinder, screwed into the middle of the combustion chamber. A 40,000-volt spark jumps its tiny gap to light the fuel.",
      plugPieces,
    );
    addPart(
      "coils",
      "Ignition coils",
      0.05,
      "A coil sits on top of each spark plug. It turns the car's 12 volts into the huge voltage the spark needs, timed by the engine computer.",
      coilPieces,
    );
  }

  // ---------------------------------------------------------- valve covers
  {
    const pieces: EnginePiece[] = [];
    for (const bank of banks) {
      const geos: THREE.BufferGeometry[] = [at(new RoundedBoxGeometry(1.28, COVER_H, 4.45, 3, 0.13), 0, HEAD_TOP + COVER_H / 2, -0.02)];
      for (const x of [-0.42, 0.42]) geos.push(at(new RoundedBoxGeometry(0.06, 0.06, 4.1, 2, 0.025), x, COVER_TOP + 0.01, -0.02));
      if (bank.side === "left") geos.push(at(cylinderY(0.13, 0.1, 24), 0.32, COVER_TOP + 0.04, 1.6));
      const cover = mesh(merge(geos), mat.wrinkleRed);
      bank.frame.add(cover);
      pieces.push(piece(cover, [0, 5.9, 0]));
    }
    addPart(
      "valve-covers",
      "Valve covers",
      0.2,
      "Lids over each head that keep oil in around the spinning camshafts and dirt out. The oil filler cap is on the left one.",
      pieces,
    );
  }

  // -------------------------------------------------- intake and throttle
  {
    const runners: THREE.BufferGeometry[] = [];
    for (const c of cylinders) {
      const sx = c.bank.outer;
      const port = toWorld(c.bank, -c.bank.outer * HEAD_HALF_W, HEAD_FLOOR + 0.24, c.z);
      const inward = toWorld(c.bank, -c.bank.outer, 0, 0);
      runners.push(
        tube([port, port.clone().addScaledVector(inward, 0.35), new THREE.Vector3(sx * 0.66, 3.05, c.z), new THREE.Vector3(sx * 0.2, 3.5, c.z * 0.96)], 0.12, false, 48, 14),
      );
    }
    const plenum = new THREE.CapsuleGeometry(0.44, 3.1, 8, 28).rotateX(Math.PI / 2).scale(1.3, 1, 1).translate(0, 3.62, -0.15);
    const intake = mesh(merge([...runners, plenum]), mat.paintedBlack);
    root.add(intake);
    addPart(
      "intake",
      "Intake manifold",
      0,
      "The air box on top. Air from the throttle fills this chamber, then eight curved runners feed each cylinder an equal share.",
      [piece(intake, [0, 3.2, 0])],
    );

    const throttle = group(
      mesh(at(ring(0.33, 0.26, 0.36), 0, 3.62, 2.12), mat.machinedAluminium),
      mesh(at(cylinderZ(0.3, 0.2), 0, 3.62, 1.86), mat.machinedAluminium),
    );
    const blade = mesh(cylinderZ(0.255, 0.012, 32), mat.brass);
    blade.position.set(0, 3.62, 2.12);
    blade.rotation.x = deg(35);
    throttle.add(blade);
    root.add(throttle);
    addPart(
      "throttle",
      "Throttle body",
      0,
      "The engine's air valve. A flap inside opens as you press the accelerator, letting in more air; the computer adds fuel to match.",
      [piece(throttle, [0, 3.2, 1.9])],
    );

    // Fuel rails with an injector aimed into each intake port.
    const pieces: EnginePiece[] = [];
    for (const bank of banks) {
      const x = -bank.outer * (HEAD_HALF_W + 0.36);
      const geos = [at(cylinderZ(0.06, 4.0, 16), x, HEAD_TOP + 0.12, 0)];
      for (const c of ofBank(bank)) {
        const from = new THREE.Vector3(x, HEAD_TOP + 0.08, c.z);
        const to = new THREE.Vector3(-bank.outer * (HEAD_HALF_W + 0.1), HEAD_FLOOR + 0.3, c.z);
        const inj = cylinderY(0.04, from.distanceTo(to), 12);
        inj.rotateZ(-Math.atan2(to.x - from.x, to.y - from.y) + Math.PI);
        geos.push(at(inj, (from.x + to.x) / 2, (from.y + to.y) / 2, c.z));
      }
      const rail = mesh(merge(geos), mat.machinedAluminium);
      bank.frame.add(rail);
      pieces.push(piece(rail, [-bank.outer * 0.9, 2.2, 0]));
    }
    addPart(
      "fuel-rails",
      "Fuel rails & injectors",
      0.1,
      "A pressurised pipe along each bank feeds fuel to four injectors. Each one sprays a fine mist into its intake port in a burst lasting a few thousandths of a second.",
      pieces,
    );
  }

  // ------------------------------------------------------ exhaust headers
  {
    const pieces: EnginePiece[] = [];
    for (const bank of banks) {
      const sx = bank.outer;
      const tubes: THREE.BufferGeometry[] = [];
      ofBank(bank).forEach((c, i) => {
        const port = toWorld(bank, bank.outer * HEAD_HALF_W, HEAD_FLOOR + 0.24, c.z);
        const out = toWorld(bank, bank.outer, 0, 0);
        const ox = ((i % 2) - 0.5) * 0.16;
        const oy = (Math.floor(i / 2) - 0.5) * 0.16;
        tubes.push(
          heatTint(
            tube(
              [
                port,
                port.clone().addScaledVector(out, 0.32),
                new THREE.Vector3(sx * 2.78, 0.85, c.z * 0.9),
                new THREE.Vector3(sx * 2.82, -0.1, (c.z - 1.6) / 2),
                new THREE.Vector3(sx * (2.52 + ox), -0.66 + oy, -2.05),
              ],
              0.105,
              false,
              72,
              12,
            ),
          ),
        );
      });
      const collector = merge([
        at(cylinderZ(0.15, 0.5, 24, 0.3), sx * 2.52, -0.66, -2.35),
        tube([new THREE.Vector3(sx * 2.52, -0.66, -2.55), new THREE.Vector3(sx * 2.5, -0.78, -3.0), new THREE.Vector3(sx * 2.45, -0.95, -3.5)], 0.15, false, 16, 16),
      ]);
      const headers = group(mesh(merge(tubes), mat.exhaust), mesh(collector, stainless));
      root.add(headers);
      pieces.push(piece(headers, [sx * 1.9, -0.4, 0]));
    }
    addPart(
      "headers",
      "Exhaust headers",
      0.15,
      "Four steel pipes per bank carry burning-hot exhaust out of the head and merge into one collector. Equal-length pipes help each cylinder breathe out. The blue and gold is heat tint.",
      pieces,
    );
  }

  // --------------------------------------------------------------- oil pan
  {
    const pan = mesh(
      merge([
        at(new RoundedBoxGeometry(2.7, 0.06, 4.6, 2, 0.02), 0, -0.65, 0),
        at(new RoundedBoxGeometry(2.45, 0.36, 4.45, 3, 0.08), 0, -0.84, 0),
        at(new RoundedBoxGeometry(1.7, 0.62, 1.9, 3, 0.1), 0, -1.12, -1.15),
        at(cylinderY(0.07, 0.08, 6), 0, -1.46, -1.15),
      ]),
      mat.paintedBlack,
    );
    root.add(pan);
    addPart(
      "oil-pan",
      "Oil pan",
      0.35,
      "The sump bolted under the block. It holds about 8 litres of oil, which a pump sucks up from the deep end and squirts onto every bearing.",
      [piece(pan, [0, -3.6, 0])],
    );
  }

  // ------------------------------------------- timing chains and cover
  {
    const chainPieces: EnginePiece[] = [];
    for (const bank of banks) {
      const z = bank.side === "left" ? 2.33 : 2.43;
      const wheels: [number, number, number][] = [[0, 0, 0.33]];
      for (const c of camCentres.filter((k) => k.bank === bank)) {
        const w = toWorld(bank, c.x, c.y, 0);
        wheels.push([w.x, w.y, 0.46]);
      }
      const chain = loop(wheels, z, 0.028, mat.darkSteel);
      root.add(chain);
      chainPieces.push(piece(chain, [0, 0, 1.5]));
    }
    addPart(
      "timing-chains",
      "Timing chains",
      0.35,
      "Steel chains that tie each bank's two camshafts to the crankshaft, so the valves stay in perfect step with the pistons. The cam gears are twice the size, so the cams turn at half speed.",
      chainPieces,
    );

    const blockFront = [
      new THREE.Vector2(-1.3, -0.62),
      new THREE.Vector2(1.3, -0.62),
      new THREE.Vector2(1.3, 0.25),
      new THREE.Vector2(-1.3, 0.25),
    ];
    // A Y shape: one lobe over the crank, one arm up each bank to its cams.
    const lobes = [hull([...blockFront, ...circlePoints(0, 0, 0.5)])];
    for (const bank of banks) {
      const discs = camCentres
        .filter((c) => c.bank === bank)
        .flatMap((c) => {
          const w = toWorld(bank, c.x, c.y, 0);
          return circlePoints(w.x, w.y, 0.56, 24);
        });
      lobes.push(hull([...circlePoints(0, 0, 0.45), ...discs]));
    }
    const cover = mesh(
      merge(lobes.map((outline, i) => extrude(new THREE.Shape(outline), 0.08, 0.03, 4).translate(0, 0, 2.53 + i * 0.004))),
      mat.castAluminium,
    );
    root.add(cover);
    addPart(
      "timing-cover",
      "Timing cover",
      0.2,
      "An aluminium cover over the front of the engine that keeps oil in around the timing chains.",
      [piece(cover, [0, 0, 2.4])],
    );
  }

  // --------------------------------------------- front accessories, belt
  {
    const PULLEY_Z = 3.0;
    const pulley = (r: number) =>
      lathe(
        [
          [0.08, -0.1], [r, -0.1], [r, -0.07],
          [r - 0.03, -0.05], [r, -0.03], [r - 0.03, -0.01], [r, 0.01], [r - 0.03, 0.03], [r, 0.05],
          [r, 0.1], [0.08, 0.1],
        ],
        40,
      ).rotateX(Math.PI / 2);

    const balancer = group(mesh(at(pulley(0.56), 0, 0, PULLEY_Z), mat.darkSteel), mesh(at(cylinderZ(0.1, 0.24, 6), 0, 0, PULLEY_Z + 0.1), mat.polishedSteel));
    root.add(balancer);
    movers.push((t) => (balancer.rotation.z = -t));
    addPart(
      "balancer",
      "Harmonic balancer",
      0.05,
      "A heavy pulley on the nose of the crankshaft. A rubber ring inside soaks up the crank's twisting vibrations, and its grooves drive the accessory belt.",
      [piece(balancer, [0, 0, 3.4])],
    );

    const pumpPulley = mesh(pulley(0.34), mat.darkSteel);
    const pump = group(mesh(at(cylinderZ(0.32, 0.36, 28), 0, 0, 2.75), mat.castAluminium));
    pump.position.set(0, 1.35, 0);
    pumpPulley.position.z = PULLEY_Z;
    pump.add(pumpPulley);
    root.add(pump);
    movers.push((t) => (pumpPulley.rotation.z = -t * 1.6));
    addPart(
      "water-pump",
      "Water pump",
      0.1,
      "Belt-driven pump that pushes coolant through passages in the block and heads, then out to the radiator.",
      [piece(pump, [0, 0, 2.6])],
    );

    const altPulley = mesh(pulley(0.18), mat.darkSteel);
    const fins = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * TAU;
      return at(new THREE.BoxGeometry(0.04, 0.1, 0.5).rotateZ(-a), 0.4 * Math.sin(a), 0.4 * Math.cos(a), 2.62);
    });
    const alternator = group(mesh(merge([at(cylinderZ(0.4, 0.5, 32), 0, 0, 2.62), ...fins]), mat.castAluminium));
    alternator.position.set(2.2, 0.35, 0);
    altPulley.position.z = PULLEY_Z;
    alternator.add(altPulley);
    root.add(alternator);
    movers.push((t) => (altPulley.rotation.z = -t * 3));
    addPart(
      "alternator",
      "Alternator",
      0.05,
      "A small generator spun by the belt. It charges the battery and powers everything electrical while the engine runs.",
      [piece(alternator, [1.4, 0.4, 2.4])],
    );

    const idler = mesh(at(cylinderZ(0.22, 0.2, 28), 0, 0, PULLEY_Z), mat.polishedSteel);
    idler.position.set(-1.25, 1.0, 0);
    const belt = loop(
      [
        [0, 0, 0.58],
        [0, 1.35, 0.36],
        [2.2, 0.35, 0.2],
        [-1.25, 1.0, 0.24],
      ],
      PULLEY_Z,
      0.05,
      mat.rubber,
    );
    const beltGroup = group(belt, idler);
    root.add(beltGroup);
    addPart(
      "belt",
      "Accessory belt",
      0,
      "One ribbed rubber belt, driven by the crankshaft, that turns the water pump and alternator.",
      [piece(beltGroup, [0, 0, 4.4])],
    );
  }

  // --------------------------------------------------------------- flywheel
  {
    const disc = lathe([[0.2, 0], [1.05, 0], [1.05, 0.08], [0.6, 0.12], [0.45, 0.16], [0.2, 0.16]], 64).rotateX(-Math.PI / 2);
    const teeth = at(gear(110, 1.06, 1.12, 0.08), 0, 0, -0.04);
    const fly = group(mesh(disc, mat.darkSteel), mesh(teeth, mat.forgedSteel));
    fly.position.set(0, 0, -2.3);
    root.add(fly);
    movers.push((t) => (fly.rotation.z = -t));
    addPart(
      "flywheel",
      "Flywheel",
      0.65,
      "A heavy disc on the back of the crankshaft. Its weight smooths out the pulses between firings, and the starter motor spins the engine through its toothed rim.",
      [piece(fly, [0, -2.2, -1.6])],
    );
  }

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.geometry.computeBoundingBox();
  });
  // The offsets above are tuned relative to each other; this sets the
  // overall spread of the exploded view.
  for (const part of parts) for (const p of part.pieces) p.explode.multiplyScalar(0.62);

  return {
    type: "v8",
    label: ENGINE_LABELS.v8,
    subtitle: "Cross-plane 90° V8 · 32 valves · DOHC",
    root,
    parts,
    center: new THREE.Vector3(0, 1.8, 0),
    radius: 6.5,
    setCrankAngle(theta) {
      for (const move of movers) move(theta);
    },
    dispose() {
      disposeObject(root);
      stainless.dispose();
    },
  };
}
