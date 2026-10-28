// ENGINES MODULE (teammate-owned). Ported from Pavement.
// Builds each engine layout from simple boxes and cylinders. Replacing these
// with detailed glTF models in public/engines/ is the engines roadmap.

import type { EngineType } from '@/core/engines';
import { ENGINE_LABELS } from '@/core/engines';
import type { EngineBlueprint, EnginePart } from './contract';

export type EngineShape = 'box' | 'cylinder';
export type EngineAxis = 'x' | 'y' | 'z';
export type EngineMaterialKind =
  | 'block'
  | 'head'
  | 'piston'
  | 'crank'
  | 'exhaust'
  | 'copper'
  | 'accent';

export interface EnginePartSpec extends EnginePart {
  shape: EngineShape;
  size: [number, number, number]; // [width, height, depth]
  axis: EngineAxis;
  bankTiltZRad?: number; // optional tilt around Z axis for V/W cylinder heads & pistons
  material: EngineMaterialKind;
  motion?: {
    kind: 'reciprocate' | 'spin' | 'orbit';
    dir?: [number, number, number];
    phase?: number;
    amplitude?: number;
  };
}

export interface EngineBlueprintSpec extends EngineBlueprint {
  parts: EnginePartSpec[];
}

interface LayoutParams {
  rows: number;
  banks: number;
  veeAngleDeg: number;
}

const DESCRIPTIONS = {
  block:
    'The heavy metal body of the engine. Everything else bolts onto it or moves inside it, and passages in its walls carry water and oil to keep it cool.',
  head:
    'Sits on top of the engine and opens and closes little doors (valves) to let fresh air and fuel in, and burnt exhaust out, at the exact right moment.',
  intake:
    'The pipes on top that feed fresh air into each cylinder so the fuel has oxygen to burn.',
  oilPan:
    'A shallow tray at the very bottom that holds the engine’s oil. A pump sucks oil up from here and squirts it onto every moving part so metal never scrapes on metal.',
  crankshaft:
    'A heavy, offset rod along the bottom. The pistons push it up and down and its offset bends turn that into a spinning motion — the same way your legs push bike pedals straight down to make the wheel go round.',
  flywheel:
    'A heavy disc on the back of the crankshaft. Its weight keeps the engine spinning smoothly between each piston push and connects to the gearbox.',
  exhaust:
    'Hot, noisy pipes that collect the burnt gases leaving each cylinder and send them under the car to the muffler.',
  piston:
    'A metal plug that slides tightly up and down inside the engine. Thousands of times a minute, a tiny explosion of fuel and air above it slams it downward, and that push is what turns the wheels.',
  rotorHousing:
    'A hollow chamber shaped like a rounded figure-eight. Instead of pistons going up and down, a three-cornered rotor spins inside this casing.',
  rotor:
    'A flat, three-cornered piece of metal that wobbles and spins inside the housing. Each of its three faces traps air and fuel, squeezes it, gets pushed by the spark, and sweeps the exhaust out — all without ever stopping and reversing like a piston does.',
  eccentricShaft:
    'A rotary engine’s version of a crankshaft. Rounded lobes along it catch the spinning rotors and carry their power out to the gearbox.',
  stator:
    'A ring of tightly wound copper coils fixed inside the motor case. Sending electricity through the coils makes a spinning magnetic field that drags the rotor around with no parts touching.',
  electricRotor:
    'The spinning core inside the motor, studded with magnets. The magnetic field from the copper coils around it pulls it round in silence, with full force from a dead stop.',
  inverter:
    'The brain box on top of the motor. The battery gives steady direct current; this box chops it into three waves of alternating current and speeds them up or slows them down as you press the pedal.',
  reductionGear:
    'An electric motor spins happily at 15,000 rpm — far too fast for the wheels. A single pair of gears here steps that speed down and multiplies the twisting force.',
};

