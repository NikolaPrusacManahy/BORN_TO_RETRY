// Update 0.2.20 — a Fate Card's face painted in code like the cards on the page: its rarity's frame, its rarity and move
// along the top, its mark, its name (was shopCardView.ts's: the shop's card).
// Update 0.3.21 — shared with the manor's cards gallery (engine/lobby/galleryView.ts), and every family's: a Death Card
// black, its frame sickly green, a skull behind its mark; a Traitor Card's frame gold and purple on a purple ground.
// Painted at `px` across (256: the shop's). Blank where there's no page to paint on (the rule tests).
import * as THREE from 'three';
import { CARD, CardKind, familyOf } from '../sim/cards/cards';
import { markOf, RARITY_HEX, SKULL } from '../ui/cardMarks';

/** The face's own size (px) at 256 across; its mark drawn this many times its 64 grid. */
const FW = 256;
const FH = 360;
const MARK_SCALE = 1.7;
const DEATH = '#8affa6';
const TRAITOR_GOLD = '#e8b931';
const TRAITOR_PURPLE = '#9b4dff';

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

/** Card `kind`'s face, `px` wide. */
export function cardFaceTexture(kind: CardKind, px = FW): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const face = CARD[kind];
  const family = familyOf(kind);
  const colour = family === 'death' ? DEATH : family === 'traitor' ? TRAITOR_GOLD : RARITY_HEX[face.rarity];
  const c = document.createElement('canvas');
  c.width = px;
  c.height = Math.round((px * FH) / FW);
  const g = c.getContext('2d')!;
  g.scale(px / FW, px / FW);
  const grad = g.createLinearGradient(0, 0, 0, FH);
  const [top, bottom] = family === 'death' ? ['#141a14', '#030403'] : family === 'traitor' ? ['#2a1640', '#0e0716'] : ['#241216', '#0d0608'];
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, FW, FH);
  g.lineWidth = 8;
  if (family === 'traitor') {
    // Split gold and purple, corner to corner.
    g.strokeStyle = TRAITOR_GOLD;
    g.beginPath();
    g.moveTo(6, FH - 6);
    g.lineTo(6, 6);
    g.lineTo(FW - 6, 6);
    g.stroke();
    g.strokeStyle = TRAITOR_PURPLE;
    g.beginPath();
    g.moveTo(FW - 6, 6);
    g.lineTo(FW - 6, FH - 6);
    g.lineTo(6, FH - 6);
    g.stroke();
  } else {
    g.strokeStyle = colour;
    g.strokeRect(6, 6, FW - 12, FH - 12);
  }
  g.globalAlpha = 0.4;
  g.lineWidth = 2;
  g.strokeStyle = colour;
  g.strokeRect(18, 18, FW - 36, FH - 36);
  g.globalAlpha = 1;
  g.font = "bold 18px 'Pixelify Sans', sans-serif";
  g.textBaseline = 'middle';
  g.fillStyle = colour;
  g.textAlign = 'left';
  g.fillText(family === 'fate' ? face.rarity.toUpperCase() : family.toUpperCase(), 30, 40);
  g.textAlign = 'right';
  g.fillStyle = '#c9bfc6';
  g.fillText(face.move.toUpperCase(), FW - 30, 40);
  // Its mark on a soft glow (a Death Card's over its skull).
  const glow = g.createRadialGradient(128, 150, 4, 128, 150, 90);
  glow.addColorStop(0, `${colour}55`);
  glow.addColorStop(1, `${colour}00`);
  g.fillStyle = glow;
  g.fillRect(28, 60, 200, 180);
  g.save();
  g.translate(128 - 32 * MARK_SCALE, 150 - 32 * MARK_SCALE);
  g.scale(MARK_SCALE, MARK_SCALE);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (family === 'death') {
    g.strokeStyle = 'rgba(217, 210, 191, 0.35)';
    g.lineWidth = 2;
    g.stroke(new Path2D(SKULL));
  }
  g.strokeStyle = colour;
  g.lineWidth = 3;
  g.stroke(new Path2D(markOf(face.move)));
  g.restore();
  g.fillStyle = family === 'death' ? '#d9d2bf' : '#ffffff';
  g.textAlign = 'center';
  g.font = "bold 34px 'Pixelify Sans', Impact, sans-serif";
  const name = lines(g, face.name.toUpperCase(), 210);
  name.forEach((l, i) => g.fillText(l, 128, 284 + (i - (name.length - 1) / 2) * 38));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
