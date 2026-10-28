// Demo data for building the UI before accounts and spotting exist.
// Delete once milestone 2 (accounts) and 4 (spotting) land.

import type { CatalogCar } from "@/core/catalog";

export interface DemoSpot {
  id: string;
  car: CatalogCar;
  city: string;
  date: string;
  points: number;
  paint: string;
}

const car = (c: CatalogCar) => c;

export const DEMO_SPOTS: DemoSpot[] = [
  {
    id: "d1",
    car: car({ id: "ferrari-f40", make: "Ferrari", model: "F40", generation: "F40", years: [1987, 1992], tier: "exotic", engine: "v8", body: "supercar", built: 1315 }),
    city: "Toronto",
    date: "2026-10-26",
    points: 875,
    paint: "#c1121f",
  },
  {
    id: "d2",
    car: car({ id: "porsche-911-992-gt3-rs", make: "Porsche", model: "911", generation: "992", variant: "GT3 RS", years: [2022, null], tier: "rare", engine: "flat6", body: "coupe" }),
    city: "Toronto",
    date: "2026-10-24",
    points: 300,
    paint: "#2a9d8f",
  },
  {
    id: "d3",
    car: car({ id: "ford-mustang-s550", make: "Ford", model: "Mustang", generation: "S550", years: [2015, 2023], tier: "occasional", engine: "v8", body: "coupe" }),
    city: "Mississauga",
    date: "2026-10-20",
    points: 38,
    paint: "#1d3557",
  },
  {
    id: "d4",
    car: car({ id: "mazda-mx5-na", make: "Mazda", model: "MX-5", generation: "NA", years: [1989, 1997], tier: "niche", engine: "i4", body: "convertible" }),
    city: "Oakville",
    date: "2026-10-18",
    points: 132,
    paint: "#e9c46a",
  },
  {
    id: "d5",
    car: car({ id: "honda-civic-fl", make: "Honda", model: "Civic", generation: "11th gen (FL)", years: [2021, null], tier: "common", engine: "i4", body: "hatchback" }),
    city: "Toronto",
    date: "2026-10-15",
    points: 15,
    paint: "#adb5bd",
  },
  {
    id: "d6",
    car: car({ id: "mclaren-f1", make: "McLaren", model: "F1", generation: "F1", years: [1992, 1998], tier: "legendary", engine: "v12", body: "supercar", built: 106 }),
    city: "Toronto",
    date: "2026-10-12",
    points: 5500,
    paint: "#6c757d",
  },
];
