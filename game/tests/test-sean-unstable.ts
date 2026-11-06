// Update 0.3.84 — Gravity Sean's Unstable mode, reworked by the designer: "lmb fists are 1.5 times faster"; "rmb is now the black hole, just holding it in his palm and throw it, gathering enemies that are not
// mini bosses, 7 sec cooldown"; "CTRL is a massing shockwave punch forward capable of hitting a good amount of enemies that has a 5 sec cooldown. mid air is the same". Through stepCombat with real blows; his
// hands through the game's own viewmodel: wrists sound, on screen.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { instabFactor, seanHand } from '../src/sim/combat/gravityMeter';
import { pullable, slowBosses } from '../src/sim/combat/gravityHole';
import { parryBossBlow } from '../src/sim/combat/meleeParry';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { isLive, spawnEnemy, type EnemyWorld } from '../src/sim/enemies/enemy';
import type { EnemyKind } from '../src/sim/enemies/kinds';
import { damagePlayer } from '../src/sim/player/health';
import { emptyIntent } from '../src/sim/player/intent';
import { canSlam } from '../src/sim/player/slam';
import { createPlayer } from '../src/sim/player/state';
import { stepPlayer } from '../src/sim/player/step';
import { CAMERA } from '../src/tuning/camera';
import { SEAN } from '../src/tuning/sean';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { SEAN_ARMS_URL, Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { UltimatesView } from '../src/engine/sean/ultimatesView';
import type { Arena } from '../src/world/arena';

const v = SEAN.v;
const world = new FlatWorld();
const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };

function room(unstable = true, arena = bare, withNav = false) {
  const c = createCombat(arena, withNav);
  c.sean = true;
  const p = createPlayer(0, 0, 0, 0);
  p.sean = true;
  p.grounded = true;
  const step = (intent: Partial<CombatIntent>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
    }
  };
  if (unstable) step({ interactPressed: true });
  return { c, p, step };
}
const foe = (c: CombatState, x: number, z: number, kind: EnemyKind = 'grunt', hp = 50000) => {
  const e = c.enemies[spawnEnemy(c.enemies, kind, new THREE.Vector3(x, 0, z), 0)];
  e.hp = hp;
  return e;
};
const pin = (c: CombatState) => {
  for (const e of c.enemies) if (e.alive) e.frozen = 100;
};
const had = (c: CombatState, kind: string) => {
  for (let i = 0; i < c.events.length; i++) if (c.events.at(i).kind === kind) return true;
  return false;
};
const count = (c: CombatState, ...kinds: string[]) => {
  let n = 0;
  for (let i = 0; i < c.events.length; i++) if (kinds.includes(c.events.at(i).kind)) n++;
  return n;
};
/** Held, thrown down at the floor, flown, open: its hole. */
const opened = (r: ReturnType<typeof room>, pitch = -0.25) => {
  r.step({ heavyPressed: true, heavyHeld: true });
  r.step({ heavyHeld: true }, v.palmMin);
  r.step({ pitch });
  // (Flown: only just open.)
  for (let i = 0; i < ticks(2) && r.c.grav.hole!.flying; i++) r.step({ pitch });
  return r.c.grav.hole!;
};

section('Gravity Fists — 1.5 times faster');
{
  const punches = (rate: number) => {
    const was = v.fistsRate;
    v.fistsRate = rate;
    const r = room();
    foe(r.c, 0, -1.8);
    pin(r.c);
    let n = 0;
    for (let i = 0; i < ticks(3); i++) {
      r.c.events.clear();
      r.step({ attackHeld: true });
      n += count(r.c, 'hitJab', 'hitFinisher');
    }
    v.fistsRate = was;
    return n;
  };
  const before = punches(1.1);
  const now = punches(v.fistsRate);
  check(`${v.fistsRate} against the old 1.1`, near(v.fistsRate / 1.1, 1.5, 1e-9));
  check(`held for 3 s: ${now} blows against ${before}`, near(now / before, 1.5, 0.2));
}

