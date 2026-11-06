// Update 0.3.68 — standing bodies keep moving. The mixer gives one action per clip, and a look with no `rise` (or, on the newer
// pack's, a `hit`) names its idle's clip for it, so that role's "play once and hold, at a rise's speed" landed on its idle:
// one play, then a statue, and the mixer stopped writing its bones. These run real frames through the real EnemiesView.
import * as THREE from 'three';
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { parseUntextured } from './fakes/glb';
import { EnemiesView } from '../src/engine/enemiesView';
import { clipOf, LOOKS, ONCE, type Role, ROLES } from '../src/engine/enemyLooks';
import { SHOW_BUILD } from '../src/sim/dungeon/kingShow';
import { moveOf } from '../src/sim/combat/execution';
import { createCombat } from '../src/sim/combat/state';
import { DEVASTATE } from '../src/sim/enemies/okamiShared';
import { JAWS } from '../src/sim/enemies/drownedKingMoves';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import type { EnemyKind } from '../src/sim/enemies/kinds';
import { BONE_KING } from '../src/tuning/boneKing';
import { FOES3 } from '../src/tuning/foes3';
import { FOES_NORSE } from '../src/tuning/foesNorse';

const DT = 1 / 60;
interface Body {
  root: THREE.Object3D;
  actions: Record<Role, THREE.AnimationAction>;
  extra: Record<string, THREE.AnimationAction>;
  role: string | null;
}
const bodyOf = (view: EnemiesView, i: number, kind: EnemyKind) => (view as unknown as { slots: { bodies: Record<string, Body> }[] }).slots[i].bodies[kind];

/** Every bone's place and turn, to compare frames. */
function poseOf(root: THREE.Object3D): number[] {
  const out: number[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Bone) out.push(...o.position.toArray(), ...o.quaternion.toArray());
  });
  return out;
}
const apart = (a: number[], b: number[]) => a.reduce((most, x, k) => Math.max(most, Math.abs(x - b[k])), 0);

const models = new Map<string, Awaited<ReturnType<typeof parseUntextured>>>();
/** A real body of `kind` alone in a view, standing at the origin. */
async function stage(kind: EnemyKind) {
  const url = LOOKS[kind]!.url;
  let g = models.get(url);
  if (!g) {
    g = await parseUntextured(new URL(`../public${url}`, import.meta.url));
    models.set(url, g);
  }
  const view = new EnemiesView(new THREE.Scene(), false, [kind]);
  view.attach(kind, g.scene, g.animations);
  const state = createCombat(OPEN_ARENA, false);
  const i = spawnEnemy(state.enemies, kind, new Vector3(0, 0, 0), 0);
  const e = state.enemies[i];
  e.prev.copy(e.pos);
  e.phase = 'roar'; // (A phase that stands, whoever it is.)
  e.move = -1;
  e.t = 0;
  const frames = (secs: number, tick = false) => {
    for (let f = 0; f < Math.round(secs / DT); f++) {
      if (tick) e.t += DT;
      view.update(state, 1, DT);
    }
  };
  frames(DT);
  return { view, state, i, e, frames, body: bodyOf(view, i, kind), root: bodyOf(view, i, kind).root };
}

