'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
// ENGINES MODULE (teammate-owned). Ported from Pavement.

import type { EngineType } from '@/core/engines';
import { ENGINE_LABELS, ENGINE_TYPES } from '@/core/engines';
import {
  getEngineBlueprint,
  type EngineMaterialKind,
  type EnginePartSpec,
} from './blueprint';
import type { EngineViewerProps } from './contract';

type Theme = 'asphalt' | 'paper';

function createPartMaterial(
  kind: EngineMaterialKind,
  isSelected: boolean,
  hasSelection: boolean
): THREE.MeshPhysicalMaterial {
  const baseConfigs: Record<
    EngineMaterialKind,
    { color: number; metalness: number; roughness: number; clearcoat?: number }
  > = {
    block: { color: 0x868c96, metalness: 0.82, roughness: 0.36 },
    head: { color: 0xc8372d, metalness: 0.42, roughness: 0.28, clearcoat: 0.7 },
    piston: { color: 0xe6ebf2, metalness: 0.92, roughness: 0.14 },
    crank: { color: 0x3b4048, metalness: 0.88, roughness: 0.25 },
    exhaust: { color: 0xb57c4a, metalness: 0.85, roughness: 0.32 },
    copper: { color: 0xd87a38, metalness: 0.9, roughness: 0.2 },
    accent: { color: 0xe09f3e, metalness: 0.75, roughness: 0.25 },
  };

  const cfg = baseConfigs[kind] ?? baseConfigs.block;
  const mat = new THREE.MeshPhysicalMaterial({
    color: cfg.color,
    metalness: cfg.metalness,
    roughness: cfg.roughness,
    clearcoat: cfg.clearcoat ?? 0.15,
    clearcoatRoughness: 0.2,
    transparent: hasSelection && !isSelected,
    opacity: hasSelection && !isSelected ? 0.48 : 1.0,
  });

  if (isSelected) {
    mat.emissive = new THREE.Color(0xff7a1a);
    mat.emissiveIntensity = 0.42;
  }
  return mat;
}