section('Black Hole — right click held: in his palm');
{
  const r = room();
  r.step({ heavyPressed: true, heavyHeld: true });
  check('in his palm, not yet thrown', r.c.grav.palm >= 0 && !r.c.grav.hole && r.c.grav.holeWait === 0);
  check('his hand says so', seanHand(r.c.grav) === 'palm');
  r.step({ heavyHeld: true }, 2);
  check('it stays while you hold it', r.c.grav.palm >= 1.9 && !r.c.grav.hole);
  check('he still walks free: no float, nothing untouchable', r.p.grounded && r.p.invuln === 0);
  r.step({ pitch: -0.25 });
  const h = r.c.grav.hole!;
  check('let go: thrown along your aim', !!h && h.flying && r.c.grav.palm < 0 && h.dz < -0.9 && had(r.c, 'seanHoleThrow'));
  check(`and the cooldown starts: ${v.holeWait} s, the designer’s`, r.c.grav.holeWait === v.holeWait && v.holeWait === 18);
  const tap = room();
  tap.step({ heavyPressed: true, heavyHeld: true });
  tap.step({});
  check('a tap forms it first', !tap.c.grav.hole && tap.c.grav.palm >= 0);
  tap.step({}, v.palmMin);
  check('then throws it', !!tap.c.grav.hole && tap.c.grav.palm < 0);
  const gone = room();
  gone.step({ heavyPressed: true, heavyHeld: true });
  gone.step({ interactPressed: true, heavyHeld: true });
  check('leaving Unstable mode, it goes out, with no wait to pay', gone.c.grav.palm < 0 && !gone.c.grav.hole && gone.c.grav.holeWait === 0);
  const n = room(false);
  n.step({ heavyPressed: true, heavyHeld: true });
  check('in normal mode right click’s Grab', n.c.grav.palm < 0 && !!n.c.grav.held);
}

section('Black Hole — it opens where it strikes');
{
  const floor = room();
  const h = opened(floor);
  const at = CAMERA.v.eyeHeight / Math.tan(0.25);
  check(`on the floor ${at.toFixed(1)} m off: open just short of it (${(-h.z).toFixed(1)} m), over the floor`, !h.flying && -h.z < at && -h.z > at - 2.5 && near(h.y, v.holeHeight, 0.01) && had(floor.c, 'seanHoleOpen'));
  const shot = room();
  const e = foe(shot.c, 0, -10);
  pin(shot.c);
  const onIt = opened(shot, 0.02);
  shot.step({});
  check(`on an enemy: open at it (${(-onIt.z).toFixed(1)} m), and it’s got it`, !onIt.flying && -onIt.z < 10 && -onIt.z > 7 && e.phase === 'held');
  const sky = room();
  sky.step({ heavyPressed: true, heavyHeld: true });
  sky.step({ heavyHeld: true }, v.palmMin);
  sky.step({ pitch: 0.4 });
  sky.step({ pitch: 0.4 }, v.holeRange / v.holeSpeed - 0.1);
  check('at the sky: on its way', sky.c.grav.hole!.flying);
  sky.step({}, 0.2);
  check(`and open at its range (${v.holeRange} m), down over the floor`, !sky.c.grav.hole!.flying && near(sky.c.grav.hole!.y, v.holeHeight, 0.01));
}

section('Black Hole — 18 s to the next, in either stance');
{
  const r = room();
  opened(r);
  r.c.events.clear();
  r.step({ heavyPressed: true, heavyHeld: true });
  check('pressed again: not yet', r.c.grav.palm < 0);
  r.step({}, v.holeTime + 0.5);
  check('its run’s over', !r.c.grav.hole);
  r.step({ heavyPressed: true, heavyHeld: true });
  check('still not yet', r.c.grav.palm < 0 && r.c.grav.holeWait > 0);
  r.c.grav.instab = 0;
  r.step({ interactPressed: true });
  check('it counts in normal mode too', !r.c.grav.unstable);
  const left = r.c.grav.holeWait;
  r.step({}, 1);
  check(`(${left.toFixed(1)} → ${r.c.grav.holeWait.toFixed(1)} s)`, near(r.c.grav.holeWait, left - 1, 0.02));
  r.step({}, left);
  r.step({ interactPressed: true });
  r.step({ heavyPressed: true, heavyHeld: true });
  check('then it’s back', r.c.grav.palm >= 0);
}