section('Every look — its idle goes on, however it shares its clip');
{
  // Stand-in bodies with every clip each look names: quick enough for all of them, through the real attach and update.
  const view = new EnemiesView(new THREE.Scene(), false);
  const state = createCombat(OPEN_ARENA, false);
  const kinds = (Object.keys(LOOKS) as EnemyKind[]).filter((k) => LOOKS[k]);
  const q0 = new THREE.Quaternion();
  const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.8);
  const track = new THREE.QuaternionKeyframeTrack('Spine.quaternion', [0, 0.5, 1], [...q0.toArray(), ...q1.toArray(), ...q0.toArray()]);
  const frozen: string[] = [];
  const offPace: string[] = [];
  const wrongLoops: string[] = [];
  const onceOnIdle: string[] = [];
  const lively: string[] = [];
  for (const kind of kinds) {
    const look = LOOKS[kind]!;
    const names = new Set([...Object.values(look.clips), ...Object.values(look.moveClips ?? {}).map((m) => m[0])]);
    const model = new THREE.Object3D();
    const bone = new THREE.Bone();
    bone.name = 'Spine';
    model.add(bone);
    view.attach(kind, model, [...names].map((n) => new THREE.AnimationClip(n, 1, [track])));
    for (const e of state.enemies) e.alive = false;
    const i = spawnEnemy(state.enemies, kind, new Vector3(0, 0, 0), 0);
    const e = state.enemies[i];
    e.prev.copy(e.pos);
    e.phase = 'roar';
    e.move = -1;
    const body = bodyOf(view, i, kind);
    const run = (secs: number) => {
      for (let f = 0; f < Math.round(secs / DT); f++) view.update(state, 1, DT);
    };
    run(3.2); // Past three plays.
    const spine = body.root.getObjectByName('Spine')!;
    const a = spine.quaternion.clone();
    run(0.2);
    const b = spine.quaternion.clone();
    if (a.angleTo(b) < 1e-3) frozen.push(kind);
    run(0.8); // One whole clip after `a`, at its own pace.
    if (clipOf(look, 'move') !== look.clips.idle && a.angleTo(spine.quaternion) > 1e-2) offPace.push(kind);
    for (const role of ROLES) {
      // (Not `air`: a Raider's and a Berserker's is their swing, played once on purpose, as is a boss's leap.)
      if (role === 'air') continue;
      const sharing = clipOf(look, role) === look.clips.idle;
      const once = ONCE.includes(role) && (role === 'death' || !sharing);
      if ((body.actions[role].loop === THREE.LoopOnce) !== once || body.actions[role].clampWhenFinished !== once) wrongLoops.push(`${kind}.${role}`);
    }
    for (const [key, m] of Object.entries(look.moveClips ?? {})) if (m[0] === look.clips.idle && m[1]) onceOnIdle.push(`${kind} ${key}`);
    if (clipOf(look, 'rise') === look.clips.idle) lively.push(kind);
  }
  check(`all ${kinds.length} looks: still moving past three plays of their idle`, frozen.length === 0, frozen.join(' '));
  check('at their idle’s own pace (those whose idle isn’t also their run, which goes by their pace)', offPace.length === 0, offPace.join(' '));
  check('a role on its idle’s clip stands; a corpse and every other one-off still play once and hold', wrongLoops.length === 0, wrongLoops.join(' '));
  check('no move’s one-off clip is its idle’s', onceOnIdle.length === 0, onceOnIdle.join(' '));
  check(`most have no rise of their own (${lively.length}): it was every one of those`, lively.length > 80);
  view.dispose();
}

section('Real models — long after one play of their clip, their bones still move');
{
  // By what shared their idle: rise alone; hit too; attack too; their own rise (hit too); floors 8's and 9's bosses, as the shared fix leaves them.
  const kinds: EnemyKind[] = ['grunt', 'wraith', 'slime', 'gunner', 'skeleton', 'boneKing', 'dino', 'drownedKing', 'frostRoc', 'okami', 'tidebreaker', 'clownfish', 'hellwarden'];
  for (const kind of kinds) {
    const s = await stage(kind);
    const idle = s.body.actions.idle;
    const long = idle.getClip().duration;
    s.frames(long * 3 + 0.3);
    const a = poseOf(s.root);
    s.frames(0.2);
    const b = poseOf(s.root);
    const pace = idle.timeScale;
    check(`${kind}: three plays of its ${long.toFixed(2)} s idle later, still moving`, apart(a, b) > 1e-3 && idle.isRunning(), apart(a, b).toFixed(6));
    if (clipOf(LOOKS[kind]!, 'move') !== LOOKS[kind]!.clips.idle) check(`${kind}: at its own pace, no rise’s`, pace === 1, `${pace}`);
    s.view.dispose();
  }
}

