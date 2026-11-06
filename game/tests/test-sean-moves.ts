// Update 0.3.81 — Gravity Sean's stances and everyday moves (enemy_bibles/Born to Retry — Gravity Sean.docx; the designer: "gravity effects on his arms for mode 1 and
// different unstable gravity for mode 2"): E, Gravity Punch and Gravity Fists, the Instability meter, its overload and its vent, Ground Slam and its plunge, the hover, the
// dash's pull, and his arms. Through stepCombat with real blows.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { carryOver } from '../src/sim/combat/carry';
import { instabFactor } from '../src/sim/combat/gravityMeter';
import { parryBossBlow } from '../src/sim/combat/meleeParry';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import type { EnemyWorld } from '../src/sim/enemies/enemy';
import type { EnemyKind } from '../src/sim/enemies/kinds';
import { emptyIntent } from '../src/sim/player/intent';
import { createPlayer } from '../src/sim/player/state';
import { stepPlayer } from '../src/sim/player/step';
import { canSlam } from '../src/sim/player/slam';
import { giveWeapon } from '../src/sim/weapons/slots';
import { holding } from '../src/sim/weapons/weapons';
import { DASH } from '../src/tuning/movement';
import { FISTS } from '../src/tuning/combat';
import { SEAN } from '../src/tuning/sean';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { SEAN_ARMS_URL, Viewmodel } from '../src/engine/viewmodel/viewmodel';
import type { Arena } from '../src/world/arena';

const v = SEAN.v;
const world = new FlatWorld();
const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };

function room(sean = true) {
  const c = createCombat(bare);
  c.sean = sean;
  const p = createPlayer(0, 0, 0, 0);
  p.sean = sean;
  p.grounded = true;
  const step = (intent: Partial<CombatIntent>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
    }
  };
  return { c, p, step };
}
const foe = (c: CombatState, x: number, z: number, kind: EnemyKind = 'grunt') => {
  const e = c.enemies[spawnEnemy(c.enemies, kind, new THREE.Vector3(x, 0, z), 0)];
  e.hp = 5000;
  return e;
};
/** Keeps a foe from moving or swinging, so only your blows count. */
const pin = (c: CombatState) => {
  for (const e of c.enemies) if (e.alive) e.frozen = 100;
};
const had = (c: CombatState, kind: string) => {
  for (let i = 0; i < c.events.length; i++) if (c.events.at(i).kind === kind) return true;
  return false;
};

section('Gravity Sean — E switches his stance');
{
  const { c, p, step } = room();
  check('he starts in normal mode', !c.grav.unstable);
  step({ interactPressed: true });
  check('E: Unstable', c.grav.unstable && had(c, 'seanUnstable'));
  step({ interactPressed: true });
  check('E again: back', !c.grav.unstable && had(c, 'seanVent'));
  check('it never hurts him', p.hp === createPlayer(0, 0, 0, 0).hp);
  const j = room(false);
  j.step({ interactPressed: true });
  check('Joseph has none of it', !j.c.grav.unstable);
}

section('Gravity Sean — left click, by his stance');
{
  const a = room();
  const far = foe(a.c, 0, -6);
  pin(a.c);
  a.step({ attackPressed: true });
  check(`Gravity Punch hits at medium distance: 6 m, past Joseph’s ${FISTS.v.reach} (${5000 - far.hp})`, far.hp === 5000 - v.punchDamage);
  check('and you see it run out', had(a.c, 'seanRipple'));
  const j = room(false);
  const out = foe(j.c, 0, -6);
  pin(j.c);
  j.step({ attackPressed: true });
  check('Joseph’s doesn’t reach it', out.hp === 5000);
  const long = room();
  const beyond = foe(long.c, 0, -(v.punchReach + 2));
  pin(long.c);
  long.step({ attackPressed: true });
  check('nor does his, past its reach', beyond.hp === 5000);
  const b = room();
  b.step({ interactPressed: true });
  const away = foe(b.c, 0, -6);
  const close = foe(b.c, 0, -2);
  pin(b.c);
  b.step({ attackPressed: true });
  check('Unstable, it’s up close: the far one’s untouched', away.hp === 5000 && near(5000 - close.hp, v.fistsDamage, 0.2));
  check('no ripple', !had(b.c, 'seanRipple'));
  const held = room();
  const dummy = foe(held.c, 0, -5);
  pin(held.c);
  held.step({ attackHeld: true }, 1);
  const hits = (5000 - dummy.hp) / v.punchDamage;
  check(`held, it keeps punching (about ${hits.toFixed(1)} a second's worth), slower than Joseph’s`, hits > 2 && hits < 1 / FISTS.v.jabInterval);
}

