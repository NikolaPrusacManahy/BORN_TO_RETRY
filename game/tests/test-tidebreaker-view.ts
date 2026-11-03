// Update 0.3.29 — the Moon's boss, Tidebreaker, drawn: a pillar it tears out (the floor's pieces cut, the stump left,
// the rest in its anchor hand along the hand's forward axis, gripped near its end), hurled (tumbling along its bomb's
// flight) and gone when it smashes; the boulder in its hand; where its leap lands. (Update 0.3.30 — no weapon, no roll.)
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { check, near, section } from './harness';
import { PillarBreaks } from '../src/engine/pillarBreak';
import { holdPillars, pillarEvents } from '../src/engine/pillarEvents';
import { TideFx } from '../src/engine/moon/tideFx';
import { createCombat } from '../src/sim/combat/state';
import { spawnEnemy, setPhase } from '../src/sim/enemies/enemy';
import { PILLAR_CUT, type Pillar } from '../src/sim/combat/pillars';
import { LEAP, SMASH, SWING, THROW, tideWindup } from '../src/sim/enemies/tidebreaker';
import { BombView } from '../src/engine/boss/bombView';
import { DemonFx } from '../src/engine/boss/demonFx';
import { startQuake } from '../src/sim/combat/quakes';
import { OPEN_ARENA } from './fakes/enemyWorld';
import type { Level, LevelView } from '../src/engine/level';
import type { ArenaBox } from '../src/world/arena';

const H = 4.9;
const box: ArenaBox = { x: 3, y: H / 2, z: 2, w: 1.1, h: H, d: 1.1, kind: 'wall' };
const pillar = (): Pillar => ({ x: 3, z: 2, half: 0.55, h: H, box, broken: false, yaw: 0, room: 0, lie: { x: 0, z: 0, yaw: 0 }, stump: null, top: null });

/** A floor's pieces for one pillar (a column in its cell), the view and the world round it. */
function world() {
  const breaks = new PillarBreaks();
  const geo = new THREE.CylinderGeometry(0.5, 0.5, H, 8).translate(0, H / 2, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial(), 1);
  mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(3, 0, 2));
  breaks.add(0, mesh, 0);
  const swaps: { from: ArenaBox; to: readonly ArenaBox[] }[] = [];
  const level = { physics: { swap: (from: ArenaBox, to: readonly ArenaBox[]) => swaps.push({ from, to }) }, dungeon: null } as unknown as Level;
  const view = { breaks } as unknown as LevelView;
  const c = createCombat(OPEN_ARENA);
  c.pillars = [pillar()];
  const slot = spawnEnemy(c.enemies, 'tidebreaker', new THREE.Vector3(0, 0, 0), 0);
  // Its body: its anchor and its hand (at (5, 3, 1), turned as it rests).
  const root = new THREE.Group();
  const anchor = new THREE.Object3D();
  anchor.name = 'Tidebreaker_Anchor';
  const hand = new THREE.Object3D();
  hand.name = 'hand_r';
  hand.position.set(5, 3, 1);
  root.add(anchor, hand);
  return { breaks, mesh, swaps, level, view, c, e: c.enemies[slot], slot, root, anchor, hand };
}

section('Tidebreaker — a pillar torn out, held, hurled');
{
  const w = world();
  const p = w.c.pillars[0];
  p.broken = true;
  p.stump = { ...box, y: (H * PILLAR_CUT) / 2, h: H * PILLAR_CUT };
  w.e.deeds = 1;
  w.c.events.push('pillarGrab', 0, p.x, H * PILLAR_CUT, p.z);
  pillarEvents(w.c, w.level, w.view);
  const hidden = new THREE.Matrix4();
  w.mesh.getMatrixAt(0, hidden);
  check('torn out: its collision only its stump’s now, its pieces out of the floor’s meshes', w.swaps.length === 1 && w.swaps[0].from === box && w.swaps[0].to.length === 1 && w.swaps[0].to[0] === p.stump && hidden.elements[0] === 0);
  const top = w.breaks.group.children.find((o) => o.position.y > 1 && o.children.length > 0)!;
  holdPillars(w.c, w.view, () => w.root, 1 / 60);
  const len = H * (1 - PILLAR_CUT);
  check('in its anchor hand, along the hand’s forward axis, gripped near its end (as its anchor is)', !!top && near(top.position.x, 5, 1e-6) && near(top.position.y, 3, 1e-6) && near(top.position.z, 1 - len * 0.2, 1e-6) && new THREE.Vector3(0, 1, 0).applyQuaternion(top.quaternion).z > 0.999, `${top?.position.toArray().map((x) => x.toFixed(2))}`);
  // Hurled: along its bomb's flight.
  const b = w.c.bombs[0];
  b.alive = true;
  b.look = 'pillar';
  b.from.set(5, 4, 1);
  b.to.set(5, 0, -12);
  b.pos.set(5, 7, -5);
  w.e.deeds = 0;
  w.c.events.clear();
  w.c.events.push('tideHurl', 0, 5, 0, -12);
  pillarEvents(w.c, w.level, w.view);
  holdPillars(w.c, w.view, () => w.root, 0.2);
  const middle = top.position.clone().add(new THREE.Vector3(0, len / 2, 0).applyQuaternion(top.quaternion));
  check('hurled, it tumbles along its flight (its middle where the bomb is)', middle.distanceTo(b.pos) < 1e-6 && Math.abs(new THREE.Vector3(0, 1, 0).applyQuaternion(top.quaternion).y) < 0.999);
  b.alive = false;
  holdPillars(w.c, w.view, () => w.root, 1 / 60);
  check('landed and smashed: gone', !top.visible && !top.parent);
  const lost = world();
  lost.c.pillars[0].broken = true;
  lost.c.events.push('pillarGrab', 0, 3, 1, 2);
  pillarEvents(lost.c, lost.level, lost.view);
  const held = lost.breaks.group.children.find((o) => o.position.y > 1 && o.children.length > 0)!;
  holdPillars(lost.c, lost.view, () => null, 1 / 60);
  check('its holder gone (killed with it in its hands): it smashes', !held.visible);
}

