// Update 0.2.9 — draws the lobby (world/lobby/hallDressing.ts) from the dungeon kit (public/models/dungeon/kit.glb) and
// the lobby's own pieces and characters (public/models/menu/lobby.glb): every placement as instances; the roof's tiles,
// timber beams and the chandeliers hanging from them (iron rings and chains, made here); the walls' dark cores; the
// dark beyond the gate (drawn from the inside); the portcullis, rising as you go through; the boards (boardsView.ts);
// the characters on their dais, breathing, the locked ones as dark silhouettes; and the light (lobbyLights.ts).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ROSTER } from '../../sim/characters';
import { DIFFICULTIES } from '../../sim/lobby/difficulty';
import type { Lobby } from '../../sim/lobby/lobby';
import { BRICK } from '../../world/dungeon/styles';
import { dressHall, HallDressing, RING_R } from '../../world/lobby/hallDressing';
import { DAIS, FIGURES, HALL } from '../../world/lobby/spots';
import { KIT_URL } from '../dungeonView';
import { boxInstances, instancePieces, kitMaterial } from '../kitPieces';
import type { LevelView } from '../level';
import { BoardsView } from './boardsView';
import { LobbyLights } from './lobbyLights';
import { FateStand } from './fateStand';

export const LOBBY_KIT_URL = '/models/menu/lobby.glb';
/** What shows through any gap (nothing should): the dark of the stone. */
const BACKDROP = 0x120e0c;
const WOOD = 0x3b2615;
const IRON = 0x1c1b1e;
const SILHOUETTE = 0x060507;
/** The portcullis rises this high (m: into the wall over the gateway), this fast (m/s). */
const BARS_LIFT = 5.5;
const BARS_RATE = 4.5;
/** A chandelier's chain runs up to its beam; its four arms meet this far over its ring (m). */
const HUB = 1;

/** Fetches the lobby's models ahead (once it's built they come from memory: THREE.Cache), so it's whole as it shows. */
export function preloadLobby(): Promise<void> {
  THREE.Cache.enabled = true;
  const files = new THREE.FileLoader().setResponseType('arraybuffer');
  return Promise.all([KIT_URL, LOBBY_KIT_URL].map((url) => files.loadAsync(url))).then(
    () => undefined,
    (err) => console.error('lobby models failed to load', err),
  );
}

