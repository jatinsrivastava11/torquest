// CORE (lead-owned). Side profiles for each body style, in a 200 x 80 box
// (y down, ground at y = 74, front of the car at small x). Used by the flat
// CarSilhouette and extruded into the 3D body.

import type { BodyStyle, CatalogCar } from "@/core/catalog";

export interface Profile {
  body: string;
  glass: string;
  /** Wheel centres along x; wheels sit on the ground, radius 12. */
  wheels: [number, number];
  /** x ranges of the windscreen and rear window along the roofline. */
  windscreen: [number, number];
  backlight?: [number, number];
  /** x ranges of the panels that open: front hood, rear deck, mid cover. */
  front: [number, number];
  rear?: [number, number];
  mid?: [number, number];
}

export const PROFILES: Record<BodyStyle, Profile> = {
  supercar: {
    body: "M8 62C8 56 14 52 26 50L64 45C80 35 100 29 122 29C140 29 156 37 170 44L186 48C192 50 194 56 194 62Z",
    glass: "M72 44C86 35 102 32 120 32C134 32 146 37 156 43Z",
    windscreen: [68, 104],
    backlight: [142, 168],
    wheels: [46, 156],
    front: [18, 62],
    mid: [156, 188],
  },
  coupe: {
    body: "M8 62C8 54 14 50 26 48L58 44C72 32 92 26 116 26C136 26 150 34 162 42L184 46C190 48 194 54 194 62Z",
    glass: "M68 43C80 33 96 29 114 29C130 29 142 35 152 42Z",
    windscreen: [60, 94],
    backlight: [136, 162],
    wheels: [48, 152],
    front: [18, 56],
    rear: [158, 188],
  },
  convertible: {
    body: "M8 62C8 54 14 50 26 48L70 44L84 34L88 35L82 44L162 44L184 47C190 49 194 54 194 62Z",
    glass: "M84 36L87 36L82 44L79 44Z",
    windscreen: [72, 86],
    wheels: [48, 152],
    front: [18, 68],
    rear: [160, 188],
  },
  sedan: {
    body: "M6 62C6 54 10 50 22 48L56 44C68 32 84 26 104 26L130 26C142 26 152 34 160 42L184 46C190 48 194 54 194 62Z",
    glass: "M64 43C74 33 88 29 104 29L128 29C138 29 146 35 152 42Z",
    windscreen: [58, 88],
    backlight: [136, 160],
    wheels: [50, 150],
    front: [16, 54],
    rear: [162, 188],
  },
  wagon: {
    body: "M6 62C6 54 10 50 22 48L54 43C66 31 80 25 98 25L170 25C178 25 182 32 184 40L190 46C193 49 194 54 194 62Z",
    glass: "M62 42C72 32 84 28 98 28L168 28C174 28 177 34 178 41Z",
    windscreen: [56, 84],
    wheels: [50, 152],
    front: [16, 52],
  },
  hatchback: {
    body: "M10 62C10 54 14 50 24 48L56 42C68 30 82 24 100 24L148 24C158 24 166 32 172 42L186 46C190 48 192 54 192 62Z",
    glass: "M64 41C74 31 86 27 100 27L146 27C154 27 160 33 164 41Z",
    windscreen: [58, 86],
    backlight: [152, 172],
    wheels: [50, 150],
    front: [18, 54],
  },
  suv: {
    body: "M8 62L8 46C8 42 12 40 20 40L48 38C58 24 70 18 88 18L156 18C166 18 172 24 176 34L188 40C192 42 194 48 194 62Z",
    glass: "M56 37C64 26 74 21 88 21L154 21C162 21 167 26 170 35Z",
    windscreen: [50, 72],
    wheels: [46, 156],
    front: [12, 46],
  },
  pickup: {
    body: "M6 62L6 44C6 40 10 38 18 38L44 36C54 22 64 18 80 18L110 18C116 18 118 22 118 28L118 40L192 40L194 62Z",
    glass: "M52 35C60 25 68 21 80 21L108 21C112 21 114 24 114 28L114 35Z",
    windscreen: [46, 68],
    wheels: [42, 160],
    front: [10, 42],
  },
  van: {
    body: "M8 62L8 40C8 30 16 24 30 18L50 14L184 14C190 14 194 18 194 24L194 62Z",
    glass: "M34 36L40 20L56 17L56 36Z",
    windscreen: [30, 50],
    wheels: [44, 160],
    front: [10, 32],
  },
};

export type EngineBay = "front" | "mid" | "rear";

const REAR = new Set(["Porsche 911", "Porsche 356", "Porsche 959", "Volkswagen Beetle", "Chevrolet Corvair", "DeLorean DMC-12", "Tesla Model S"]);
const MID = new Set(["Porsche Boxster", "Porsche Cayman", "Porsche 914", "Porsche Carrera GT", "Porsche 918 Spyder", "Porsche 911 GT1", "Porsche 550 Spyder", "Ford GT", "Ford GT40", "Ford RS200", "Honda NSX", "Acura NSX", "Toyota MR2"]);

/** Where the engine sits, so the right panel opens. */
export function engineBay(car: Pick<CatalogCar, "make" | "model" | "body">): EngineBay {
  const name = `${car.make} ${car.model}`;
  if (REAR.has(name)) return "rear";
  if (MID.has(name) || car.body === "supercar") return "mid";
  return "front";
}
