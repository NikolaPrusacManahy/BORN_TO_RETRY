// Update 0.2.20 — the shop's Fate Card in the world (sim/cards/shopCard.ts; the designer: "the shop has only one fate
// card. floating near, cost 100"): the card floats past the end of the row of tiles, turning slowly and bobbing, lit in
// its rarity's colour, its price over it (red when you can't pay). Its face painted in code like the cards on the page:
// its rarity's frame, its rarity and move along the top, its mark, its name; its back the lobby stand's. Gone once
// bought. Blank where there's no page to paint on (the rule tests).
import * as THREE from 'three';
import { CARD } from '../sim/cards/cards';
import { CARD_FLOAT, CARD_PRICE_Y, cardPrice, ShopCard } from '../sim/cards/shopCard';
import type { CombatState } from '../sim/combat/state';
import { CARDS } from '../tuning/cards';
import { markOf, RARITY_HEX } from '../ui/cardMarks';
import { cardBackTexture } from './lobby/fateStand';

/** The card's size (m), how fast it turns (rad/s), its bob (m) and its light. */
const W = 0.55;
const H = 0.77;
const TURN = 0.8;
const BOB = 0.06;
const GLOW = 6;
/** Its mark drawn this many times its 64 grid (px). */
const MARK_SCALE = 1.7;

type Tags = (price: number) => { cheap: THREE.SpriteMaterial; dear: THREE.SpriteMaterial };

/** Fits `text` on lines no wider than `width` (px). */
function lines(g: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > width) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** The card's face: its frame, its rarity and move, its mark, its name. */
function faceTexture(card: ShopCard): THREE.Texture {
  if (typeof document === 'undefined' || card.kind === null) return new THREE.Texture();
  const face = CARD[card.kind];
  const colour = RARITY_HEX[face.rarity];
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 360;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 360);
  grad.addColorStop(0, '#241216');
  grad.addColorStop(1, '#0d0608');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 360);
  g.strokeStyle = colour;
  g.lineWidth = 8;
  g.strokeRect(6, 6, 244, 348);
  g.globalAlpha = 0.4;
  g.lineWidth = 2;
  g.strokeRect(18, 18, 220, 324);
  g.globalAlpha = 1;
  g.font = "bold 18px 'Pixelify Sans', sans-serif";
  g.textBaseline = 'middle';
  g.fillStyle = colour;
  g.textAlign = 'left';
  g.fillText(face.rarity.toUpperCase(), 30, 40);
  g.textAlign = 'right';
  g.fillStyle = '#c9bfc6';
  g.fillText(face.move.toUpperCase(), 226, 40);
  // Its mark on a soft glow.
  const glow = g.createRadialGradient(128, 150, 4, 128, 150, 90);
  glow.addColorStop(0, `${colour}55`);
  glow.addColorStop(1, `${colour}00`);
  g.fillStyle = glow;
  g.fillRect(28, 60, 200, 180);
  g.save();
  g.translate(128 - 32 * MARK_SCALE, 150 - 32 * MARK_SCALE);
  g.scale(MARK_SCALE, MARK_SCALE);
  g.strokeStyle = colour;
  g.lineWidth = 3;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.stroke(new Path2D(markOf(face.move)));
  g.restore();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.font = "bold 34px 'Pixelify Sans', Impact, sans-serif";
  const name = lines(g, face.name.toUpperCase(), 210);
  name.forEach((l, i) => g.fillText(l, 128, 284 + (i - (name.length - 1) / 2) * 38));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class ShopCardView {
  readonly group = new THREE.Group();
  private readonly card = new THREE.Group();
  private readonly geo = new THREE.PlaneGeometry(W, H);
  private readonly faces: THREE.MeshBasicMaterial[] = [];
  private readonly price: THREE.Sprite | null = null;
  private readonly light: THREE.PointLight | null = null;

  constructor(
    private readonly shop: ShopCard | null | undefined,
    tags: Tags,
  ) {
    if (!shop || shop.kind === null) return;
    this.price = new THREE.Sprite(tags(CARDS.v.shopCard).cheap);
    const front = new THREE.MeshBasicMaterial({ map: faceTexture(shop), side: THREE.FrontSide });
    const back = new THREE.MeshBasicMaterial({ map: cardBackTexture(), side: THREE.FrontSide });
    this.faces.push(front, back);
    const behind = new THREE.Mesh(this.geo, back);
    behind.rotation.y = Math.PI;
    this.card.add(new THREE.Mesh(this.geo, front), behind);
    this.light = new THREE.PointLight(new THREE.Color(RARITY_HEX[CARD[shop.kind].rarity]), GLOW, 4, 1.6);
    this.price.scale.set(0.8, 0.3, 1);
    this.price.position.y = CARD_PRICE_Y;
    this.group.add(this.card, this.light, this.price);
    this.group.position.set(shop.x, 0, shop.z);
    this.card.position.y = CARD_FLOAT;
    this.light.position.y = CARD_FLOAT;
  }

  /** Each frame: it turns and bobs; its price as you can pay it; gone once bought (its light dark, not taken out: the
   *  scene's lights stay as many, so nothing is rebuilt as you buy). */
  update(time: number, state: CombatState, tags: Tags) {
    const c = this.shop;
    if (!c || c.kind === null || !this.price || !this.light) return;
    this.card.visible = this.price.visible = !c.sold;
    this.light.intensity = c.sold ? 0 : GLOW;
    if (c.sold) return;
    this.card.rotation.y = time * TURN;
    this.card.position.y = CARD_FLOAT + Math.sin(time * 1.6) * BOB;
    const price = cardPrice(state);
    const tag = tags(price);
    this.price.material = state.money < price ? tag.dear : tag.cheap;
  }

  dispose() {
    this.geo.dispose();
    for (const m of this.faces) {
      m.map?.dispose();
      m.dispose();
    }
    this.light?.dispose();
  }
}