section('A role on its idle’s clip just stands');
{
  const s = await stage('slime');
  const idle = s.body.actions.idle;
  s.frames(3);
  const was = idle.time;
  s.e.phase = 'flinch';
  s.e.t = 0;
  s.frames(DT * 10, true);
  check('a slime flinching (no hit clip): its idle carries on, no restart', near(idle.time, was + DT * 10, 1e-4) && s.body.role === 'hit', `${was.toFixed(3)} → ${idle.time.toFixed(3)}`);
  check('at full weight: no fade through its bind pose', idle.getEffectiveWeight() === 1);
  const t = idle.time;
  s.e.t = 0; // Hit again, mid-flinch.
  s.frames(DT);
  check('hit again: still no restart', near(idle.time, t + DT, 1e-4) && idle.getEffectiveWeight() === 1);
  s.e.phase = 'roar';
  s.frames(DT);
  check('back to standing, still going', near(idle.time, t + DT * 2, 1e-4) && s.body.role === 'idle');
  s.view.dispose();

  // Its aim is its idle: never "over" by its time, or it would flick to and fro between the two every loop.
  const g = await stage('gunner');
  const aim = g.body.actions.idle;
  g.frames(0.5);
  let last = aim.time;
  let jumped = 0;
  const watch = (secs: number) => {
    for (let f = 0; f < Math.round(secs / DT); f++) {
      g.e.t += DT;
      g.view.update(g.state, 1, DT);
      const step = aim.time - last + (aim.time < last ? aim.getClip().duration : 0);
      if (!near(step, DT, 1e-4) || aim.getEffectiveWeight() !== 1) jumped++;
      last = aim.time;
    }
  };
  g.e.phase = 'windup';
  g.e.t = 0;
  watch(0.6);
  g.e.phase = 'recover';
  g.e.t = 0;
  watch(2.5);
  check('a gunner aiming and recovering on its idle’s clip: smooth all through, at its own pace', jumped === 0, `${jumped} jumps`);
  g.view.dispose();

  // A move's own clip on its idle's: its stance, not fitted to the warning, and that doesn't stick.
  const d = await stage('drownedKing');
  const stand = d.body.actions.idle;
  d.frames(0.4);
  const before = stand.time;
  d.e.phase = 'windup';
  d.e.move = JAWS;
  d.e.t = 0;
  d.frames(DT * 6, true);
  check('the Drowned King through its Jaw Launch’s warning, on its Idle: carrying on at its own pace', d.body.role === 'Idle' && stand.timeScale === 1 && near(stand.time, (before + DT * 6) % 1, 1e-4), `${stand.timeScale} ${stand.time.toFixed(3)}`);
  d.view.dispose();

  const o = await stage('okami');
  const prowl = o.body.actions.idle;
  o.e.phase = 'stun';
  o.e.move = DEVASTATE;
  o.frames(DT * 3, true);
  check('Okami, its charge broken: its stance slowed, as its look says', prowl.timeScale === 0.5);
  o.e.phase = 'roar';
  o.e.move = -1;
  o.frames(DT * 3);
  check('and back at its own pace once it’s over', prowl.timeScale === 1 && prowl.isRunning());
  o.view.dispose();
}

section('A corpse still stops');
{
  for (const kind of ['clownfish', 'tentacle', 'bigShark'] as EnemyKind[]) {
    const s = await stage(kind);
    s.frames(0.5);
    s.e.phase = 'dead';
    s.e.t = 0;
    const long = s.body.actions.death.getClip().duration;
    s.frames(long + 0.5, true);
    const a = poseOf(s.root);
    s.frames(0.5, true);
    check(`${kind} (its death is its idle’s clip): plays once and holds`, s.body.actions.death !== s.body.actions.idle && apart(a, poseOf(s.root)) < 1e-6 && s.body.actions.death.paused);
    s.view.dispose();
  }
}