section('Gravity Fists — the last hit knocks back lightly');
{
  const { c, step } = room();
  step({ interactPressed: true });
  const e = foe(c, 0, -1.8);
  pin(c);
  c.grav.instab = 0;
  const seen: number[] = [];
  let was = e.hp;
  for (let i = 0; i < ticks(1) && seen.length < 3; i++) {
    step({ attackHeld: true });
    if (e.hp < was) {
      seen.push(was - e.hp);
      was = e.hp;
    }
  }
  const k = instabFactor(c.grav);
  check(`a combo of three, the last hardest (${seen.map((n) => n.toFixed(1)).join(', ')})`, seen.length === 3 && seen[2] > seen[0] && near(seen[0], v.fistsDamage, v.fistsDamage * (k - 1) + 0.5));
  check('lightly: less than Joseph’s finisher', v.fistsLastKnock < FISTS.v.finisherKnock);
}

section('The Instability meter');
{
  const a = room();
  a.step({ interactPressed: true });
  a.step({}, 2);
  check('it rises while you stay Unstable', near(a.c.grav.instab, 2 * v.instabRise, 0.01));
  const n = room();
  n.step({}, 2);
  check('not in normal mode', n.c.grav.instab === 0);
  const h = room();
  h.step({ interactPressed: true });
  const e = foe(h.c, 0, -2);
  pin(h.c);
  const before = h.c.grav.instab;
  h.step({ attackPressed: true });
  check('and as you land hits', h.c.grav.instab >= before + v.instabHit);
  const low = room();
  low.step({ interactPressed: true });
  const lf = foe(low.c, 0, -2);
  pin(low.c);
  low.step({ attackPressed: true });
  const lowHit = 5000 - lf.hp;
  const high = room();
  high.step({ interactPressed: true });
  const hf = foe(high.c, 0, -2);
  pin(high.c);
  high.c.grav.instab = 0.8;
  high.step({ attackPressed: true });
  check(`the higher it is, the harder you hit (${lowHit} → ${(5000 - hf.hp).toFixed(1)})`, 5000 - hf.hp > lowHit * 1.3);
  check('its top: the factor', near(instabFactor({ ...high.c.grav, instab: 1 }), 1 + v.instabDamage, 1e-9));
  void e;
}

section('At max, you overload');
{
  const { c, p, step } = room();
  step({ interactPressed: true });
  const e = foe(c, 0, -4);
  const beyond = foe(c, 0, -(v.overloadRadius + 3));
  pin(c);
  c.grav.instab = 0.9999;
  const hp = p.hp;
  step({}, 0.1);
  check('a big blast: it hits enemies', e.hp < 5000 - v.overloadDamage * 0.5 + 1 && had(c, 'seanOverload'));
  check('as far as it reaches', beyond.hp === 5000);
  check(`and hurts you a little (${hp - p.hp})`, near(hp - p.hp, v.overloadSelf, 0.01) && !p.dead);
  check('forced back to normal mode', !c.grav.unstable && c.grav.instab === 0);
  step({ interactPressed: true });
  check('E waits: a short cooldown', !c.grav.unstable);
  step({}, v.overloadWait);
  step({ interactPressed: true });
  check('then works', c.grav.unstable);
}

section('Switching back early vents it, safely');
{
  const blow = (instab: number) => {
    const r = room();
    r.step({ interactPressed: true });
    const near_ = foe(r.c, 0, -3);
    const far_ = foe(r.c, 0, -(v.ventRadiusFull + 1));
    pin(r.c);
    r.c.grav.instab = instab;
    const hp = r.p.hp;
    r.step({ interactPressed: true });
    return { near: 5000 - near_.hp, far: 5000 - far_.hp, hurt: hp - r.p.hp, left: r.c.grav.instab, unstable: r.c.grav.unstable };
  };
  const low = blow(0.1);
  const full = blow(0.95);
  check('no harm to you, the meter empty, normal mode', low.hurt === 0 && full.hurt === 0 && low.left === 0 && !low.unstable);
  check(`a small shockwave, bigger the fuller it was (${low.near} → ${full.near})`, low.near > 0 && full.near > low.near);
  check('small: it doesn’t reach as far as an overload', full.far === 0 && v.ventRadiusFull < v.overloadRadius);
}

