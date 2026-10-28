// Update 0.0.18 — a boss's glow (was demonView.ts's; the Dragon glows the same way): a hit's white flash, a warning
// in its move's colour, a stunned pulse, its rage's embers; killed, a white flicker quickening as it sinks.
import type * as THREE from 'three';
import type { Enemy } from '../../sim/enemies/enemy';
import { doomTime } from '../../sim/enemies/kinds';
import { BOSS } from '../../tuning/boss';

/** `windup`: the warning's length (s); `glow`: its colour; `time`: the view's clock (the rage's pulse). */
export function tintBoss(e: Enemy, mats: readonly THREE.MeshStandardMaterial[], windup: number, glow: readonly [number, number, number], time: number) {
  const v = BOSS.v;
  let r = e.flash / 0.12;
  let g = r;
  let b = r;
  if (e.phase === 'windup') {
    const k = Math.min(1, e.t / windup);
    r += k * glow[0] * 1.2;
    g += k * glow[1] * 1.2;
    b += k * glow[2] * 1.2;
  } else if (e.phase === 'stun') {
    const k = 0.25 + 0.25 * Math.sin(e.t * 14);
    r += k;
    g += k * 0.8;
  } else if (e.phase === 'dead') {
    const k = Math.max(0, (e.t - v.doomRise) / (doomTime() - v.doomRise));
    const rate = 5 + 20 * k * k;
    const on = Math.sin(e.t * rate * Math.PI * 2) > 0 ? 1.6 + k : 0.15;
    r = g = b = e.t < v.doomRise ? 1.2 : on;
  }
  if (e.stage > 0 && e.phase !== 'dead') r += 0.22 + 0.08 * Math.sin(time * 6);
  for (const m of mats) m.emissive.setRGB(r, g, b);
}