export class LobbyView implements LevelView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  private readonly dressing: HallDressing = dressHall();
  private readonly lights: LobbyLights;
  private readonly boards: BoardsView;
  private readonly mats: THREE.Material[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly figures: THREE.Object3D[] = [];
  /** Update 0.2.17 — the Fate Cards' stand's card. */
  private readonly stand: FateStand;
  private bars: THREE.Object3D | null = null;
  private lift = 0;
  private time = 0;
  /** Your difficulty's altar and your character's place (indexes), and the name over the gate, as last seen. */
  private altar = 0;
  private figure = 0;
  private name = '';
  private seenDifficulty = '';
  private seenCharacter = '';

  constructor(
    private readonly scene: THREE.Scene,
    private readonly lobby: Lobby,
    loadModels = true,
  ) {
    scene.add(this.group);
    scene.background = new THREE.Color(BACKDROP);
    scene.fog = null;
    this.lights = new LobbyLights(this.group, this.dressing);
    this.boards = new BoardsView(this.dressing.boards);
    this.stand = new FateStand(lobby.cards);
    this.group.add(this.stand.group);
    this.choice();
    this.lights.place(this.altar);
    this.group.add(this.boards.group);
    this.solids();
    const loader = new GLTFLoader();
    this.loaded = loadModels
      ? Promise.all([loader.loadAsync(KIT_URL), loader.loadAsync(LOBBY_KIT_URL)])
          .then(([kit, own]) => this.build(kit.scene, own.scene))
          .catch((err) => console.error('lobby models failed to load', err))
      : Promise.resolve();
  }

  /** Your difficulty and character, if they changed: the altar lit, the character's light, the boards. */
  private choice() {
    const l = this.lobby;
    if (this.seenDifficulty === l.difficulty && this.seenCharacter === l.character) return;
    this.seenDifficulty = l.difficulty;
    this.seenCharacter = l.character;
    this.altar = Math.max(0, DIFFICULTIES.findIndex((d) => d.id === l.difficulty));
    this.figure = Math.max(0, ROSTER.findIndex((c) => c.id === l.character));
    this.name = ROSTER[this.figure].name;
    this.boards.show(l.difficulty, this.name);
  }

  /** The pieces from both kits, the roof's tiles (casting no shadow), the portcullis and the characters. */
  build(kit: THREE.Object3D, own: THREE.Object3D) {
    const d = this.dressing;
    const missing = instancePieces(this.group, [kit, own], d.pieces, this.mats, (piece) => !piece.includes('Floor'));
    missing.push(...instancePieces(this.group, [kit], d.ceiling, this.mats, () => false));
    if (missing.length) console.warn(`lobby: no ${missing.join(', ')}`);
    const bars = kit.getObjectByName(d.bars.piece)?.clone();
    if (bars) {
      bars.position.set(d.bars.x, d.bars.y, d.bars.z);
      bars.rotation.y = d.bars.rot;
      bars.scale.set(d.bars.sx, d.bars.sy, d.bars.sz);
      bars.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.material = kitMaterial(o.material as THREE.MeshStandardMaterial, this.mats);
        o.castShadow = o.receiveShadow = true;
      });
      this.group.add(bars);
      this.bars = bars;
    }
    const shade = new THREE.MeshStandardMaterial({ color: SILHOUETTE, roughness: 0.6, metalness: 0 });
    this.mats.push(shade);
    ROSTER.forEach((c, i) => {
      const body = own.getObjectByName(`Char_${c.id}`)?.clone();
      if (!body) return;
      body.position.set(FIGURES[i].x, DAIS.h, FIGURES[i].z);
      body.rotation.set(0, -Math.PI / 2, 0);
      body.scale.setScalar(1);
      body.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.material = c.available ? kitMaterial(o.material as THREE.MeshStandardMaterial, this.mats) : shade;
        o.castShadow = o.receiveShadow = true;
      });
      this.group.add(body);
      this.figures[i] = body;
    });
  }

  /** The walls' cores, the beams, the chandeliers' iron and the dark beyond the gate: none of it casts a shadow. */
  private solids() {
    const d = this.dressing;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const core = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...BRICK.core), roughness: 1 });
    const wood = new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.95 });
    const iron = new THREE.MeshStandardMaterial({ color: IRON, roughness: 0.6, metalness: 0.3 });
    const dark = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
    this.mats.push(core, wood, iron, dark);
    this.geos.push(box);
    this.group.add(boxInstances(d.cores, core, box), boxInstances(d.beams, wood, box));
    const beyond = new THREE.Mesh(box, dark);
    beyond.position.set(d.dark.x, d.dark.y, d.dark.z);
    beyond.scale.set(d.dark.w, d.dark.h, d.dark.d);
    this.group.add(beyond);
    const ring = new THREE.TorusGeometry(RING_R, 0.05, 6, 28).rotateX(Math.PI / 2);
    const rod = new THREE.CylinderGeometry(0.025, 0.025, 1, 5);
    this.geos.push(ring, rod);
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    const chain = (a: THREE.Vector3, b: THREE.Vector3) => {
      const m = new THREE.Mesh(rod, iron);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.scale.set(1, a.distanceTo(b), 1);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      this.group.add(m);
    };
    for (const c of d.chandeliers) {
      const r = new THREE.Mesh(ring, iron);
      r.position.set(c.x, c.y, c.z);
      this.group.add(r);
      to.set(c.x, c.y + HUB, c.z);
      chain(to, from.set(c.x, HALL.beamsAt, c.z));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        chain(from.set(c.x + Math.cos(a) * RING_R, c.y, c.z + Math.sin(a) * RING_R), to);
      }
    }
  }

  /** Each frame: the light, the boards, the characters breathing, the portcullis rising as you go through, the Fate
   *  Cards' card. */
  frame(dt: number, at: THREE.Vector3) {
    this.time += dt;
    this.choice();
    this.lights.update(this.time, dt, at, this.altar, this.figure);
    this.stand.update(this.time, dt, this.lobby.cards);
    for (let i = 0; i < this.figures.length; i++) if (this.figures[i]) this.figures[i].scale.y = 1 + Math.sin(this.time * 1.7 + i * 1.3) * 0.006;
    if (this.lobby.opening) this.lift = Math.min(BARS_LIFT, this.lift + BARS_RATE * dt);
    if (this.bars) this.bars.position.y = this.dressing.bars.y + this.lift;
  }

  dispose() {
    this.scene.remove(this.group);
    this.boards.dispose();
    this.stand.dispose();
    for (const m of this.mats) m.dispose();
    for (const g of this.geos) g.dispose();
    this.scene.background = null;
  }
}
