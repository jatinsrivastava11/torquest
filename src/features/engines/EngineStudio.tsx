"use client";

// ENGINES MODULE (teammate-owned).
// The interactive engine viewer: orbit, pinch-zoom, explode, run the engine,
// tap a part (or its label) to read what it does.

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { ENGINE_LABELS, ENGINE_TYPES, type EngineType } from "@/core/engines";
import type { EngineViewerProps } from "./contract";
import { applyExplode, type EngineModel } from "./model";
import { buildEngineModel } from "./registry";

// Visual crank speed: real RPM would be a blur, so slow it down 20x.
const SLOWDOWN = 20;

export default function EngineStudio({ engineType, allowLayoutSwitch = true, onPartSelect }: EngineViewerProps) {
  const [type, setType] = useState<EngineType>(engineType);
  useEffect(() => setType(engineType), [engineType]);

  const [model, setModel] = useState<EngineModel | null>(null);
  const [explode, setExplode] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [running, setRunning] = useState(true);
  const [rpm, setRpm] = useState(1500);
  const [labels, setLabels] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const live = useRef({ explode: 0, running: true, rpm: 1500, labels: true, selected: null as string | null });
  live.current = { explode: explode / 100, running, rpm, labels, selected };
  const selectRef = useRef<(id: string | null) => void>(() => {});
  selectRef.current = (id) => setSelected((prev) => (prev === id ? null : id));

  useEffect(() => onPartSelect?.(selected), [selected, onPartSelect]);

  // Animate the explode slider towards a button's target.
  useEffect(() => {
    if (target === null) return;
    let raf = 0;
    const step = () => {
      setExplode((prev) => {
        const next = prev + (target - prev) * 0.08;
        if (Math.abs(target - next) < 0.5) {
          setTarget(null);
          return target;
        }
        raf = requestAnimationFrame(step);
        return next;
      });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  // Scene setup, once per engine type.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const engine = buildEngineModel(type);
    setModel(engine);
    setSelected(null);

    const width = () => mount.clientWidth || 600;
    const height = () => mount.clientHeight || 420;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width(), height());
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width(), height());
    Object.assign(labelRenderer.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    mount.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x15171b);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.85;

    const key = new THREE.DirectionalLight(0xfff4e6, 2.2);
    key.position.set(6, 14, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
    scene.add(key, new THREE.HemisphereLight(0xcfd8ff, 0x1a1410, 0.5));
    const rim = new THREE.DirectionalLight(0x9db8ff, 1.2);
    rim.position.set(-8, 5, -10);
    scene.add(rim);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.35 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = engine.center.y - engine.radius * 0.62;
    floor.receiveShadow = true;
    scene.add(floor, engine.root);

    const camera = new THREE.PerspectiveCamera(35, width() / height(), 0.1, 200);
    // Front three-quarter view, raised, so the two banks fan out left and right.
    const dir = new THREE.Vector3(0.6, 0.55, 1).normalize();
    camera.position.copy(engine.center).addScaledVector(dir, engine.radius * 2.1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(engine.center);
    controls.enableDamping = true;
    controls.minDistance = engine.radius * 0.5;
    controls.maxDistance = engine.radius * 4;
    controls.update();

    // Tag every mesh with its part so taps can find it.
    const partOf = new Map<THREE.Object3D, string>();
    for (const part of engine.parts) {
      for (const p of part.pieces) p.object.traverse((o) => partOf.set(o, part.id));
    }

    // Floating labels.
    const labelObjs = engine.parts.map((part) => {
      const el = document.createElement("button");
      el.type = "button";
      el.textContent = part.name;
      el.className =
        "pointer-events-auto whitespace-nowrap rounded-full border border-white/15 bg-black/65 px-2 py-0.5 text-[11px] font-medium text-zinc-100 backdrop-blur hover:border-amber-400";
      el.addEventListener("pointerdown", (e) => e.stopPropagation());
      el.addEventListener("click", () => selectRef.current(part.id));
      const obj = new CSS2DObject(el);
      scene.add(obj);
      return { part, obj, el };
    });

    // Highlight: the selected part keeps its look, the rest turn to glass.
    const ghosts = new Map<THREE.Material, THREE.Material>();
    const original = new Map<THREE.Mesh, THREE.Material>();
    engine.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) original.set(m, m.material as THREE.Material);
    });
    const ghostOf = (m: THREE.Material) => {
      let g = ghosts.get(m);
      if (!g) {
        g = m.clone();
        Object.assign(g, { transparent: true, opacity: 0.12, depthWrite: false });
        ghosts.set(m, g);
      }
      return g;
    };
    let shownSelection: string | null = null;
    const applySelection = (id: string | null) => {
      shownSelection = id;
      original.forEach((mat, m) => {
        const mine = partOf.get(m) === id;
        m.material = id && !mine ? ghostOf(mat) : mat;
        m.castShadow = !id || mine;
      });
    };

    // Tap (not drag) to select.
    const dom = renderer.domElement;
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      down = null;
      const rect = dom.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObject(engine.root, true).filter((h) => {
        const mat = (h.object as THREE.Mesh).material as THREE.Material;
        return !mat.transparent || partOf.get(h.object) === live.current.selected;
      });
      const id = hits.length ? partOf.get(hits[0].object) ?? null : null;
      if (id) selectRef.current(id);
      else setSelected(null);
    };
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointerup", onUp);

    const resize = new ResizeObserver(() => {
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
      renderer.setSize(width(), height());
      labelRenderer.setSize(width(), height());
    });
    resize.observe(mount);

    let theta = 0;
    let last = performance.now();
    let raf = 0;
    const box = new THREE.Box3();
    const ndc = new THREE.Vector3();
    // Pull the camera back as the engine explodes, keeping the user's zoom.
    // On tall, narrow screens (phones) back off further so the width fits.
    const framing = (t: number) => (1 + 0.45 * t) * Math.max(1, 1.3 / camera.aspect);
    let framed = 1; // the camera starts at framing 1; the first frame corrects it
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = live.current;
      if (s.running) theta += ((s.rpm / 60) * Math.PI * 2 * dt) / SLOWDOWN;
      engine.setCrankAngle(theta);
      applyExplode(engine, s.explode);
      if (s.selected !== shownSelection) applySelection(s.selected);

      const want = framing(s.explode);
      if (want !== framed) {
        camera.position.sub(controls.target).multiplyScalar(want / framed).add(controls.target);
        framed = want;
      }
      controls.update();
      camera.updateMatrixWorld();

      // Place labels, nearest first, skipping any that would overlap.
      engine.root.updateMatrixWorld(true);
      const w = width();
      const h = height();
      const placed: { x: number; y: number; w: number; h: number }[] = [];
      const shown = labelObjs
        .filter(({ part, obj, el }) => {
          const show = s.selected ? s.selected === part.id : s.labels && s.explode > 0.25;
          obj.visible = show;
          if (!show) return false;
          // Anchor on one piece: a part spread over both banks has its
          // centre in empty space between them.
          box.makeEmpty().expandByObject(part.pieces[part.pieces.length - 1].object);
          box.getCenter(obj.position);
          obj.position.y = Math.max(obj.position.y, box.max.y - 0.2);
          el.style.borderColor = s.selected === part.id ? "#fbbf24" : "";
          return true;
        })
        .map((l) => ({ ...l, depth: l.obj.position.distanceTo(camera.position) }))
        .sort((a, b) => a.depth - b.depth);
      for (const { obj, el } of shown) {
        ndc.copy(obj.position).project(camera);
        const lw = el.offsetWidth || el.textContent!.length * 6.5 + 18;
        const lh = el.offsetHeight || 20;
        const r = { x: ((ndc.x + 1) / 2) * w - lw / 2, y: ((1 - ndc.y) / 2) * h - lh / 2, w: lw, h: lh };
        const clash = placed.some((p) => r.x < p.x + p.w + 4 && p.x < r.x + r.w + 4 && r.y < p.y + p.h + 3 && p.y < r.y + r.h + 3);
        if (clash) obj.visible = false;
        else placed.push(r);
      }

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointerup", onUp);
      controls.dispose();
      labelObjs.forEach(({ obj }) => obj.element.remove());
      ghosts.forEach((g) => g.dispose());
      engine.dispose();
      envTexture.dispose();
      pmrem.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      mount.replaceChildren();
    };
  }, [type]);

  const selectedPart = useMemo(() => model?.parts.find((p) => p.id === selected) ?? null, [model, selected]);
  const exploded = explode >= 50;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-lg font-semibold">{model?.label ?? ENGINE_LABELS[type]}</div>
          <div className="text-xs opacity-70">{model?.subtitle}</div>
        </div>
        {allowLayoutSwitch && (
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EngineType)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100"
          >
            {ENGINE_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENGINE_LABELS[t]}
                {t === "v8" ? "" : " (simple)"}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-zinc-800">
        <div ref={mountRef} className="relative h-[62vh] max-h-[560px] min-h-[340px] w-full touch-none select-none" />
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/55 px-2.5 py-1 text-[11px] text-zinc-300 backdrop-blur">
          Drag to orbit · pinch or scroll to zoom · tap a part
        </div>
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            type="button"
            onClick={() => setLabels((v) => !v)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${labels ? "border-sky-400/50 bg-sky-500/20 text-sky-200" : "border-zinc-700 bg-zinc-900/85 text-zinc-300"}`}
          >
            Labels
          </button>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${running ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200" : "border-zinc-700 bg-zinc-900/85 text-zinc-300"}`}
          >
            {running ? "Running" : "Start"}
          </button>
          <button
            type="button"
            onClick={() => setTarget(exploded ? 0 : 100)}
            className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 shadow"
          >
            {exploded ? "Assemble" : "Explode"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="flex justify-between">
            <span>Explode</span>
            <span className="font-mono opacity-70">{Math.round(explode)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={explode}
            onChange={(e) => {
              setTarget(null);
              setExplode(Number(e.target.value));
            }}
            className="accent-amber-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="flex justify-between">
            <span>Engine speed</span>
            <span className="font-mono opacity-70">{rpm} rpm</span>
          </span>
          <input
            type="range"
            min={600}
            max={7000}
            step={100}
            value={rpm}
            onChange={(e) => setRpm(Number(e.target.value))}
            className="accent-emerald-400"
          />
        </label>
      </div>

      {selectedPart ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
          <div>
            <div className="text-sm font-bold text-amber-400">{selectedPart.name}</div>
            <p className="mt-1 text-sm leading-relaxed opacity-90">{selectedPart.description}</p>
          </div>
          <button type="button" onClick={() => setSelected(null)} className="shrink-0 rounded bg-zinc-800 px-2 py-1 text-xs">
            Close
          </button>
        </div>
      ) : (
        <p className="px-1 text-xs opacity-60">Tap any part, label or chip to see what it does.</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {model?.parts.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectRef.current(p.id)}
            className={`rounded-full border px-2.5 py-1 text-xs ${selected === p.id ? "border-amber-400 bg-amber-500 font-semibold text-zinc-950" : "border-zinc-800 bg-zinc-900/60 text-zinc-300"}`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