section('Black Hole — gathers them, hurts them, bursts');
{
  const r = room();
  const h = opened(r);
  const close = foe(r.c, h.x, h.z + 5);
  const far = foe(r.c, h.x + 9, h.z);
  const out = foe(r.c, h.x + v.holeReach + 8, h.z);
  out.frozen = 100;
  const d0 = Math.hypot(far.pos.x - h.x, far.pos.z - h.z);
  r.step({}, 1);
  const d1 = Math.hypot(far.pos.x - h.x, far.pos.z - h.z);
  check(`gathered in (${d0.toFixed(1)} → ${d1.toFixed(1)} m in a second), held while they are`, d1 < d0 - 3 && far.phase === 'held' && close.phase === 'held');
  check('they leave the floor', far.pos.y > 0.3);
  check(`it hurts them over time (${(50000 - close.hp).toFixed(1)} in a second)`, near(50000 - close.hp, v.holeDps * h.power, v.holeDps));
  check('too far off: nothing', out.hp === 50000 && out.phase !== 'held');
  r.p.pos.set(h.x, 0, h.z + 2);
  const inPunch = foe(r.c, h.x + v.holeReach + 3, h.z + 2);
  inPunch.frozen = 100;
  check('he can be hurt while it runs', damagePlayer(r.p, 5, 'turret'));
  r.p.hurtTime = 0;
  r.p.pos.set(0, 0, 0);
  const before = close.hp;
  r.step({}, v.holeTime - 1 + 0.1);
  check(`then it bursts, harder (${(before - close.hp).toFixed(0)} from there on)`, had(r.c, 'seanHoleBurst') && before - close.hp >= v.holeBlastDamage * 0.5);
  check('flinging them, and they’re let go', close.phase !== 'held' && far.phase !== 'held' && (Math.hypot(close.vel.x, close.vel.z) > 3 || Math.hypot(far.vel.x, far.vel.z) > 3));
  check('it’s over', r.c.grav.hole === null);
  const k = room();
  const hk = opened(k);
  const dies = foe(k.c, hk.x, hk.z + 4, 'grunt', 40);
  k.step({}, v.holeTime + 0.3);
  check('a grunt doesn’t outlast it', !isLive(dies));
  const hot = room();
  hot.c.grav.instab = 0.75;
  const hh = opened(hot);
  check('thrown at high Instability it’s harder', near(hh.power, instabFactor({ ...hot.c.grav, instab: 0.75 }), 0.2) && hh.power > 1.3);
  const free = room();
  const hf = opened(free);
  const hit = foe(free.c, hf.x + v.holeReach + 3, 0);
  void hit;
  free.c.grav.instab = 0;
  const f = foe(free.c, 0, 1.5);
  f.frozen = 100;
  f.perch = 0.01;
  const hp = f.hp;
  free.step({ attackPressed: true, yaw: Math.PI });
  check('and his fists are free while it runs', f.hp < hp);
  const left = room();
  const hl = opened(left);
  left.step({ interactPressed: true });
  check('left behind in normal mode, it runs on', !left.c.grav.unstable && !!left.c.grav.hole && !left.c.grav.hole.flying);
  void hl;
  left.step({}, v.holeTime + 0.1);
  check('to its end', !left.c.grav.hole);
}

section('Black Hole — mini-bosses aren’t gathered; bosses only slowed');
{
  check('who it pulls', pullable(foe(createCombat(bare), 0, 0)) && !pullable(foe(createCombat(bare), 0, 0, 'bigMushnub')) && !pullable(foe(createCombat(bare), 0, 0, 'dragon')));
  const m = room();
  const hm = opened(m);
  const mini = foe(m.c, hm.x + 5, hm.z, 'bigMushnub');
  mini.frozen = 100;
  const from = Math.hypot(mini.pos.x - hm.x, mini.pos.z - hm.z);
  m.step({}, 1);
  check('a mini-boss stays where it was, and isn’t held', near(Math.hypot(mini.pos.x - hm.x, mini.pos.z - hm.z), from, 0.05) && mini.phase !== 'held');
  const b = room();
  const hb = opened(b);
  const boss = foe(b.c, hb.x + 5, hb.z, 'boneKing');
  boss.frozen = 100;
  b.step({}, 0.5);
  check('a boss isn’t pulled or held', near(boss.pos.x, hb.x + 5, 0.01) && boss.phase !== 'held');
  boss.prev.copy(boss.pos);
  const was = boss.pos.x;
  boss.pos.x += 1;
  slowBosses(b.c);
  check('it loses a share of its walking', near(boss.pos.x - was, 1 - v.holeBossSlow, 1e-6));
  const off = room();
  const far = foe(off.c, 0, 0, 'boneKing');
  far.prev.copy(far.pos);
  far.pos.x += 1;
  slowBosses(off.c);
  check('with no hole open: none', near(far.pos.x, 1, 1e-6));
}

