"use client";

// CORE (lead-owned). The spotted car in 3D: orbit it, tap the hood (or
// engine cover) to open it and see the engine idling inside.

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { CatalogCar } from "@/core/catalog";
import { ENGINE_LABELS } from "@/core/engines";
import { buildCar, type CarBuild } from "./buildCar";

interface Props {
  car: CatalogCar;
  paint: string;
  onExploreEngine: () => void;
}

const PANEL = { front: "hood", mid: "engine cover", rear: "engine lid" } as const;

export default function CarViewer({ car, paint, onExploreEngine }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [build, setBuild] = useState<CarBuild | null>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  openRef.current = open;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const car3d = buildCar(car, paint);
    setBuild(car3d);
    setOpen(false);

    const w = () => mount.clientWidth || 400;
    const h = () => mount.clientHeight || 400;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w(), h());
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(3, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
    scene.add(key);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.ShadowMaterial({ opacity: 0.55 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor, car3d.root);

    const camera = new THREE.PerspectiveCamera(32, w() / h(), 0.05, 100);
    const home = new THREE.Vector3(0, 0.55, 0);
    const dir = new THREE.Vector3(-0.9, 0.42, 1).normalize();
    const fit = () => 8.2 * Math.max(1, 1.25 / camera.aspect);
    camera.position.copy(home).addScaledVector(dir, fit());
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(home);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 2.2;
    controls.maxDistance = 14;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.addEventListener("start", () => (controls.autoRotate = false));

    // Tap the panel or the bay to open and close it.
    const dom = renderer.domElement;
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      down = null;
      const r = dom.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = ray.intersectObject(car3d.root, true)[0];
      if (!hit) return;
      let o: THREE.Object3D | null = hit.object;
      let onPanel = false;
      while (o) {
        if (o === car3d.lid || o === car3d.engine.root) onPanel = true;
        o = o.parent;
      }
      const nearBay = hit.point.distanceTo(car3d.bayCenter) < 1.1;
      if (onPanel || nearBay) {
        controls.autoRotate = false;
        setOpen((v) => !v);
      }
    };
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointerup", onUp);

    const resize = new ResizeObserver(() => {
      camera.aspect = w() / h();
      camera.updateProjectionMatrix();
      renderer.setSize(w(), h());
    });
    resize.observe(mount);

    let raf = 0;
    let last = performance.now();
    let angle = 0;
    let theta = 0;
    const focus = new THREE.Vector3();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const isOpen = openRef.current;
      angle += ((isOpen ? car3d.openAngle : 0) - angle) * Math.min(1, dt * 5);
      car3d.lid.rotation.z = angle;
      const k = Math.abs(angle / car3d.openAngle);
      if (k > 0.05) {
        theta += dt * 9; // a slow idle
        car3d.engine.setCrankAngle(theta);
      }
      // Ease the view toward the bay while the panel is open.
      focus.copy(home).lerp(car3d.bayCenter, k * 0.45);
      controls.target.lerp(focus, Math.min(1, dt * 4));
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointerup", onUp);
      controls.dispose();
      car3d.dispose();
      env.dispose();
      pmrem.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      mount.replaceChildren();
    };
  }, [car, paint]);

  const panel = build ? PANEL[build.bay] : "hood";
  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full touch-none select-none" />
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        {open ? (
          <button
            type="button"
            onClick={onExploreEngine}
            className="pointer-events-auto h-11 rounded-full bg-white px-5 text-[14px] font-semibold text-black active:scale-[0.98]"
          >
            Explore the {ENGINE_LABELS[car.engine]}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto h-9 rounded-full bg-raised px-4 text-[14px] text-ink active:scale-[0.98]"
          >
            Tap the {panel} to open it
          </button>
        )}
      </div>
    </div>
  );
}
