// Update 0.3.77 — The Swarm's Abyssal Stare, by real blows (the designer: "the Hit the pupil thing with the Swarm boss is not achievable at all, in either Joseph or Demon... the fix is that we just hit
// the eye - that is it"). It had a test that handed a blow a perfect place to land, so it passed while no real blow could ever do it: these throw real ones, as you would, from the floor.
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { bladeWindup, THROW } from '../src/sim/combat/bladeSwing';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { swarmEyeHeight } from '../src/sim/enemies/swarmHits';
import { startStare, STARE_CUE } from '../src/sim/enemies/swarmMoves';
import { createPlayer } from '../src/sim/player/state';
import { CAMERA } from '../src/tuning/camera';
import { DEMON } from '../src/tuning/demon';
import { SWARM } from '../src/tuning/swarm';
import type { Arena } from '../src/world/arena';

const v = SWARM.v;
const world = new FlatWorld();

/** You, `far` m from The Swarm, it through the first of its stare, and how to aim at it from there. */
function stare(far: number, demon: boolean) {
  const arena: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const c = createCombat({ ...arena, stands: [] });
  c.demon = demon;
  const p = createPlayer(0, 0, far, 0);
  p.grounded = true;
  p.demon = demon;
  const e = c.enemies[spawnEnemy(c.enemies, 'swarm', new Vector3(0, 0, 0), 0)];
  e.cooldown = 99;
  const step = (intent: Partial<ReturnType<typeof emptyCombatIntent>>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      p.hp = 100;
      p.pos.set(0, 0, far);
      p.vel.set(0, 0, 0);
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
      c.events.clear();
    }
  };
  step({}, 0.3);
  startStare(e, 0, c);
  // It's up by now.
  e.ult.left = e.ult.window = 99;
  step({}, 1.5);
  const aim = { yaw: 0, pitch: Math.atan2(e.pos.y + swarmEyeHeight() - CAMERA.v.eyeHeight, far) };
  return { c, p, e, step, aim };
}

section('The Swarm — its stare, by real blows');
{
  check('its cue says what to do', STARE_CUE === 'HIT THE EYE');
  const look = stare(3, false);
  check(`it’s up, in its stare: its eye ${(look.e.pos.y + swarmEyeHeight()).toFixed(1)} m up, a fist reaching about ${(CAMERA.v.eyeHeight + 2.9).toFixed(1)} m`, look.e.ult.on && look.e.pos.y > 0.5 && look.e.pos.y + swarmEyeHeight() < CAMERA.v.eyeHeight + 2.9);
  for (const far of [1.5, 3, 4.5]) {
    const j = stare(far, false);
    j.step({ attackPressed: true, ...j.aim });
    check(`Joseph’s punch, ${far} m off: it counts`, j.e.ult.fill === 1);
  }
  const whiff = stare(16, false);
  whiff.step({ attackPressed: true, ...whiff.aim });
  check('too far off to reach: no', whiff.e.ult.fill === 0);
  const hp = stare(3, false);
  const before = hp.e.hp;
  hp.step({ attackPressed: true, ...hp.aim });
  check('it hurts it none', hp.e.hp === before);

  // Three, and it's broken.
  const three = stare(3, false);
  for (let i = 0; i < 40 && three.e.ult.on; i++) {
    three.step({ attackPressed: true, ...three.aim });
    three.step(three.aim, 0.3);
  }
  check(`${v.stareShots} punches and it’s broken`, !three.e.ult.on && three.e.phase === 'stun');
}

section('The Swarm — its stare, the Demon’s blows');
{
  const a = stare(3, true);
  a.step({ attackPressed: true, ...a.aim });
  a.step(a.aim, DEMON.v.slashWindup + 2 * DT);
  check('a swing counts', a.e.ult.fill === 1);
  const far = stare(5, true);
  far.step({ attackPressed: true, ...far.aim });
  far.step(far.aim, DEMON.v.slashWindup + 2 * DT);
  check('its reach is further than a fist’s: 5 m off', far.e.ult.fill === 1);
  const r = stare(9, true);
  r.step({ interactPressed: true, ...r.aim });
  r.step({ attackPressed: true, ...r.aim });
  r.step(r.aim, DEMON.v.shotWindup + 0.4);
  check('in ranged mode, a crescent counts', r.e.ult.fill >= 1);
  const t = stare(10, true);
  t.step({ heavyPressed: true, ...t.aim });
  t.step(t.aim, bladeWindup(THROW) + 0.5);
  check('its thrown sword counts', t.e.ult.fill >= 1);

  const three = stare(3, true);
  for (let i = 0; i < 40 && three.e.ult.on; i++) {
    three.step({ attackPressed: true, ...three.aim });
    three.step(three.aim, 0.4);
  }
  check(`${v.stareShots} swings and it’s broken, with no parry to send a tear back`, !three.e.ult.on && three.e.phase === 'stun');

  const b = stare(3, true);
  b.c.demonFire.walls.push({ ax: -3, az: 0, bx: 3, bz: 0, y: 2, left: 3, burn: 0 });
  const fill = b.e.ult.fill;
  b.step(b.aim, 0.2);
  check('a fire wall’s burn doesn’t count', b.e.ult.fill === fill);

  // Last Verdict: more than a hit on its eye.
  const q = stare(3, true);
  q.c.blade.heat = 1;
  q.step({ throwPressed: true, ...q.aim });
  q.step(q.aim, DEMON.v.verdictWindup + DEMON.v.verdictHold + 0.1);
  check('Last Verdict breaks its stare at once', !q.e.ult.on && q.e.phase === 'stun');
}

section('The Swarm — Last Verdict takes its share, past its worms');
{
  const arena: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const c = createCombat({ ...arena, stands: [] });
  c.demon = true;
  const p = createPlayer(0, 0, 8, 0);
  p.grounded = true;
  p.demon = true;
  const e = c.enemies[spawnEnemy(c.enemies, 'swarm', new Vector3(0, 0, 0), 0)];
  e.cooldown = 99;
  const go = (intent: Partial<ReturnType<typeof emptyCombatIntent>>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      p.hp = 100;
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
      c.events.clear();
    }
  };
  go({}, 0.3);
  const full = e.hp;
  c.blade.heat = 1;
  go({ throwPressed: true });
  go({}, DEMON.v.verdictWindup + DEMON.v.verdictHold + DT);
  check(`it loses ${DEMON.v.verdictBoss * 100}% of its full health (${full} to ${e.hp})`, Math.abs(e.hp - full * (1 - DEMON.v.verdictBoss)) < 1);
}