section('Shockwave Punch — Ctrl in Unstable mode');
{
  const r = room();
  const close = foe(r.c, 0, -3);
  const side = foe(r.c, 3.5, -8);
  const end = foe(r.c, 0, -(v.shockRange - 1));
  const behind = foe(r.c, 0, 5);
  const wide = foe(r.c, 9, -2);
  const past = foe(r.c, 0, -(v.shockRange + 3));
  pin(r.c);
  r.step({ slamPressed: true });
  check('his fist’s drawn back: nothing yet', r.c.grav.shock >= 0 && seanHand(r.c.grav) === 'wind' && close.hp === 50000 && had(r.c, 'seanShockUp'));
  r.step({}, v.shockWindup + DT);
  check(`a good amount of enemies: all three ahead (${50000 - close.hp}, ${50000 - side.hp}, ${50000 - end.hp})`, close.hp < 50000 && side.hp < 50000 && end.hp < 50000 && had(r.c, 'seanShock'));
  check('hardest close to', 50000 - close.hp > 50000 - end.hp);
  check('nothing behind, wide of it or past its reach', behind.hp === 50000 && wide.hp === 50000 && past.hp === 50000);
  check('thrown away along your aim', close.vel.z < -3 && Math.abs(close.vel.x) < 1);
  check('it throws you back', r.p.vel.z > 1);
  const was = close.hp;
  r.c.events.clear();
  r.step({ slamPressed: true });
  r.step({}, v.shockWindup + DT);
  check(`then ${v.shockWait} s, the designer’s`, close.hp === was && !had(r.c, 'seanShock') && v.shockWait === 5);
  r.step({}, v.shockWait);
  r.step({ slamPressed: true });
  r.step({}, v.shockWindup + DT);
  check('and again', close.hp < was);
  const hot = room();
  const hf = foe(hot.c, 0, -3);
  pin(hot.c);
  hot.c.grav.instab = 0.8;
  hot.step({ slamPressed: true });
  hot.step({}, v.shockWindup + DT);
  check('Instability makes it harder', 50000 - hf.hp > 50000 - was - 1 || 50000 - hf.hp > v.shockDamage);
  const k = room();
  const dies = foe(k.c, 0, -3, 'grunt', 10);
  pin(k.c);
  k.step({ slamPressed: true });
  k.step({}, v.shockWindup + DT);
  check('it kills', !isLive(dies));
  const blow = room();
  const bb = foe(blow.c, 0, -3);
  pin(blow.c);
  blow.step({ slamPressed: true });
  blow.step({}, v.shockWindup + DT);
  check('it meets the blows only a parry answers, as a punch does', parryBossBlow(blow.p, blow.c as unknown as EnemyWorld, bb, blow.c.enemies.indexOf(bb)));
}

section('Shockwave Punch — a wall stops it; normal mode’s Ctrl is still Ground Slam');
{
  const floorBox = { x: 0, y: -0.5, z: 0, w: 60, h: 1, d: 60, kind: 'floor' as const };
  const wallBox = { x: 0, y: 2, z: -6, w: 60, h: 4, d: 1, kind: 'block' as const };
  const walled: Arena = { ...bare, boxes: [floorBox, wallBox] };
  const r = room(true, walled, true);
  const hidden = foe(r.c, 0, -10);
  const seen = foe(r.c, 0, -3);
  pin(r.c);
  r.step({ slamPressed: true });
  r.step({}, v.shockWindup + DT);
  check('behind the wall: nothing', hidden.hp === 50000 && seen.hp < 50000);
  const n = room(false);
  const e = foe(n.c, 0, -3);
  pin(n.c);
  n.step({ slamPressed: true });
  check('normal mode: Ground Slam, at once', n.c.grav.shock < 0 && had(n.c, 'seanSlam') && e.hp < 50000 && n.c.grav.shockWait === 0);
}

section('Shockwave Punch — mid air is the same');
{
  const r = room();
  r.p.grounded = false;
  r.p.pos.y = 6;
  r.p.vel.y = -8;
  const e = foe(r.c, 0, -6);
  pin(r.c);
  const pitch = -Math.atan2(6 + CAMERA.v.eyeHeight - 0.8, 6);
  r.step({ slamPressed: true, pitch });
  r.step({ pitch }, v.shockWindup + DT);
  check(`it hits as it does on the ground (${50000 - e.hp})`, e.hp < 50000 && had(r.c, 'seanShock'));
  check('and holds you up a moment', r.p.vel.y >= v.shockLift - 0.01);
  check('no plunge', !canSlam(r.p, world) && !r.p.slamming);
  const i = { ...emptyIntent(), slamPressed: true };
  r.p.grounded = false;
  r.p.pos.y = 6;
  stepPlayer(r.p, i, world, [], DT);
  check('Ctrl doesn’t start one', !r.p.slamming);
  const n = room(false);
  n.p.grounded = false;
  n.p.pos.y = 6;
  n.step({});
  check('in normal mode it does', canSlam(n.p, world));
}

