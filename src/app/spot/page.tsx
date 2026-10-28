"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import SpotCard from "@/components/SpotCard";
import TierBadge from "@/components/TierBadge";
import { carYears, type CatalogCar } from "@/core/catalog";
import { scoreSpot, type SpotScore } from "@/core/tiers";
import { searchText, useCatalog } from "@/features/catalog/useCatalog";
import { fileToJpeg, paintColour, toJpeg } from "@/features/spots/photo";
import { listSpots, saveSpot, usePhotoUrl } from "@/features/spots/store";

type Step = { kind: "camera" } | { kind: "pick"; photo: Blob; paint: string } | { kind: "confirm"; photo: Blob; paint: string; car: CatalogCar; score: SpotScore };

export default function SpotPage() {
  return (
    <Suspense>
      <Spot />
    </Suspense>
  );
}

function Spot() {
  const [step, setStep] = useState<Step>({ kind: "camera" });
  const fromPhotos = useSearchParams().get("from") === "photos";

  const usePhoto = async (photo: Blob) => setStep({ kind: "pick", photo, paint: await paintColour(photo) });

  if (step.kind === "camera") return <Camera onPhoto={usePhoto} startWithPicker={fromPhotos} />;
  if (step.kind === "pick")
    return (
      <Picker
        photo={step.photo}
        onBack={() => setStep({ kind: "camera" })}
        onPick={async (car) => {
          const earlier = (await listSpots()).filter((s) => s.carId === car.id).length;
          const score = scoreSpot({
            tier: car.tier,
            hype: car.hype,
            yourEarlierSpots: earlier,
            torquestEarlierSpots: 1, // unknown until accounts exist: no first-on-Torquest bonus yet
            firstYear: car.years[0],
            spottedYear: new Date().getFullYear(),
          });
          setStep({ ...step, kind: "confirm", car, score });
        }}
      />
    );
  return <Confirm {...step} onBack={() => setStep({ kind: "pick", photo: step.photo, paint: step.paint })} />;
}

// ------------------------------------------------------------------ camera

function Camera({ onPhoto, startWithPicker }: { onPhoto: (b: Blob) => void; startWithPicker: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"starting" | "live" | "blocked" | "none">(startWithPicker ? "none" : "starting");

  useEffect(() => {
    if (startWithPicker) return;
    let stream: MediaStream | null = null;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setState("none");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }
        setState("live");
      } catch {
        setState("blocked");
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [startWithPicker]);

  const shoot = async () => {
    const v = video.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    onPhoto(await toJpeg(canvas));
  };

  return (
    <main className="fixed inset-0 z-50 flex flex-col bg-black">
      <video ref={video} playsInline muted className={`absolute inset-0 h-full w-full object-cover ${state === "live" ? "" : "invisible"}`} />
      <div className="relative flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link href="/" className="flex h-9 items-center rounded-full bg-black/60 px-4 text-[14px] font-medium">
          Close
        </Link>
      </div>

      {state !== "live" && (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <h1 className="text-[20px] font-semibold">Spot a car</h1>
          <p className="max-w-[34ch] text-[14px] text-muted">
            {state === "blocked"
              ? "Camera access is blocked. Allow it in your browser's settings, or use a photo you took."
              : state === "starting"
                ? "Opening the camera…"
                : "Choose a photo of a car you saw."}
          </p>
        </div>
      )}

      <div className="relative mt-auto flex items-center justify-between px-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <button type="button" onClick={() => file.current?.click()} className="flex h-11 items-center rounded-full bg-black/60 px-4 text-[14px] font-medium">
          Photos
        </button>
        <button
          type="button"
          onClick={shoot}
          disabled={state !== "live"}
          aria-label="Take the photo"
          className="h-[76px] w-[76px] rounded-full border-4 border-white bg-white/90 active:scale-95 disabled:opacity-30"
        />
        <span className="w-[74px]" />
      </div>
      <input
        ref={file}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onPhoto(await fileToJpeg(f));
        }}
      />
    </main>
  );
}

// ------------------------------------------------------------------ picker

function Picker({ photo, onBack, onPick }: { photo: Blob; onBack: () => void; onPick: (c: CatalogCar) => void }) {
  const url = usePhotoUrl(photo);
  const { cars } = useCatalog();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!cars || !words.length) return [];
    return cars.filter((c) => words.every((w) => searchText(c).includes(w))).slice(0, 40);
  }, [cars, q]);

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
      <button type="button" onClick={onBack} className="text-[14px] text-muted">
        ← Retake
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="Your photo" className="mt-3 aspect-[4/3] w-full rounded-[20px] object-cover" />}
      <h1 className="mt-5 text-[20px] font-semibold">Which car is it?</h1>
      <p className="mt-0.5 text-[14px] text-muted">Search by make, model or generation. Automatic suggestions are coming.</p>
      <input
        autoFocus
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. 911 GT3, Civic Type R, F-150"
        aria-label="Search the catalog"
        className="mt-3 h-11 w-full rounded-full bg-surface px-4 text-[16px] placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-control"
      />
      <ul className="mt-3">
        {results.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onPick(c)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left active:bg-surface">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-medium">
                  {c.make} {c.model}
                  {c.variant ? ` ${c.variant}` : ""}
                </span>
                <span className="block truncate text-[13px] text-muted">
                  {c.generation !== c.model ? `${c.generation} · ` : ""}
                  {carYears(c)}
                </span>
              </span>
              <TierBadge tier={c.tier} />
            </button>
          </li>
        ))}
      </ul>
      {q && cars && results.length === 0 && (
        <p className="mt-4 text-[14px] text-muted">
          No match. The catalog has {cars.length} cars so far (Porsche, Ferrari, Ford and Honda); more makes are being added.
        </p>
      )}
    </main>
  );
}

// ----------------------------------------------------------------- confirm

function Confirm({ photo, paint, car, score, onBack }: { photo: Blob; paint: string; car: CatalogCar; score: SpotScore; onBack: () => void }) {
  const url = usePhotoUrl(photo);
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const id = crypto.randomUUID();
    await saveSpot({ id, carId: car.id, takenAt: new Date().toISOString(), points: score.total, lines: score.lines, paint, photo });
    router.push(`/card/?id=${id}`);
  };

  return (
    <main className="mx-auto max-w-[480px] px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
      <button type="button" onClick={onBack} className="text-[14px] text-muted">
        ← Choose another car
      </button>
      <div className="mt-3">
        <SpotCard car={car} points={score.total} photoUrl={url} paint={paint} />
      </div>
      <h1 className="mt-5 text-[20px] font-semibold">+{score.total.toLocaleString()} points</h1>
      <dl className="mt-2 rounded-[20px] bg-surface px-4 py-2">
        {score.lines.map((l) => (
          <div key={l.label} className="flex justify-between py-1.5 text-[14px]">
            <dt className="text-muted">{l.label}</dt>
            <dd className="num">+{l.points.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 h-12 w-full rounded-full bg-white text-[16px] font-semibold text-black active:scale-[0.99] disabled:opacity-50"
      >
        {saving ? "Saving…" : "Add to my garage"}
      </button>
    </main>
  );
}