section('Ctrl — Ground Slam and its plunge');
{
  const { c, step } = room();
  const e = foe(c, 0, -3);
  const beyond = foe(c, 0, -(v.slamRadius + 2));
  pin(c);
  step({ slamPressed: true });
  check('on the ground: it hits what’s near', e.hp < 5000 && beyond.hp === 5000 && had(c, 'seanSlam'));
  check('and knocks it back', e.vel.z < 0);
  const was = e.hp;
  c.events.clear();
  step({ slamPressed: true });
  check('then it waits', e.hp === was);
  step({}, v.slamWait);
  step({ slamPressed: true });
  check('and again', e.hp < was);
  const a = room();
  const f = foe(a.c, 0, -3);
  pin(a.c);
  a.p.grounded = false;
  a.step({ slamPressed: true });
  check('in the air, it’s not the ground’s', f.hp === 5000);
  a.p.slamImpact = 6;
  a.step({});
  check('landing a plunge knocks back on impact', f.hp < 5000 && f.vel.z < 0 && a.p.slamImpact === 0);
  const j = room(false);
  const g = foe(j.c, 0, -3);
  pin(j.c);
  j.p.slamImpact = 6;
  j.step({});
  check('Joseph’s slam needs Tremor, as ever', g.hp === 5000);
  const low = createPlayer(0, 0, 0, 0);
  low.grounded = false;
  low.sean = true;
  const w = { ...new FlatWorld(), rayDistance: () => v.plungeHeight + 0.1 } as unknown as FlatWorld;
  check('he can plunge from a low jump', canSlam(low, w));
  low.sean = false;
  check('Joseph needs real height', !canSlam(low, w));
}

section('Hover — jump held as you fall (a placeholder)');
{
  const fall = (sean: boolean, held: boolean, secs: number) => {
    const p = createPlayer(0, 30, 0, 0);
    p.sean = sean;
    p.grounded = false;
    p.hover = sean ? v.hoverTime : 0;
    const i = { ...emptyIntent(), jumpHeld: held };
    for (let t = 0; t < ticks(secs); t++) stepPlayer(p, i, world, [], DT);
    return p;
  };
  const off = fall(true, false, 0.5);
  const on = fall(true, true, 0.5);
  check(`he sinks slowly: ${-on.vel.y} m/s, against ${(-off.vel.y).toFixed(1)}`, near(-on.vel.y, v.hoverFall, 0.01) && -off.vel.y > v.hoverFall * 2);
  check('only for a while', -fall(true, true, v.hoverTime + 0.6).vel.y > v.hoverFall);
  check('Joseph doesn’t', -fall(false, true, 0.5).vel.y > v.hoverFall * 2);
  const back = fall(true, true, v.hoverTime + 0.1);
  back.pos.y = 0.01;
  back.vel.y = -1;
  for (let t = 0; t < ticks(0.1); t++) stepPlayer(back, emptyIntent(), world, [], DT);
  check('it’s back once he’s landed', back.grounded && near(back.hover, v.hoverTime, 1e-9));
}

section('Unstable, a dash toward an enemy pulls you to them (a placeholder)');
{
  const dash = (unstable: boolean, ex: number, ez: number, pull = 1) => {
    const r = room();
    if (unstable) r.step({ interactPressed: true });
    const e = foe(r.c, ex, ez);
    pin(r.c);
    r.p.dashTime = DASH.v.duration;
    r.p.dashDir.set(0, 0, -1);
    const was = v.dashPull;
    v.dashPull = pull;
    r.step({});
    v.dashPull = was;
    return { dir: r.p.dashDir.clone(), time: r.p.dashTime, e, pulled: had(r.c, 'seanPull') };
  };
  const a = dash(true, 1.5, -8);
  check('turned to it', a.pulled && a.dir.x > 0.1 && near(a.dir.length(), 1, 1e-6));
  check('and long enough to get there', near(a.time, Math.min(v.dashPullMax, (Math.hypot(1.5, 8) - 0.45 - v.dashPullStop) / DASH.v.speed), 0.08));
  check('in normal mode: a plain dash', !dash(false, 1.5, -8).pulled);
  check('nothing ahead: a plain dash', !dash(true, 8, 8).pulled);
  check('its knob off: a plain dash', !dash(true, 1.5, -8, 0).pulled);
}

section('Gravity Sean — his hands are his moves');
{
  const { c, p, step } = room();
  giveWeapon(c, holding('sword', 3), p.pos);
  check('no weapon’s his', c.weapon === null);
  step({ heavyHeld: true, heavyPressed: true }, 0.1);
  check('no parry from right click', c.fists.parryWindow === 0);
  const e = foe(c, 0, -2);
  pin(c);
  c.execution = 1;
  step({});
  check('no execution', c.execTarget === -1);
  const idx = c.enemies.indexOf(e);
  check('no punch out: a blow only a parry answers lands', !parryBossBlow(p, c as unknown as EnemyWorld, e, idx));
  step({ attackPressed: true });
  check('a punch thrown just now meets it (no parry of his own)', parryBossBlow(p, c as unknown as EnemyWorld, e, idx));
}