function getLayoutParams(type: EngineType): LayoutParams | null {
  switch (type) {
    case 'i3':
      return { rows: 3, banks: 1, veeAngleDeg: 0 };
    case 'i4':
      return { rows: 4, banks: 1, veeAngleDeg: 0 };
    case 'i5':
      return { rows: 5, banks: 1, veeAngleDeg: 0 };
    case 'i6':
      return { rows: 6, banks: 1, veeAngleDeg: 0 };
    case 'v6':
      return { rows: 3, banks: 2, veeAngleDeg: 60 };
    case 'v8':
      return { rows: 4, banks: 2, veeAngleDeg: 90 };
    case 'v10':
      return { rows: 5, banks: 2, veeAngleDeg: 72 };
    case 'v12':
      return { rows: 6, banks: 2, veeAngleDeg: 60 };
    case 'v16':
      return { rows: 8, banks: 2, veeAngleDeg: 60 };
    case 'w12':
      return { rows: 3, banks: 4, veeAngleDeg: 72 };
    case 'w16':
      return { rows: 4, banks: 4, veeAngleDeg: 72 };
    case 'flat4':
      return { rows: 2, banks: 2, veeAngleDeg: 180 };
    case 'flat6':
      return { rows: 3, banks: 2, veeAngleDeg: 180 };
    case 'rotary':
    case 'electric':
      return null;
  }
}

function buildPistonParts(layout: LayoutParams): EnginePartSpec[] {
  const { rows, banks, veeAngleDeg } = layout;
  const spacing = 0.55;
  const length = rows * spacing + 0.35;
  const halfAngle = ((veeAngleDeg / 2) * Math.PI) / 180;
  const isFlat = veeAngleDeg === 180;
  const isInline = banks === 1;

  const bankAngles: number[] = (() => {
    switch (banks) {
      case 1:
        return [0];
      case 2:
        return [-halfAngle, halfAngle];
      default:
        return [
          -halfAngle * 1.15,
          -halfAngle * 0.45,
          halfAngle * 0.45,
          halfAngle * 1.15,
        ];
    }
  })();

  const parts: EnginePartSpec[] = [];

  // 1. Engine Block
  const blockWidth = isInline ? 0.85 : isFlat ? 1.5 : 1.25;
  const blockHeight = isFlat ? 0.65 : 0.95;
  parts.push({
    id: 'block',
    name: 'Engine block',
    description: DESCRIPTIONS.block,
    shape: 'box',
    size: [blockWidth, blockHeight, length],
    axis: 'y',
    rest: [0, 0, 0],
    exploded: [0, 0, 0],
    material: 'block',
  });

  // 2. Cylinder Head(s)
  const headPositions: { label: string; angle: number }[] = isInline
    ? [{ label: 'Cylinder head', angle: 0 }]
    : [
        { label: 'Left cylinder head', angle: -halfAngle },
        { label: 'Right cylinder head', angle: halfAngle },
      ];

  headPositions.forEach((h, idx) => {
    const dx = Math.sin(h.angle);
    const dy = Math.cos(h.angle);
    const dist = 0.62;
    const explodeDist = 1.95;
    parts.push({
      id: `head-${idx}`,
      name: h.label,
      description: DESCRIPTIONS.head,
      shape: 'box',
      size: [isFlat ? 0.32 : 0.55, isFlat ? 0.55 : 0.32, length * 0.96],
      axis: 'y',
      bankTiltZRad: -h.angle * 0.55,
      rest: [dx * dist, dy * dist, 0],
      exploded: [dx * explodeDist, dy * explodeDist + (isInline ? 0.4 : 0.1), 0],
      material: 'head',
    });
  });

  // 3. Intake Manifold
  const intakeRestY = isFlat ? 0.55 : isInline ? 0.95 : 0.82;
  parts.push({
    id: 'intake',
    name: 'Air intake',
    description: DESCRIPTIONS.intake,
    shape: 'box',
    size: [isInline ? 0.45 : 0.65, 0.26, length * 0.85],
    axis: 'y',
    rest: [isInline ? 0.38 : 0, intakeRestY, 0],
    exploded: [isInline ? 1.15 : 0, intakeRestY + 1.85, 0],
    material: 'block',
  });

  // 4. Oil Pan
  parts.push({
    id: 'oil-pan',
    name: 'Oil pan',
    description: DESCRIPTIONS.oilPan,
    shape: 'box',
    size: [blockWidth * 0.88, 0.26, length * 0.92],
    axis: 'y',
    rest: [0, -blockHeight / 2 - 0.14, 0],
    exploded: [0, -blockHeight / 2 - 1.55, 0],
    material: 'crank',
  });

  // 5. Crankshaft
  parts.push({
    id: 'crankshaft',
    name: 'Crankshaft',
    description: DESCRIPTIONS.crankshaft,
    shape: 'cylinder',
    size: [0.34, length * 1.06, 0.34],
    axis: 'z',
    rest: [0, -blockHeight * 0.25, 0],
    exploded: [0, -blockHeight * 0.25 - 0.88, 0],
    material: 'crank',
    motion: { kind: 'spin' },
  });

  // 6. Flywheel
  parts.push({
    id: 'flywheel',
    name: 'Flywheel',
    description: DESCRIPTIONS.flywheel,
    shape: 'cylinder',
    size: [0.95, 0.14, 0.95],
    axis: 'z',
    rest: [0, -blockHeight * 0.15, -length / 2 - 0.1],
    exploded: [0, -blockHeight * 0.15, -length / 2 - 1.25],
    material: 'crank',
    motion: { kind: 'spin' },
  });

  // 7. Exhaust Manifold(s)
  const exhaustSides: { label: string; side: number }[] = isInline
    ? [{ label: 'Exhaust pipes', side: -1 }]
    : [
        { label: 'Left exhaust pipes', side: -1 },
        { label: 'Right exhaust pipes', side: 1 },
      ];

  exhaustSides.forEach((ex, idx) => {
    const xRest = ex.side * (blockWidth / 2 + 0.18);
    const yRest = isFlat ? -0.35 : 0.15;
    parts.push({
      id: `exhaust-${idx}`,
      name: ex.label,
      description: DESCRIPTIONS.exhaust,
      shape: 'cylinder',
      size: [0.24, length * 0.88, 0.24],
      axis: 'z',
      rest: [xRest, yRest, 0],
      exploded: [xRest + ex.side * 1.45, yRest - (isFlat ? 0.55 : 0), 0],
      material: 'exhaust',
    });
  });

  // 8. Pistons (every cylinder in the layout)
  let number = 0;
  for (let bIdx = 0; bIdx < bankAngles.length; bIdx++) {
    const angle = bankAngles[bIdx];
    const dx = Math.sin(angle);
    const dy = Math.cos(angle);
    for (let row = 0; row < rows; row++) {
      number += 1;
      const z = (row - (rows - 1) / 2) * spacing;
      const restDist = 0.26;
      const explodeDist = 1.2 + (bIdx % 2 === 0 ? 0.18 : 0.36);
      const phase = ((row * Math.PI * 2) / Math.max(rows, 1)) + bIdx * 0.85;
      parts.push({
        id: `piston-${number}`,
        name: `Piston ${number}`,
        description: DESCRIPTIONS.piston,
        shape: 'cylinder',
        size: [0.38, 0.38, 0.38],
        axis: isFlat ? 'x' : 'y',
        bankTiltZRad: isFlat ? 0 : -angle,
        rest: [dx * restDist, dy * restDist, z],
        exploded: [dx * explodeDist, dy * explodeDist, z * 1.18],
        material: 'piston',
        motion: {
          kind: 'reciprocate',
          dir: [dx, dy, 0],
          phase,
          amplitude: 0.16,
        },
      });
    }
  }

  return parts;
}

