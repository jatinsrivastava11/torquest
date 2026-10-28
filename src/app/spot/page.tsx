"use client";

import { useEffect, useRef, useState } from "react";

// Camera viewfinder. Recognition, blurring and scoring arrive in milestone 4.
export default function SpotPage() {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"idle" | "live" | "denied" | "unsupported">("idle");

  useEffect(() => {
    const v = video.current;
    return () => {
      (v?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return setState("unsupported");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
        audio: false,
      });
      if (video.current) {
        video.current.srcObject = stream;
        await video.current.play();
      }
      setState("live");
    } catch {
      setState("denied");
    }
  };

  return (
    <main className="fixed inset-0 z-30 flex flex-col bg-black">
      <video ref={video} playsInline muted className={`h-full w-full object-cover ${state === "live" ? "" : "hidden"}`} />

      {state !== "live" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <h1 className="font-display text-3xl font-bold uppercase">Spot a car</h1>
          <p className="text-sm text-muted">
            {state === "denied"
              ? "Camera access was blocked. Allow it in your browser settings to spot cars."
              : state === "unsupported"
                ? "This browser can't open the camera."
                : "Point at a car, parked or passing. Number plates and faces are blurred on your phone before anything is saved."}
          </p>
          {state === "idle" && (
            <button type="button" onClick={start} className="rounded-xl bg-accent px-6 py-3 font-display text-lg font-bold uppercase text-accent-ink">
              Open camera
            </button>
          )}
        </div>
      )}

      {state === "live" && (
        <>
          <div className="pointer-events-none absolute inset-x-8 top-1/2 aspect-[16/9] -translate-y-1/2 rounded-3xl border-2 border-white/60 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]" />
          <p className="absolute inset-x-0 top-[calc(1.5rem+env(safe-area-inset-top))] text-center text-sm text-white/80">Fit the car in the frame</p>
          <div className="absolute inset-x-0 bottom-[calc(7rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-2">
            <button type="button" disabled aria-label="Take photo" className="h-20 w-20 rounded-full border-4 border-white bg-white/25 opacity-60" />
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">Recognition arrives in milestone 4</span>
          </div>
        </>
      )}
    </main>
  );
}
