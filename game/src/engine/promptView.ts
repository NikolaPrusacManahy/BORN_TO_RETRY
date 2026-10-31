// Update 0.1.20 — the prompts in play (the designer: an overlay near an item "stating what it is and what it does, with
// the appropriate rarity", "[E] to interact or pick up", "[E] TO EXECUTE"; sim/items/focus.ts says what it's about).
// An item's card hangs over it: its name in its rarity's colour, the rarity, what it does, and what E does if it's in
// reach. At a chest, what E does (or that it needs a key). Over the enemy you can execute, over its skull: [E] TO
// EXECUTE. The key is the one Interact is bound to. Page elements over the canvas, placed each frame where the thing
// is on screen; their words are only written when what they show changes. Nothing without a page (the tests).
// Update 0.2.9 — and the lobby's stations: a difficulty's or a character's name with "[E] to choose" (or "Chosen"), a
// locked character's "Locked" (Update 0.2.12 — the designer: "coming soon characters instead of Locked"), the gate's
// "[E] to enter".
// Update 0.2.15 — a Scar's card: its name in crimson, "Scar · the move it changes" where a rarity would be.
import * as THREE from 'three';
import type { Focus } from '../sim/items/focus';
import { infoOf } from '../sim/items/itemInfo';

const ACT: Record<Exclude<Focus['act'], null | 'execute' | 'locked' | 'chosen' | 'unavailable'>, string> = { pick: 'to pick up', buy: 'to buy', open: 'to open', choose: 'to choose', enter: 'to enter' };
/** Update 0.2.9 — what a card says where E does nothing (a chest without a key; in the lobby, yours already, locked). */
const NOTE: Partial<Record<Exclude<Focus['act'], null>, string>> = { locked: 'Needs a key', chosen: 'Chosen', unavailable: 'Coming soon' };
/** The skull over an executable enemy (execMarkView.ts): its height on screen (a share of the screen's), and the gap
 *  over it (px). */
const SKULL = 0.065;
const GAP = 6;

const at = new THREE.Vector3();
const size = new THREE.Vector2();

function el(parent: HTMLElement, cls: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = cls;
  parent.appendChild(d);
  return d;
}

/** `node` says "[key] words", the key lit. */
function keyed(node: HTMLElement, key: string, words: string) {
  const k = document.createElement('span');
  k.className = 'rb-prompt-key';
  k.textContent = `[${key}]`;
  node.replaceChildren(k, ` ${words}`);
}

export class PromptView {
  private readonly root: HTMLDivElement | null = null;
  private readonly card!: HTMLDivElement;
  private readonly name!: HTMLDivElement;
  private readonly rarity!: HTMLDivElement;
  private readonly does!: HTMLDivElement;
  private readonly act!: HTMLDivElement;
  private readonly exec!: HTMLDivElement;
  /** What the card and the execute prompt show now ('': nothing). */
  private shown = '';
  private execShown = '';

  constructor(host: HTMLElement | null) {
    if (!host || typeof document === 'undefined') return;
    this.root = el(host, 'rb-prompts');
    this.card = el(this.root, 'rb-prompt');
    this.name = el(this.card, 'rb-prompt-name');
    this.rarity = el(this.card, 'rb-prompt-rarity');
    this.does = el(this.card, 'rb-prompt-does');
    this.act = el(this.card, 'rb-prompt-act');
    this.exec = el(this.root, 'rb-prompt-exec');
  }

  /** `key`: the Interact key's label; `show`: play is on (not paused, dead, in a show or an execution); `mark`: the
   *  execution skull's place (null: none drawn). */
  update(f: Focus, camera: THREE.Camera, renderer: THREE.WebGLRenderer, key: string, show: boolean, mark: THREE.Vector3 | null) {
    if (!this.root) return;
    renderer.getSize(size);
    const execute = show && f.act === 'execute';
    const card = show && !execute && (f.item !== null || f.act !== null || f.label !== null);
    this.setExec(execute ? key : '');
    if (execute) this.place(this.exec, mark ?? f.at, camera, SKULL * size.y * 0.5 + GAP);
    this.setCard(card ? f : null, key);
    if (card) this.place(this.card, f.at, camera, 0);
  }

  /** Puts `node`'s bottom middle where `p` is on screen, `up` px higher; hides it if `p` is behind you. */
  private place(node: HTMLElement, p: THREE.Vector3, camera: THREE.Camera, up: number) {
    at.copy(p).project(camera);
    const ahead = at.z > -1 && at.z < 1;
    node.classList.toggle('is-off', !ahead);
    if (!ahead) return;
    const x = (at.x * 0.5 + 0.5) * size.x;
    const y = (-at.y * 0.5 + 0.5) * size.y - up;
    node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
  }

  private setExec(key: string) {
    if (key === this.execShown) return;
    this.execShown = key;
    this.exec.classList.toggle('is-on', key !== '');
    if (key) keyed(this.exec, key, 'TO EXECUTE');
  }

  private setCard(f: Focus | null, key: string) {
    const sig = f ? `${f.item}|${f.uses}|${f.act}|${f.label}|${key}` : '';
    if (sig === this.shown) return;
    this.shown = sig;
    this.card.classList.toggle('is-on', f !== null);
    if (!f) return;
    const info = f.item ? infoOf(f.item, f.uses) : null;
    // (Update 0.2.9 — a lobby station: its name, if it has one, in place of an item's.)
    const name = info?.name ?? f.label ?? '';
    this.card.className = `rb-prompt is-on${name ? '' : ' is-bare'}${info?.rarity ? ` is-${info.rarity}` : ''}${info?.tag ? ' is-scar' : ''}`;
    this.name.textContent = name;
    this.rarity.textContent = info?.tag ?? (info?.rarity ? info.rarity[0].toUpperCase() + info.rarity.slice(1) : '');
    this.does.textContent = info?.does ?? '';
    const note = f.act ? NOTE[f.act] : undefined;
    if (note) this.act.textContent = note;
    else if (f.act && f.act !== 'execute') keyed(this.act, key, ACT[f.act as keyof typeof ACT]);
    else this.act.textContent = '';
  }

  dispose() {
    this.root?.remove();
  }
}
