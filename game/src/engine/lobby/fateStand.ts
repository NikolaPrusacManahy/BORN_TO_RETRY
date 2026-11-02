// Update 0.2.17 — the Fate Cards' stand in the lobby (the designer: "a new stand... a bit different, asking if the
// player wants the Cards in their run"): over its small table (world/lobby/furniture.ts) a big Fate Card floats. On:
// it turns slowly, glowing crimson, "FATE CARDS" on its face; off: it stops, its back to the room, dim and grey. Made in
// code (its faces painted on canvases: no art to load; blank where there's no page, as in the rule tests).
import * as THREE from 'three';
import { CARD_FLOAT, CARD_STAND } from '../../world/lobby/spots';

/** The card's size (m), how fast it turns on (rad/s), its bob, and its glow's light. */
const W = 0.78;
const H = 1.1;
const TURN = 0.7;
const BOB = 0.05;
const GLOW = 9;
const CRIMSON = 0xff2a3a;
/** How fast it goes from on to off and back (1/s). */
const EASE = 3;

/** A face painted on a canvas (`front`: the title and mark; else the back's diamond). */
function faceTexture(front: boolean): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 360;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 360);
  grad.addColorStop(0, '#2a1418');
  grad.addColorStop(1, '#0d0608');
  g.fillStyle = front ? grad : '#22090e';
  g.fillRect(0, 0, 256, 360);
  if (!front) {
    g.strokeStyle = '#3a0f16';
    g.lineWidth = 8;
    for (let k = -360; k < 360; k += 16) {
      g.beginPath();
      g.moveTo(k, 0);
      g.lineTo(k + 360, 360);
      g.stroke();
    }
  }
  g.strokeStyle = '#ff2a3a';
  g.lineWidth = 8;
  g.strokeRect(8, 8, 240, 344);
  g.lineWidth = 2;
  g.strokeRect(20, 20, 216, 320);
  // The mark: nested diamonds.
  const cy = front ? 140 : 180;
  g.lineWidth = 5;
  for (const r of [70, 44, 16]) {
    g.beginPath();
    g.moveTo(128, cy - r);
    g.lineTo(128 + r, cy);
    g.lineTo(128, cy + r);
    g.lineTo(128 - r, cy);
    g.closePath();
    g.stroke();
  }
  if (front) {
    g.fillStyle = '#ffffff';
    g.font = "bold 40px 'Pixelify Sans', Impact, sans-serif";
    g.textAlign = 'center';
    g.fillText('FATE', 128, 262);
    g.fillText('CARDS', 128, 306);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Update 0.2.20 — a card's back, painted (the shop's card: shopCardView.ts). */
export const cardBackTexture = () => faceTexture(false);

export class FateStand {
  readonly group = new THREE.Group();
  private readonly card = new THREE.Group();
  private readonly geo = new THREE.PlaneGeometry(W, H);
  private readonly faces: THREE.MeshBasicMaterial[];
  private readonly light = new THREE.PointLight(CRIMSON, GLOW, 5, 1.6);
  /** 1: on (turning, lit), 0: off (still, dim). */
  private k = 1;
  private spin = 0;

  constructor(on: boolean) {
    this.k = on ? 1 : 0;
    this.faces = [true, false].map((front) => new THREE.MeshBasicMaterial({ map: faceTexture(front), side: THREE.FrontSide }));
    const front = new THREE.Mesh(this.geo, this.faces[0]);
    const back = new THREE.Mesh(this.geo, this.faces[1]);
    back.rotation.y = Math.PI;
    this.card.add(front, back);
    // It faces the room (east, +x).
    this.card.rotation.y = Math.PI / 2;
    this.group.add(this.card, this.light);
    this.group.position.set(CARD_STAND.x, CARD_FLOAT, CARD_STAND.z);
    this.light.position.set(0.6, 0, 0);
  }

  /** Each frame: `on`, Fate Cards are on. */
  update(time: number, dt: number, on: boolean) {
    this.k += ((on ? 1 : 0) - this.k) * (1 - Math.exp(-EASE * dt));
    // On, it turns; off, it settles back to the room (π: its back showing).
    if (on) this.spin += TURN * dt;
    else this.spin += (Math.round(this.spin / (2 * Math.PI) - 0.5) * 2 * Math.PI + Math.PI - this.spin) * (1 - Math.exp(-EASE * dt));
    this.card.rotation.y = Math.PI / 2 + this.spin;
    this.card.position.y = Math.sin(time * 1.4) * BOB * this.k;
    const shade = 0.35 + 0.65 * this.k;
    for (const m of this.faces) m.color.setScalar(shade);
    this.light.intensity = GLOW * this.k;
  }

  dispose() {
    this.geo.dispose();
    for (const m of this.faces) {
      m.map?.dispose();
      m.dispose();
    }
  }
}