section('His hand, for them');
{
  const scene = (await parseUntextured(new URL(`../public${SEAN_ARMS_URL}`, import.meta.url))).scene;
  const vm = new Viewmodel(false);
  const rig = ArmsRig.fromScene(scene);
  vm.attach(rig);
  vm.setLens(16 / 9);
  vm.setGravity(2, 0.2);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const play = (secs: number) => {
    for (let t = 0; t < secs; t += 1 / 120) vm.update(1 / 120, 1 / 120, 0, 0, p, -1);
    vm.scene.updateMatrixWorld(true);
  };
  const wrist = (side: 'L' | 'R') => {
    const a = rig.arms[side];
    const el = a.fore.bone.getWorldPosition(new THREE.Vector3());
    const wr = a.hand.bone.getWorldPosition(new THREE.Vector3());
    const kn = a.knuckle.getWorldPosition(new THREE.Vector3());
    return THREE.MathUtils.radToDeg(wr.clone().sub(el).normalize().angleTo(kn.clone().sub(wr).normalize()));
  };
  const onScreen = (side: 'L' | 'R') => {
    const at = rig.arms[side].knuckle.getWorldPosition(new THREE.Vector3()).project(vm.camera);
    return Math.abs(at.x) < 1 && Math.abs(at.y) < 1;
  };
  check('with nothing to hold: no orb', (play(0.3), !vm.gravity!.orb.visible));
  vm.seanHands.set('palm');
  play(1);
  check(`Black Hole: the right hand up and open, wrist sound (${wrist('R').toFixed(0)}°), on screen`, vm.seanHands.weight.R > 0.95 && vm.seanHands.open > 0.9 && wrist('R') < 45 && onScreen('R'));
  check('the orb on it', vm.gravity!.orb.visible);
  check('the left stays in its guard', vm.seanHands.weight.L < 0.02);
  vm.seanHands.set('none');
  play(1);
  check('thrown: it’s gone', !vm.gravity!.orb.visible);
  vm.seanHands.set('wind');
  play(0.14);
  check(`Shockwave Punch, drawn back: closed, wrist sound (${wrist('R').toFixed(0)}°), on screen`, vm.seanHands.open < 0.05 && vm.seanHands.weight.R > 0.9 && wrist('R') < 45 && onScreen('R'));
  const back = rig.arms.R.knuckle.getWorldPosition(new THREE.Vector3());
  vm.seanHands.set('none');
  vm.seanHands.strike();
  play(0.12);
  const out = rig.arms.R.knuckle.getWorldPosition(new THREE.Vector3());
  const ahead = (o: THREE.Vector3) => vm.camera.worldToLocal(o.clone()).z;
  check(`driven out, well ahead of where it was (${(ahead(back) - ahead(out)).toFixed(2)} m), wrist sound (${wrist('R').toFixed(0)}°), on screen`, ahead(back) - ahead(out) > 0.1 && wrist('R') < 45 && onScreen('R'));
  check('a fist', vm.seanHands.open < 0.05);
  play(1);
  check('and back', vm.seanHands.weight.R < 0.02);
}

section('What it shows');
{
  const view = new UltimatesView(new THREE.Scene());
  const r = room();
  r.step({ heavyPressed: true, heavyHeld: true });
  view.update(r.c, DT);
  check('in his palm: nothing in the world yet', !view.showing.hole);
  r.step({ heavyHeld: true }, v.palmMin);
  r.step({ pitch: -0.25 });
  view.update(r.c, DT);
  check('in flight: it shows', view.showing.hole);
  r.step({ pitch: -0.25 }, 1);
  view.update(r.c, DT);
  check('open: it shows', view.showing.hole && !r.c.grav.hole!.flying);
  r.step({}, v.holeTime);
  view.update(r.c, DT);
  check('burst: gone', !view.showing.hole);
  view.dispose();
}
