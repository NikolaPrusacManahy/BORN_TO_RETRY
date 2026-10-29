// Update 0.1.12 — the enemy you can execute shows it (the designer: "a proper UI that shows that the player can execute
// an enemy"): a crimson skull over its head, drawn on top of everything at one size on screen so it reads through a
// crowd and through effects. It snaps in on a new target, beats like a heart while it's there, and fades when there's
// none. It follows the body as drawn (between sim ticks). The body's own crimson pulse stays (enemiesView.ts). No text:
// the designer's rule. Nothing made per frame.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { ENEMY_STATS } from '../sim/enemies/kinds';

/** The skull (a 64 × 64 box): the head and jaw, the eyes, the nose, the gaps between the teeth. */
const SKULL = 'M32 7C18 7 10 17 10 29c0 8 4 13 9 16v7c0 3 2 5 5 5h16c3 0 5-2 5-5v-7c5-3 9-8 9-16C54 17 46 7 32 7z';
const CRIMSON = '#ff2a3a';
const DARK = '#2a0306';
/** Its size on screen (a share of the screen's height, about: the sprite isn't shrunk by distance). */
const SIZE = 0.065;
/** How far over the top of the body it floats (m). */
const ABOVE = 0.45;
/** Seconds to snap in (from this much bigger) and to fade out; a heartbeat's length. */
const SNAP = 0.12;
const SNAP_FROM = 1.6;
const FADE = 0.12;
const BEAT = 0.8;

let skullTex: THREE.Texture | null = null;

/** The skull, painted once: a ring round it, the crimson head with a dark outline, dark eyes, nose and teeth. */
function skullTexture(): THREE.Texture {
  if (skullTex) return skullTex;
  if (typeof document === 'undefined') return (skullTex = new THREE.Texture());
  const n = 128;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  g.scale(n / 64, n / 64);
  g.lineJoin = 'round';
  g.strokeStyle = CRIMSON;
  g.globalAlpha = 0.55;
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(32, 32, 30, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
  const head = new Path2D(SKULL);
  g.fillStyle = CRIMSON;
  g.fill(head);
  g.strokeStyle = '#3a0408';
  g.lineWidth = 2;
  g.stroke(head);
  g.fillStyle = DARK;
  for (const x of [23.5, 40.5]) {
    g.beginPath();
    g.ellipse(x, 30, 6, 6.5, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.moveTo(32, 37);
  g.lineTo(28.5, 43.5);
  g.lineTo(35.5, 43.5);
  g.closePath();
  g.fill();
  g.strokeStyle = DARK;
  for (const x of [27, 32, 37]) {
    g.beginPath();
    g.moveTo(x, 50);
    g.lineTo(x, 57);
    g.stroke();
  }
  skullTex = new THREE.CanvasTexture(c);
  skullTex.colorSpace = THREE.SRGBColorSpace;
  return skullTex;
}

/** A heartbeat's swell at `t` s into it (0 … 1): a strong beat, then a weaker one. */
export function beat(t: number): number {
  const k = (t % BEAT) / BEAT;
  const bump = (at: number, width: number) => Math.max(0, 1 - Math.abs(k - at) / width);
  return Math.max(bump(0.1, 0.1), 0.55 * bump(0.32, 0.1));
}

const at = new THREE.Vector3();

export class ExecMarkView {
  readonly sprite: THREE.Sprite;
  private readonly material: THREE.SpriteMaterial;
  /** The enemy it's over (−1: none, fading), since when (s), and how much it shows (0 … 1). */
  private target = -1;
  private since = 0;
  private shown = 0;
  private time = 0;

  constructor(
    scene: THREE.Scene,
    private readonly rootOf: (i: number) => THREE.Object3D | null,
  ) {
    this.material = new THREE.SpriteMaterial({ map: skullTexture(), transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false, fog: false, toneMapped: false });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.renderOrder = 999;
    this.sprite.visible = false;
    scene.add(this.sprite);
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    const next = state.execTarget;
    if (next >= 0 && next !== this.target) {
      this.target = next;
      this.since = 0;
    }
    this.since += dt;
    const e = this.target >= 0 ? state.enemies[this.target] : null;
    const on = next >= 0 && next === this.target;
    this.shown = on ? Math.min(1, this.since / SNAP) : Math.max(0, this.shown - dt / FADE);
    if (this.shown <= 0 || !e) {
      this.sprite.visible = false;
      if (this.shown <= 0) this.target = -1;
      return;
    }
    // Over the body as drawn (its feet are its root), or where the rules have it.
    const root = this.rootOf(this.target);
    if (root) root.getWorldPosition(at);
    else at.copy(e.pos);
    at.y += ENEMY_STATS[e.kind]().height + ABOVE;
    this.sprite.position.copy(at);
    const snap = on && this.since < SNAP ? SNAP_FROM + (1 - SNAP_FROM) * (this.since / SNAP) : 1;
    this.sprite.scale.setScalar(SIZE * snap * (1 + 0.18 * beat(this.time)));
    this.material.opacity = this.shown * (0.85 + 0.15 * beat(this.time));
    this.sprite.visible = true;
  }

  clear() {
    this.target = -1;
    this.shown = 0;
    this.sprite.visible = false;
  }

  dispose() {
    this.sprite.removeFromParent();
    this.material.dispose();
  }
}