section('Tidebreaker — no weapon; its boulder, its leap');
{
  const w = world();
  const fx = new TideFx(new THREE.Scene());
  // (Update 0.3.30 — the designer: "remove the weapons he has".)
  const glb = readFileSync('public/models/enemies/tidebreaker.glb');
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as { nodes: { name?: string; mesh?: number; children?: number[] }[]; animations: { name: string }[] };
  const drawn = json.nodes.flatMap((n) => n.children ?? []).filter((c) => json.nodes[c].mesh !== undefined).map((c) => json.nodes[c].name);
  check('no weapon: only its body drawn; its jump the three Jump clips (Jump_Start into Jump_Loop, Jump_Land)', drawn.join() === 'Tidebreaker_Body' && ['Jump_Crouch', 'Jump_Air', 'Jump_Land'].every((k) => json.animations.some((x) => x.name === k)) && !json.animations.some((x) => x.name.startsWith('NinjaJump')));
  w.e.move = THROW;
  setPhase(w.e, 'windup');
  w.e.t = tideWindup(THROW) * 0.3;
  fx.update(w.c, () => w.root, 1 / 60);
  const before = fx.group.children.some((o) => o instanceof THREE.Mesh && o.geometry instanceof THREE.IcosahedronGeometry && o.visible);
  w.e.t = tideWindup(THROW) * 0.7;
  fx.update(w.c, () => w.root, 1 / 60);
  const rock = fx.group.children.find((o) => o instanceof THREE.Mesh && o.geometry instanceof THREE.IcosahedronGeometry)!;
  check('the boulder in its hand once it’s ripped up (not before)', !before && rock.visible && rock.position.distanceTo(new THREE.Vector3(5, 3, 1)) < 1e-6);
  w.e.move = LEAP;
  setPhase(w.e, 'leap');
  w.e.aim.set(7, 0, -4);
  fx.update(w.c, () => w.root, 1 / 60);
  const ring = fx.group.children.find((o) => o instanceof THREE.Mesh && o.geometry instanceof THREE.RingGeometry)!;
  check('leaping: a ring where it’ll land', ring.visible && near(ring.position.x, 7, 1e-6) && near(ring.position.z, -4, 1e-6));
}

section('Tidebreaker — no marks before its pillar flies; its own impacts');
{
  const w = world();
  const scene = new THREE.Scene();
  const fx = new TideFx(scene);
  const fan = () => fx.group.children.find((o) => o instanceof THREE.Mesh && o.geometry instanceof THREE.CircleGeometry)!;
  w.e.move = SWING;
  setPhase(w.e, 'windup');
  fx.update(w.c, () => w.root, 1 / 60);
  const noSwingFan = !fan().visible;
  w.e.move = SMASH;
  fx.update(w.c, () => w.root, 1 / 60);
  check('no fan before its pillar’s swing (the designer: "remove those"); its smash keeps its own', noSwingFan && fan().visible);
  const bv = new BombView(scene);
  const b = w.c.bombs[0];
  b.alive = true;
  b.look = 'pillar';
  b.radius = 4;
  bv.update(w.c, 1 / 60);
  const marks = bv.group.children.filter((o) => o.visible).length;
  b.look = 'boulder';
  bv.update(w.c, 1 / 60);
  check('nor a mark where its pillar will land (its boulder keeps one)', marks === 0 && bv.group.children.filter((o) => o.visible).length >= 2, `${marks}`);
  // Its landing: its own impact, not the bosses'.
  const land = world();
  const lx = new TideFx(new THREE.Scene());
  land.c.events.push('tideLand', 18, 4, 0, -6);
  lx.update(land.c, () => land.root, 1 / 60);
  const impacts = (lx as unknown as { impacts: { showing: { craters: number; dust: number; rocks: number; walls: number } } }).impacts;
  const now = impacts.showing;
  check('landing, its own impact: a crater cracked into the dust, dust rising, rock flung out', now.craters === 1 && now.dust >= 10 && now.rocks >= 12, JSON.stringify(now));
  land.c.events.clear();
  for (let i = 0; i < 60 * 6; i++) lx.update(land.c, () => land.root, 1 / 60);
  check('the rock falls and settles, the dust goes; the crater stays a while', impacts.showing.rocks === 0 && impacts.showing.dust === 0 && impacts.showing.craters === 1);
  startQuake(land.c.quakes, 0, 0, 0, 17, 18, 14, 0.6, 'tidebreaker');
  land.c.quakes[0].r = 6;
  lx.update(land.c, () => land.root, 1 / 60);
  const df = new DemonFx(new THREE.Scene());
  df.update(land.c, 1 / 60);
  const bands = df.group.children.filter((o) => o.visible).length;
  check('its shockwaves are walls of dust rolling out (its own, not the bosses’ band of light)', impacts.showing.walls === 1 && bands === 0, `${impacts.showing.walls} walls, ${bands} bands`);
}
