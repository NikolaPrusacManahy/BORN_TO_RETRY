// Update 0.2.9 — the lobby's boards (world/lobby/boards.ts says what they say): dark panels with a thin gold edge, their
// lines painted on a canvas, centred, each shrunk to fit; unlit, so they read in any light. A board is painted again
// only when its lines change (your difficulty or character), and all of them once the page's fonts are in. Without a
// page (the tests), plain panels.
import * as THREE from 'three';
import type { Difficulty } from '../../sim/lobby/difficulty';
import { BoardLine, boardLines, Tone } from '../../world/lobby/boards';
import type { Board } from '../../world/lobby/hallDressing';

/** Canvas pixels per metre of board. */
const PX = 170;
const INK: Record<Tone, string> = { gold: '#ffc75a', text: '#e9e1d4', dim: '#6f6862' };
const FACE = '#120e12';
const EDGE = 'rgba(214, 160, 72, 0.75)';

interface Painted {
  board: Board;
  canvas: HTMLCanvasElement | null;
  tex: THREE.CanvasTexture | null;
  mat: THREE.MeshBasicMaterial;
  /** What it shows now ('': not painted yet). */
  shown: string;
  lines: BoardLine[];
}

function paint(p: Painted) {
  const c = p.canvas;
  const g = c?.getContext('2d');
  if (!c || !g) return;
  const { width: w, height: h } = c;
  g.fillStyle = FACE;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = EDGE;
  g.lineWidth = Math.max(3, h * 0.02);
  const inset = g.lineWidth * 2;
  g.strokeRect(inset, inset, w - 2 * inset, h - 2 * inset);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const total = p.lines.reduce((sum, l) => sum + l.size * 1.3, 0) * h;
  let y = (h - total) / 2;
  for (const l of p.lines) {
    const size = l.size * h;
    const title = l.tone === 'gold';
    g.font = `${title ? '' : '600 '}${size}px ${title ? "'Anton'" : "'Chakra Petch'"}, sans-serif`;
    const fit = Math.min(1, (w * 0.9) / Math.max(1, g.measureText(l.text).width));
    g.save();
    g.translate(w / 2, y + size * 0.65);
    g.scale(fit, fit);
    g.fillStyle = INK[l.tone];
    if (title) {
      g.shadowColor = 'rgba(255, 150, 40, 0.55)';
      g.shadowBlur = size * 0.35;
    }
    g.fillText(l.text, 0, 0);
    g.restore();
    y += size * 1.3;
  }
  p.tex!.needsUpdate = true;
}

export class BoardsView {
  readonly group = new THREE.Group();
  private readonly list: Painted[] = [];
  private readonly geo = new THREE.PlaneGeometry(1, 1);
  private difficulty: Difficulty | null = null;
  private character = '';

  constructor(boards: readonly Board[]) {
    const page = typeof document !== 'undefined';
    for (const board of boards) {
      const canvas = page ? document.createElement('canvas') : null;
      if (canvas) {
        canvas.width = Math.round(board.w * PX);
        canvas.height = Math.round(board.h * PX);
      }
      const tex = canvas ? new THREE.CanvasTexture(canvas) : null;
      if (tex) {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
      }
      const mat = new THREE.MeshBasicMaterial({ color: tex ? 0xffffff : FACE, map: tex });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.position.set(board.x, board.y, board.z);
      mesh.rotation.y = board.rot;
      mesh.scale.set(board.w, board.h, 1);
      this.group.add(mesh);
      this.list.push({ board, canvas, tex, mat, shown: '', lines: [] });
    }
    // The web fonts may come in after the first paint.
    if (page) void document.fonts?.ready.then(() => this.repaint(true));
  }

  /** Shows `difficulty` and `character` (the gate's board, and which altar's name is lit). */
  show(difficulty: Difficulty, character: string) {
    if (difficulty === this.difficulty && character === this.character) return;
    this.difficulty = difficulty;
    this.character = character;
    this.repaint(false);
  }

  private repaint(all: boolean) {
    if (!this.difficulty) return;
    for (const p of this.list) {
      p.lines = boardLines(p.board, this.difficulty, this.character);
      const sig = p.lines.map((l) => `${l.text}|${l.tone}`).join('/');
      if (sig === p.shown && !all) continue;
      p.shown = sig;
      paint(p);
    }
  }

  dispose() {
    this.geo.dispose();
    for (const p of this.list) {
      p.mat.dispose();
      p.tex?.dispose();
    }
  }
}