export default function EngineViewer3D({
  engineType,
  allowLayoutSwitch = true,
  onPartSelect,
}: EngineViewerProps) {
  const theme: Theme = 'asphalt';
  const [activeType, setActiveType] = useState<EngineType>(engineType);
  useEffect(() => {
    setActiveType(engineType);
  }, [engineType]);

  const blueprint = useMemo(() => getEngineBlueprint(activeType), [activeType]);

  // Continuous explode progress 0..100%
  const [explodePct, setExplodePct] = useState<number>(65);
  const [targetExplodePct, setTargetExplodePct] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [rpm, setRpm] = useState<number>(2200);
  const [selectedPartName, setSelectedPartName] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const partMeshesRef = useRef<
    Map<string, { mesh: THREE.Mesh; spec: EnginePartSpec }>
  >(new Map());
  const explodeRef = useRef<number>(explodePct / 100);
  const runningRef = useRef<boolean>(isRunning);
  const rpmRef = useRef<number>(rpm);

  useEffect(() => {
    explodeRef.current = explodePct / 100;
  }, [explodePct]);

  useEffect(() => {
    runningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    rpmRef.current = rpm;
  }, [rpm]);

  // Smooth spring animation when user clicks "Explode" / "Put back together"
  useEffect(() => {
    if (targetExplodePct === null) return;
    let raf = 0;
    const step = () => {
      setExplodePct((prev) => {
        const diff = targetExplodePct - prev;
        if (Math.abs(diff) < 0.8) {
          setTargetExplodePct(null);
          return targetExplodePct;
        }
        return Math.round((prev + diff * 0.16) * 10) / 10;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [targetExplodePct]);

  // Distinct part groups by name (e.g. "Piston 1".."Piston 8" plus block, heads, etc.)
  const selectedPartSpec = useMemo(
    () => blueprint.parts.find((p) => p.name === selectedPartName) ?? null,
    [blueprint, selectedPartName]
  );

  useEffect(() => {
    onPartSelect?.(selectedPartSpec?.id ?? null);
  }, [selectedPartSpec, onPartSelect]);

  // Build & animate Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 560;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(
      theme === 'asphalt' ? 0x111215 : 0xf2efe9
    );

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Studio three-point lighting + subtle rim light
    const keyLight = new THREE.DirectionalLight(0xfff8ed, 2.5);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9ab8ff, 1.25);
    fillLight.position.set(-6, 3, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffa45b, 1.1);
    rimLight.position.set(0, -6, -6);
    scene.add(rimLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);

    // Subtle reference floor grid
    const grid = new THREE.GridHelper(
      8,
      16,
      theme === 'asphalt' ? 0x2c303a : 0xd0cbc0,
      theme === 'asphalt' ? 0x1c1e24 : 0xe3dfd6
    );
    grid.position.y = -2.25;
    scene.add(grid);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Populate parts
    const meshMap = new Map<string, { mesh: THREE.Mesh; spec: EnginePartSpec }>();
    partMeshesRef.current = meshMap;

    for (const part of blueprint.parts) {
      let geometry: THREE.BufferGeometry;
      if (part.shape === 'cylinder') {
        const radius = part.size[0] / 2;
        const length = part.size[1];
        geometry = new THREE.CylinderGeometry(radius, radius, length, 28, 1);
        if (part.axis === 'x') {
          geometry.rotateZ(Math.PI / 2);
        } else if (part.axis === 'z') {
          geometry.rotateX(Math.PI / 2);
        }
      } else {
        geometry = new THREE.BoxGeometry(
          part.size[0],
          part.size[1],
          part.size[2]
        );
      }

      const material = createPartMaterial(part.material, false, false);
      const mesh = new THREE.Mesh(geometry, material);
      if (part.bankTiltZRad) {
        mesh.rotation.z = part.bankTiltZRad;
      }

      // Add subtle edge wireframe for crisp mechanical silhouette
      const edges = new THREE.EdgesGeometry(geometry, 28);
      const lineMat = new THREE.LineBasicMaterial({
        color: theme === 'asphalt' ? 0x181a20 : 0x4a4742,
        transparent: true,
        opacity: 0.35,
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      mesh.add(wireframe);

      mesh.userData = { partName: part.name, partId: part.id };
      rootGroup.add(mesh);
      meshMap.set(part.id, { mesh, spec: part });
    }

    // Orbit camera state
    let yaw = 0.62;
    let pitch = 0.36;
    let distance = 6.2;
    let isDragging = false;
    let dragMoved = false;
    let startX = 0;
    let startY = 0;

    const updateCamera = () => {
      camera.position.x = distance * Math.sin(yaw) * Math.cos(pitch);
      camera.position.y = distance * Math.sin(pitch);
      camera.position.z = distance * Math.cos(yaw) * Math.cos(pitch);
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    const dom = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      dom.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) {
        dragMoved = true;
      }
      startX = e.clientX;
      startY = e.clientY;
      yaw -= dx * 0.0085;
      pitch = Math.max(-1.1, Math.min(1.2, pitch + dy * 0.0085));
      updateCamera();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      dom.releasePointerCapture(e.pointerId);
      if (!dragMoved) {
        const rect = dom.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const meshes = Array.from(meshMap.values()).map((m) => m.mesh);
        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length > 0) {
          const hitName = hits[0].object.userData?.partName as string | undefined;
          if (hitName) {
            setSelectedPartName((prev) => (prev === hitName ? null : hitName));
          }
        } else {
          setSelectedPartName(null);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      distance = Math.max(3.0, Math.min(11.5, distance + e.deltaY * 0.004));
      updateCamera();
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 560;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation loop: interpolate rest <-> exploded + running engine kinematics
    let rafId = 0;
    let crankAngle = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const t = explodeRef.current;
      if (runningRef.current) {
        // Scale angular speed so user can clearly see piston strokes and crank rotation
        const omega = (rpmRef.current / 600) * 4.2;
        crankAngle += dt * omega;
      }

      meshMap.forEach(({ mesh, spec }) => {
        const bx = spec.rest[0] + (spec.exploded[0] - spec.rest[0]) * t;
        const by = spec.rest[1] + (spec.exploded[1] - spec.rest[1]) * t;
        const bz = spec.rest[2] + (spec.exploded[2] - spec.rest[2]) * t;

        let ox = 0;
        let oy = 0;
        let oz = 0;

        if (spec.motion) {
          if (spec.motion.kind === 'reciprocate' && spec.motion.dir) {
            const stroke =
              Math.sin(crankAngle + (spec.motion.phase ?? 0)) *
              (spec.motion.amplitude ?? 0.15);
            ox = spec.motion.dir[0] * stroke;
            oy = spec.motion.dir[1] * stroke;
            oz = spec.motion.dir[2] * stroke;
          } else if (spec.motion.kind === 'spin') {
            mesh.rotation.z = crankAngle;
          } else if (spec.motion.kind === 'orbit') {
            const phase = spec.motion.phase ?? 0;
            const amp = spec.motion.amplitude ?? 0.08;
            ox = Math.cos(crankAngle + phase) * amp;
            oy = Math.sin(crankAngle + phase) * amp;
            mesh.rotation.z = -crankAngle / 3;
          }
        }

        mesh.position.set(bx + ox, by + oy, bz + oz);
      });

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [blueprint, theme]);

  // Update highlight materials whenever selectedPartName changes
  useEffect(() => {
    const hasSelection = Boolean(selectedPartName);
    partMeshesRef.current.forEach(({ mesh, spec }) => {
      const isSelected = spec.name === selectedPartName;
      const oldMat = mesh.material as THREE.Material;
      mesh.material = createPartMaterial(
        spec.material,
        isSelected,
        hasSelection
      );
      oldMat.dispose();
    });
  }, [selectedPartName]);

  const isExploded = explodePct >= 50;

  return (
    <div className="flex flex-col gap-3">
      {/* Header & Optional Engine Layout Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {blueprint.label}
            </span>
            <span className="text-xs opacity-70">
              {blueprint.parts.length} interactive 3D parts
            </span>
          </div>
          <p className="text-xs opacity-75 mt-0.5">{blueprint.subtitle}</p>
        </div>

        {allowLayoutSwitch && (
          <div className="flex items-center gap-1.5">
            <label className="text-xs opacity-65">Compare layout:</label>
            <select
              value={activeType}
              onChange={(e) => {
                setActiveType(e.target.value as EngineType);
                setSelectedPartName(null);
              }}
              className="text-xs rounded-lg px-2.5 py-1.5 bg-zinc-900/80 text-zinc-100 border border-zinc-700/70 focus:outline-none focus:border-amber-400"
            >
              {ENGINE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ENGINE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3D Viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-zinc-800/80 shadow-inner">
        <div
          ref={containerRef}
          className="w-full h-[350px] sm:h-[390px] cursor-grab active:cursor-grabbing select-none"
        />

        {/* Top-left HUD badge */}
        <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-zinc-200">
          <span className="font-medium">
            Drag to orbit · Scroll/pinch to zoom · Tap any part
          </span>
          <span className="text-zinc-400">
            Explosion: {Math.round(explodePct)}% ·{' '}
            {isRunning ? `Running (${rpm} RPM)` : 'Paused'}
          </span>
        </div>

        {/* Bottom-right Quick Action Pill */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRunning((r) => !r)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              isRunning
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-900/85 text-zinc-300 border-zinc-700'
            }`}
          >
            {isRunning ? '● Engine Running' : '▶ Start Engine'}
          </button>
          <button
            type="button"
            onClick={() => setTargetExplodePct(isExploded ? 0 : 100)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition shadow"
          >
            {isExploded ? 'Put back together' : 'Explode engine'}
          </button>
        </div>
      </div>

      {/* Explode & RPM Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-900/45 border border-zinc-800/70">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium">Exploded View Separation</span>
            <span className="font-mono opacity-75">
              {Math.round(explodePct)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={explodePct}
            onChange={(e) => {
              setTargetExplodePct(null);
              setExplodePct(Number(e.target.value));
            }}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium">Engine Speed (Kinematics)</span>
            <span className="font-mono opacity-75">{rpm} RPM</span>
          </div>
          <input
            type="range"
            min={600}
            max={7000}
            step={100}
            value={rpm}
            disabled={!isRunning}
            onChange={(e) => setRpm(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer disabled:opacity-40"
          />
        </div>
      </div>

      {/* Selected Part Explanation Card */}
      {selectedPartSpec ? (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-400">
                {selectedPartSpec.name}
              </span>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {selectedPartSpec.material}
              </span>
            </div>
            <p className="text-xs leading-relaxed mt-1 opacity-90">
              {selectedPartSpec.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPartName(null)}
            className="text-xs px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 shrink-0"
          >
            Clear
          </button>
        </div>
      ) : (
        <p className="text-xs opacity-65 px-1">
          Tap any part in the 3D engine or pick a part chip below to highlight
          it and read what it does.
        </p>
      )}

      {/* Accessible Part Chips */}
      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
        {blueprint.parts.map((part) => {
          const active = selectedPartName === part.name;
          return (
            <button
              key={part.id}
              type="button"
              onClick={() =>
                setSelectedPartName((prev) =>
                  prev === part.name ? null : part.name
                )
              }
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition border ${
                active
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 font-semibold'
                  : 'bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-300 border-zinc-800'
              }`}
            >
              {part.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
