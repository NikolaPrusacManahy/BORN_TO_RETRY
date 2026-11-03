// Update 0.2.9 — the lobby's light under its closed roof (tuning/lobbyLight.ts): a warm fill from all round, a key light
// from high above (its shadows cover the whole hall), a light under each chandelier, the hearth's fire, the wall
// torches nearest you (a few lights move from torch to torch, as the dungeon's do), and a glow on your difficulty's
// altar and on the playable character. Flames flicker, each a little out of step.
// Update 0.3.21 — the manor (MD/LOBBY_MANOR_PLAN.md): more torches to move between (its rooms and the bestiary too), the
// characters' dais on the west wall and the altars on the east, the crystal's cold glow, pulsing as it turns.
import * as THREE from 'three';
import { LOBBY_LIGHT } from '../../tuning/lobbyLight';
import { lightNearest } from '../torchLights';
import type { HallDressing } from '../../world/lobby/hallDressing';
import { ALTARS, CRYSTAL_DAIS, CRYSTAL_Y, DAIS, FIGURES } from '../../world/lobby/spots';

const FILL_TOP = 0xffe6c8;
const FILL_BOTTOM = 0x5a4636;
const KEY = 0xfff0dc;
/** The way to the key light (nearly overhead), and how far round the hall its shadows reach (m). */
const KEY_DIR = new THREE.Vector3(-0.12, 1, 0.18).normalize();
const SHADOW_REACH = 30;
const FLAME = 0xff9a48;
const CANDLES = 0xffc27a;
const CRYSTAL = 0x8fd8ff;
/** How many torches have a light, and how often they move to the nearest (s). */
const TORCH_LIGHTS = 8;
const RELIGHT = 0.25;

/** A flame's flicker (0.7–1), out of step by `seed`. */
const flicker = (time: number, seed: number) => 0.85 + 0.15 * (Math.sin(time * 9 + seed) * 0.5 + Math.sin(time * 23 + seed * 3) * 0.3 + Math.sin(time * 5.3 + seed) * 0.2);

export class LobbyLights {
  private readonly fill = new THREE.HemisphereLight(FILL_TOP, FILL_BOTTOM, 1);
  private readonly key = new THREE.DirectionalLight(KEY, 1);
  private readonly chandeliers: THREE.PointLight[];
  private readonly torches: THREE.PointLight[] = [];
  private readonly hearth = new THREE.PointLight(FLAME, 1, 9, 1.6);
  private readonly chosen = new THREE.PointLight(CANDLES, 1, 7, 1.6);
  private readonly figure = new THREE.PointLight(CANDLES, 1, 7, 1.6);
  private readonly crystal = new THREE.PointLight(CRYSTAL, 1, 14, 1.5);
  private relight = 0;

  constructor(
    group: THREE.Group,
    private readonly d: HallDressing,
  ) {
    const k = this.key;
    k.position.copy(KEY_DIR).multiplyScalar(60);
    k.shadow.mapSize.set(2048, 2048);
    const sc = k.shadow.camera;
    sc.left = sc.bottom = -SHADOW_REACH;
    sc.right = sc.top = SHADOW_REACH;
    sc.near = 1;
    sc.far = 140;
    k.shadow.bias = -0.0005;
    k.shadow.normalBias = 0.03;
    this.chandeliers = d.chandeliers.map((c) => {
      const l = new THREE.PointLight(CANDLES, 1, 22, 1.4);
      l.position.set(c.x, c.y - 0.3, c.z);
      return l;
    });
    for (let i = 0; i < TORCH_LIGHTS; i++) this.torches.push(new THREE.PointLight(FLAME, 1, 14, 1.6));
    this.hearth.position.set(d.hearth.x, d.hearth.y + 0.4, d.hearth.z);
    this.crystal.position.set(CRYSTAL_DAIS.x, CRYSTAL_Y, CRYSTAL_DAIS.z);
    group.add(this.fill, k, k.target, this.hearth, this.chosen, this.figure, this.crystal, ...this.chandeliers, ...this.torches);
  }

  /** `at`: the camera (the torches near it get the lights); `altar`, `figure`: your difficulty's altar and your
   *  character's place (their indexes). */
  update(time: number, dt: number, at: THREE.Vector3, altar: number, figure: number) {
    const v = LOBBY_LIGHT.v;
    this.fill.intensity = v.fill;
    this.key.intensity = v.key;
    this.key.castShadow = v.shadows >= 1;
    this.chandeliers.forEach((l, i) => (l.intensity = v.chandeliers * (0.94 + 0.06 * flicker(time, 11 + i * 5))));
    this.torches.forEach((l, i) => (l.intensity = v.torches * flicker(time, 1 + i * 6)));
    this.hearth.intensity = v.torches * 1.6 * flicker(time, 40);
    const f = FIGURES[figure];
    this.figure.position.set(f.x + 1.6, DAIS.h + 2.8, f.z);
    this.crystal.intensity = v.crystal * (0.85 + 0.15 * Math.sin(time * 1.6));
    this.figure.intensity = v.chosen;
    const a = ALTARS[altar];
    // The glow follows your choice across the altars.
    const k = 1 - Math.exp(-8 * dt);
    this.chosen.position.x += (a.x - 1.5 - this.chosen.position.x) * k;
    this.chosen.position.y = 3;
    this.chosen.position.z += (a.z - this.chosen.position.z) * k;
    this.chosen.intensity = v.chosen;
    this.relight -= dt;
    if (this.relight > 0) return;
    this.relight = RELIGHT;
    lightNearest(this.torches, this.d.torches, at);
  }

  /** Straight to your difficulty's altar (no glide), as you come in. */
  place(altar: number) {
    const a = ALTARS[altar];
    this.chosen.position.set(a.x - 1.5, 3, a.z);
  }
}