function buildRotaryParts(): EnginePartSpec[] {
  return [
    {
      id: 'rotor-housing',
      name: 'Rotor housing',
      description: DESCRIPTIONS.rotorHousing,
      shape: 'cylinder',
      size: [1.35, 1.05, 1.35],
      axis: 'z',
      rest: [0, 0, 0],
      exploded: [0, 0, 0],
      material: 'block',
    },
    {
      id: 'front-rotor',
      name: 'Front rotor',
      description: DESCRIPTIONS.rotor,
      shape: 'cylinder',
      size: [0.85, 0.28, 0.85],
      axis: 'z',
      rest: [0, 0.04, 0.22],
      exploded: [-0.85, 0.85, 1.25],
      material: 'piston',
      motion: { kind: 'orbit', phase: 0, amplitude: 0.09 },
    },
    {
      id: 'rear-rotor',
      name: 'Rear rotor',
      description: DESCRIPTIONS.rotor,
      shape: 'cylinder',
      size: [0.85, 0.28, 0.85],
      axis: 'z',
      rest: [0, -0.04, -0.22],
      exploded: [0.85, 0.85, -1.25],
      material: 'piston',
      motion: { kind: 'orbit', phase: Math.PI, amplitude: 0.09 },
    },
    {
      id: 'eccentric-shaft',
      name: 'Eccentric shaft',
      description: DESCRIPTIONS.eccentricShaft,
      shape: 'cylinder',
      size: [0.28, 1.65, 0.28],
      axis: 'z',
      rest: [0, 0, 0],
      exploded: [0, -1.25, 0],
      material: 'crank',
      motion: { kind: 'spin' },
    },
    {
      id: 'flywheel',
      name: 'Flywheel',
      description: DESCRIPTIONS.flywheel,
      shape: 'cylinder',
      size: [1.05, 0.14, 1.05],
      axis: 'z',
      rest: [0, 0, -0.68],
      exploded: [0, 0, -1.85],
      material: 'crank',
      motion: { kind: 'spin' },
    },
    {
      id: 'intake',
      name: 'Air intake',
      description: DESCRIPTIONS.intake,
      shape: 'box',
      size: [0.55, 0.28, 0.9],
      axis: 'y',
      rest: [0, 0.78, 0],
      exploded: [0, 1.85, 0],
      material: 'head',
    },
    {
      id: 'exhaust',
      name: 'Exhaust pipe',
      description: DESCRIPTIONS.exhaust,
      shape: 'cylinder',
      size: [0.24, 0.95, 0.24],
      axis: 'z',
      rest: [-0.78, -0.2, 0],
      exploded: [-1.85, -0.55, 0],
      material: 'exhaust',
    },
  ];
}

