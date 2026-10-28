"use client";

import Link from "next/link";
import SpotCard from "@/components/SpotCard";
import type { CatalogCar } from "@/core/catalog";
import { usePhotoUrl, type Spot } from "./store";

export default function SpotTile({ spot, car }: { spot: Spot; car: CatalogCar }) {
  const url = usePhotoUrl(spot.photo);
  return (
    <Link href={`/card/?id=${spot.id}`} className="block active:scale-[0.99]">
      <SpotCard car={car} points={spot.points} photoUrl={url} paint={spot.paint} />
    </Link>
  );
}
