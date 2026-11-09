// Осмотр предмета в 3D: крутится пальцем/мышью, сам медленно поворачивается
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { WeaponModel } from '../../data/weapons';
import type { Finish } from '../../data/cases';
import { buildModel, makeStage, frame, THUMB_POSE, webglOk } from './render3d';
import { ItemArt } from '../components/ItemArt';

interface Props { model: WeaponModel; finish: Finish; phase?: string; float?: number; wearSeed?: string; color?: string; intro?: boolean }

export function Inspect3D(p: Props) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!webglOk || !box.current) return;
    const el = box.current;
    const canvas = document.createElement('canvas');
    el.prepend(canvas);
    const st = makeStage(canvas);
    const dpr = Math.min(2, devicePixelRatio || 1);
    let model: THREE.Group | null = null;
    let raf = 0, alive = true;
    let ry = THUMB_POSE.y, rx = THUMB_POSE.x, vy = 0, drag = false, lx = 0, ly = 0, idle = 0;
    const t0 = performance.now();
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      st.renderer.setPixelRatio(dpr);
      st.renderer.setSize(w, h, false);
      if (model) { const sz = model.userData.size as THREE.Vector3; frame(st.camera, new THREE.Vector3(sz.length() * 0.92, sz.y * 1.25, 0), w / h, 1.0); }
    };
    buildModel(p.model, p.finish, { phase: p.phase, float: p.float, wearSeed: p.wearSeed }).then((m) => {
      if (!alive) return;
      model = m; st.scene.add(m); resize();
      el.classList.add('ready');
    });
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!model) return;
      if (!drag) {
        idle += 1;
        ry += vy; vy *= 0.94;
        if (idle > 90) ry += 0.004; // медленный автоповорот
      }
      // Вступление: предмет влетает с разворотом
      const k = p.intro ? Math.min(1, (t - t0) / 900) : 1;
      const e = 1 - Math.pow(1 - k, 3);
      model.rotation.set(rx, ry + (1 - e) * Math.PI * 1.5, THUMB_POSE.z);
      model.scale.setScalar(0.4 + 0.6 * e);
      model.traverse((o) => { if (o instanceof THREE.Mesh) { const ut = (o.material as THREE.Material).userData?.uTime; if (ut) ut.value = t / 1000; } });
      st.renderer.render(st.scene, st.camera);
    };
    raf = requestAnimationFrame(loop);
    const down = (e: PointerEvent) => { drag = true; lx = e.clientX; ly = e.clientY; idle = 0; el.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      ry += dx * 0.012; vy = dx * 0.012; rx = Math.max(-0.8, Math.min(0.8, rx + dy * 0.008));
    };
    const up = () => { drag = false; idle = 0; };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    const ro = new ResizeObserver(resize); ro.observe(el);
    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      model?.traverse((o) => { if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose(); });
      st.renderer.dispose(); canvas.remove();
    };
  }, [p.model.id, p.finish.seed, p.phase, p.float, p.wearSeed]);
  if (!webglOk) return <ItemArt {...p} />;
  return <div ref={box} className="inspect" style={p.color ? { filter: `drop-shadow(0 6px 18px ${p.color}55)` } : undefined}><span className="hint">↔ покрути</span></div>;
}