section('The meter his ultimates share');
{
  const { c, step } = room();
  const e = foe(c, 0, -5);
  pin(c);
  step({ attackPressed: true });
  check('hits fill it', near(c.grav.ult, v.ultHit, 1e-9));
  e.hp = 1;
  const before = c.grav.ult;
  step({}, 0.5);
  step({ attackPressed: true });
  check('kills more', !isLive(e) && c.grav.ult >= before + v.ultKill);
  c.grav.ult = 0.9999;
  c.events.clear();
  const f = foe(c, 0, -5);
  pin(c);
  step({}, 0.5);
  step({ attackPressed: true });
  check('full, you’re told', c.grav.ult === 1 && had(c, 'seanUltReady') && f.hp < 5000);
  const next = createCombat(bare);
  carryOver(c, next);
  check('it comes down the stairs with you', next.grav.ult === 1);
  const j = room(false);
  const g = foe(j.c, 0, -2);
  pin(j.c);
  j.step({ attackPressed: true });
  check('Joseph has none', j.c.grav.ult === 0 && g.hp < 5000);
}

section('Gravity on his arms');
{
  const scene = (await parseUntextured(new URL(`../public${SEAN_ARMS_URL}`, import.meta.url))).scene;
  const vm = new Viewmodel(false);
  const rig = ArmsRig.fromScene(scene);
  vm.attach(rig);
  vm.setLens(16 / 9);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const STEP = 1 / 120;
  const play = (secs: number) => {
    for (let t = 0; t < secs; t += STEP) vm.update(STEP, STEP, 0, 0, p, -1);
    vm.scene.updateMatrixWorld(true);
  };
  check('nothing’s made for anyone else', (vm.setGravity(0, 0), vm.gravity === null));
  vm.setGravity(1, 0);
  play(1);
  const g = vm.gravity!;
  const where = new THREE.Vector3();
  const wrist = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const m = new THREE.Matrix4();
  check('normal mode: pebbles on both arms, rings, no crackle', g.stones.visible && g.stones.count === 18 && g.rings.every((r) => r.visible) && !g.arcs.visible && g.crackling === 0);
  rig.arms.L.hand.bone.getWorldPosition(wrist);
  rig.arms.L.fore.bone.getWorldPosition(elbow);
  const dist = (i: number) => {
    g.stones.getMatrixAt(i, m);
    where.setFromMatrixPosition(m);
    const line = new THREE.Line3(wrist, elbow);
    const closest = new THREE.Vector3();
    line.closestPointToPoint(where, true, closest);
    return where.distanceTo(closest);
  };
  const spread = Array.from({ length: 9 }, (_, i) => dist(i));
  check(`they orbit round the forearm (${Math.min(...spread).toFixed(3)} to ${Math.max(...spread).toFixed(3)} m off it)`, spread.every((d) => d > 0.05 && d < 0.2));
  const fist = rig.arms.R.hand.bone.getWorldPosition(new THREE.Vector3());
  play(0.5);
  check('normal mode: the arms don’t shake', fist.distanceTo(rig.arms.R.hand.bone.getWorldPosition(new THREE.Vector3())) < 0.002);
  vm.setGravity(2, 0.1);
  play(0.5);
  check('Unstable: it crackles', g.arcs.visible && g.crackling > 0);
  const motion = (instab: number) => {
    vm.setGravity(2, instab);
    play(0.3);
    let most = 0;
    const from = rig.arms.R.hand.bone.getWorldPosition(new THREE.Vector3());
    for (let i = 0; i < 40; i++) {
      play(1 / 120);
      most = Math.max(most, from.distanceTo(rig.arms.R.hand.bone.getWorldPosition(new THREE.Vector3())));
    }
    return { most, crackling: g.crackling };
  };
  const low = motion(0.05);
  const full = motion(1);
  check(`the arms shake, harder as the meter fills (${(low.most * 1000).toFixed(1)} → ${(full.most * 1000).toFixed(1)} mm)`, low.most > 0.002 && full.most > low.most * 1.5);
  check(`more crackle too (${low.crackling} → ${full.crackling})`, full.crackling > low.crackling);
  vm.setGravity(1, 0);
  play(1);
  check('back to normal: calm again', !g.arcs.visible && g.crackling === 0 && g.stones.visible);
  vm.setGravity(0, 0);
  play(0.1);
  check('as anyone else: all gone', !g.stones.visible && !g.arcs.visible && g.rings.every((r) => !r.visible));
}