function buildElectricParts(): EnginePartSpec[] {
  return [
    {
      id: 'stator',
      name: 'Copper coil ring (stator)',
      description: DESCRIPTIONS.stator,
      shape: 'cylinder',
      size: [1.35, 1.25, 1.35],
      axis: 'z',
      rest: [0, 0, 0],
      exploded: [0, 0, 0],
      material: 'copper',
    },
    {
      id: 'electric-rotor',
      name: 'Spinning magnet core (rotor)',
      description: DESCRIPTIONS.electricRotor,
      shape: 'cylinder',
      size: [0.78, 1.15, 0.78],
      axis: 'z',
      rest: [0, 0, 0],
      exploded: [0, 0, 1.65],
      material: 'piston',
      motion: { kind: 'spin' },
    },
    {
      id: 'inverter',
      name: 'Power controller (inverter)',
      description: DESCRIPTIONS.inverter,
      shape: 'box',
      size: [0.95, 0.34, 1.05],
      axis: 'y',
      rest: [0, 0.85, 0],
      exploded: [0, 1.85, 0],
      material: 'head',
    },
    {
      id: 'reduction-gear',
      name: 'Single-speed reduction gear',
      description: DESCRIPTIONS.reductionGear,
      shape: 'box',
      size: [0.85, 0.85, 0.42],
      axis: 'y',
      rest: [0, -0.1, -0.88],
      exploded: [0, -0.2, -1.85],
      material: 'crank',
    },
  ];
}

const SUBTITLES: Record<EngineType, string> = {
  i3: '3 cylinders in a single row · compact & thrifty',
  i4: '4 cylinders in a line · everyday workhorse',
  i5: '5 cylinders in a line · off-beat warble',
  i6: '6 cylinders in a line · naturally balanced',
  v6: '6 cylinders in a 60° V · compact six-cylinder',
  v8: '8 cylinders in a 90° V · classic rumble & torque',
  v10: '10 cylinders in a 72° V · high-revving exotic howl',
  v12: '12 cylinders in a 60° V · turbine-smooth grand tourer',
  v16: '16 cylinders in two long banks · ultra-rare coachbuilt power',
  w12: '12 cylinders in 4 staggered banks · short & muscular',
  w16: '16 cylinders in 4 banks · quad-turbo hypercar heart',
  flat4: '4 horizontally opposed cylinders · low center of gravity',
  flat6: '6 horizontally opposed cylinders · signature rear-engine wail',
  rotary: 'Twin spinning triangular rotors · compact & rev-happy',
  electric: 'Copper stator & magnetic rotor · instant silent torque',
};

export function getEngineBlueprint(type: EngineType): EngineBlueprintSpec {
  const layout = getLayoutParams(type);
  const parts = layout
    ? buildPistonParts(layout)
    : type === 'rotary'
    ? buildRotaryParts()
    : buildElectricParts();

  return {
    type,
    label: ENGINE_LABELS[type],
    subtitle: SUBTITLES[type],
    parts,
  };
}
