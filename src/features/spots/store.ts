"use client";

// Spots live on the device (IndexedDB) until accounts exist (milestone 2).
// Photos never leave the phone.

import { useCallback, useEffect, useState } from "react";

export interface SpotLine {
  label: string;
  points: number;
}

export interface Spot {
  id: string;
  carId: string;
  takenAt: string; // ISO
  points: number;
  lines: SpotLine[];
  /** Dominant paint colour sampled from the photo, e.g. "#b5121b". */
  paint: string;
  photo: Blob;
}

const DB = "torquest";
const STORE = "spots";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const listSpots = async () =>
  ((await tx("readonly", (s) => s.getAll())) as Spot[]).sort((a, b) => b.takenAt.localeCompare(a.takenAt));
export const getSpot = (id: string) => tx("readonly", (s) => s.get(id)) as Promise<Spot | undefined>;
export const saveSpot = (spot: Spot) => tx("readwrite", (s) => s.put(spot));
export const deleteSpot = (id: string) => tx("readwrite", (s) => s.delete(id));

export function useSpots() {
  const [spots, setSpots] = useState<Spot[] | null>(null);
  const reload = useCallback(() => {
    listSpots().then(setSpots, () => setSpots([]));
  }, []);
  useEffect(reload, [reload]);
  return { spots, reload };
}

/** An object URL for a photo blob, revoked when the component unmounts. */
export function usePhotoUrl(photo: Blob | undefined) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!photo) return;
    const u = URL.createObjectURL(photo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);
  return url;
}