section('Executions are as they were (your hands follow the body’s bones)');
{
  // Its idle once, at the speed it always was, then held: `test-executions.ts` plays them through with your hands on them.
  for (const kind of ['brute', 'slime', 'jelly'] as EnemyKind[]) {
    const s = await stage(kind);
    const long = s.body.actions.idle.getClip().duration;
    check(`${kind}: its execution leaves it on its feet`, !moveOf(kind).held);
    s.frames(0.5);
    s.e.phase = 'held';
    s.e.t = 0;
    s.frames(FOES3.v.skeletonRise / 2, true);
    const stance = s.body.extra['@stood'];
    check(`${kind}: its idle once, over a Skeleton’s rise time, as ever`, s.body.role === '@stood' && near(stance.time, long / 2, long * 0.03) && stance.getEffectiveWeight() === 1, stance.time.toFixed(3));
    s.frames(FOES3.v.skeletonRise / 2 + 0.2, true);
    const a = poseOf(s.root);
    s.frames(0.5, true);
    check(`${kind}: then not a bone moves under your hands`, apart(a, poseOf(s.root)) < 1e-6);
    s.e.phase = 'roar';
    s.frames(0.3);
    const b = poseOf(s.root);
    s.frames(0.2);
    check(`${kind}: let go, it breathes again`, apart(b, poseOf(s.root)) > 1e-3 && s.body.role === 'idle');
    s.view.dispose();
  }
  // Lifted, on a run that's its idle too: one thrash, three times as fast, and held.
  const w = await stage('wraith');
  check('a wraith’s execution lifts it', moveOf('wraith').held);
  w.e.phase = 'held';
  w.e.t = 0;
  w.frames(DT, true);
  check('it thrashes at three times the pace', w.body.extra['@stood'].timeScale === 3);
  w.frames(w.body.actions.move.getClip().duration / 3 + 0.2, true);
  const a = poseOf(w.root);
  w.frames(0.5, true);
  check('once, and holds', apart(a, poseOf(w.root)) < 1e-6);
  w.view.dispose();
}

section('One-offs are as they were');
{
  // Its wind-up's blow lands on time, and its stance comes after.
  const s = await stage('grunt');
  const attack = s.body.actions.attack;
  s.e.phase = 'windup';
  s.e.t = 0;
  s.frames(DT, true);
  const look = LOOKS.grunt!;
  const windup = look.windup(0);
  check('a grunt’s swing is its own action, sped to land as its wind-up ends', attack !== s.body.actions.idle && near(attack.timeScale, look.lands / windup, 1e-9) && attack.loop === THREE.LoopOnce);
  s.frames(windup - DT, true);
  check('its blow on the end of its wind-up', near(attack.time, look.lands, 0.02), attack.time.toFixed(3));
  s.e.phase = 'recover';
  s.e.t = 0;
  s.frames(attack.getClip().duration / attack.timeScale + 0.3, true);
  check('it plays out, then it stands', s.body.role === 'idle' && attack.time >= attack.getClip().duration - 0.01);
  s.view.dispose();
}

section('Those with a rise of their own rise as they did');
{
  /** Plays its rise from the start; checks it's once, at `secs` long. */
  const rises = async (label: string, kind: EnemyKind, secs: number, begin: (e: { phase: string; move: number; t: number }) => void) => {
    const s = await stage(kind);
    const rise = s.body.actions.rise;
    const long = rise.getClip().duration;
    begin(s.e as never);
    s.frames(DT, true);
    check(`${label}: its own clip, once and held, at its knob’s speed`, rise !== s.body.actions.idle && s.body.role === 'rise' && rise.loop === THREE.LoopOnce && rise.clampWhenFinished && near(rise.timeScale, long / secs, 1e-9), `${rise.timeScale}`);
    s.frames(secs / 2 - DT, true);
    check(`${label}: halfway through its ${secs} s, halfway through its clip`, near(rise.time, long / 2, long * 0.03), `${rise.time.toFixed(3)} of ${long.toFixed(3)}`);
    s.frames(secs / 2 + 0.05, true);
    check(`${label}: at its end, on its clip’s end`, near(rise.time, long, 1e-3) && rise.paused, `${rise.time.toFixed(3)} of ${long.toFixed(3)}`);
    const a = poseOf(s.root);
    s.frames(0.5, true);
    check(`${label}: and held there`, apart(a, poseOf(s.root)) < 1e-6);
    s.view.dispose();
  };
  await rises('a Skeleton rebuilding', 'skeleton', FOES3.v.skeletonRise, (e) => {
    e.phase = 'rebuild';
    e.t = FOES3.v.skeletonDown;
  });
  await rises('the Bone King rebuilding', 'boneKing', BONE_KING.v.kingRise, (e) => {
    e.phase = 'rebuild';
    e.t = BONE_KING.v.kingDown;
  });
  await rises('the Bone King building itself in its show', 'boneKing', BONE_KING.v.showBuild, (e) => {
    e.phase = 'intro';
    e.move = SHOW_BUILD;
    e.t = 0;
  });
  await rises('a draugr out of the snow', 'draugr', FOES_NORSE.v.riseTime, (e) => {
    e.phase = 'intro';
    e.t = 0;
  });
}
