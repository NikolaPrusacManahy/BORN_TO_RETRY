// Update 0.1.0 — the Execution Power meter (the designer: a new meter just above the dash bar; "it fills up with kills,
// eg 10 kills makes it full"). Your kills fill it a tenth each; it stops at full; it comes down to the next floor with you
// and empties on a new run. What a full meter does comes later.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { stepCombat } from '../src/sim/combat/step';
import { HALF, heldFor } from '../src/sim/combat/execution';
import { FOES2 } from '../src/tuning/foes2';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { Arena, boxAt } from '../src/world/arena';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { carryOver, createCombat, resetCombat } from '../src/sim/combat/state';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { EXECUTION } from '../src/tuning/execution';
import { FEEL_LAB } from '../src/world/arenas/feelLab';

section('Execution Power meter');
{
  const c = createCombat(OPEN_ARENA, false);
  const kill = () => {
    const i = spawnEnemy(c.enemies, 'grunt', new Vector3(3, 0, 0), 0);
    const hit = emptyTargetHit();
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.copy(c.enemies[i].pos);
    landHit(c, hit, 1e6, 0, 0, 1, 'hitJab', 1);
    c.enemies[i].alive = false;
  };
  check('it starts empty', c.execution === 0);
  kill();
  check(`a kill fills a ${EXECUTION.v.killsToFill}th of it`, near(c.execution, 1 / EXECUTION.v.killsToFill, 1e-9));
  for (let k = 1; k < EXECUTION.v.killsToFill; k++) kill();
  check(`${EXECUTION.v.killsToFill} kills fill it`, near(c.execution, 1, 1e-9));
  kill();
  check('it stops at full', c.execution === 1);
  const next = createCombat(OPEN_ARENA, false);
  carryOver(c, next);
  check('it comes down to the next floor with you', next.execution === 1);
  resetCombat(next, OPEN_ARENA);
  check('a new run (or back to the start) empties it', next.execution === 0);
  // The Feel Lab's dummies aren't kills.
  const lab = createCombat(FEEL_LAB);
  const hit = emptyTargetHit();
  hit.kind = 'dummy';
  hit.index = 0;
  landHit(lab, hit, 1e6, 0, 0, 1, 'hitJab', 1);
  check('a training dummy doesn’t count', lab.execution === 0);
}

section('Execution — the snake (Update 0.1.1)');
{
  // The designer: with the meter full, E near a snake: grab its tail, the view follows, smack it on the ground, swing it
  // onto the ground, throw it away, and it one-shots it.
  const setup = (arena = OPEN_ARENA) => {
    const c = createCombat(arena);
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    c.execution = 1;
    const s = spawnEnemy(c.enemies, 'snake', new Vector3(0, 0, -1.8), 0);
    return { c, p, s };
  };
  const intent = (press = false) => {
    const i = emptyCombatIntent();
    i.interactPressed = press;
    return i;
  };
  const seen: string[] = [];
  const tick = (c: ReturnType<typeof createCombat>, p: ReturnType<typeof createPlayer>, secs: number, press = false) => {
    for (let k = 0; k < ticks(secs); k++) {
      stepCombat(c, p, intent(press && k === 0), new FlatWorld(), DT);
      for (let e = 0; e < c.events.length; e++) seen.push(c.events.at(e).kind);
      c.events.clear();
      c.hitStop.remaining = 0;
    }
  };
  {
    const { c, p, s } = setup();
    c.execution = 0.9;
    tick(c, p, DT);
    check('not before the meter is full', c.execTarget === -1);
    c.execution = 1;
    tick(c, p, DT);
    check('full, a snake in reach in front of you can be executed (it glows)', c.execTarget === s);
    p.pos.set(0, 0, -4);
    tick(c, p, DT);
    check('not one behind you', c.execTarget === -1);
  }
  const { c, p, s } = setup();
  const g = spawnEnemy(c.enemies, 'grunt', new Vector3(6, 0, -3), 0);
  const gAt = c.enemies[g].pos.clone();
  tick(c, p, DT, true);
  check('E: you grab it (the meter empties)', c.exec.active && c.enemies[s].phase === 'held' && c.execution === 0 && seen.includes('execGrab'));
  const hp = p.hp;
  let lowest = Infinity;
  let reach = 0;
  let head = Infinity;
  let close = Infinity;
  const slamLook: number[] = [];
  const eye = new Vector3(0, 1.62, 0);
  const along = new Vector3();
  let slams = 0;
  for (let k = 0; k < ticks(heldFor() - 0.02); k++) {
    tick(c, p, DT);
    // The body (tail to head) never passes through your head.
    for (let u = 0; u <= 1; u += 0.1) close = Math.min(close, along.copy(c.exec.grip).addScaledVector(c.exec.dir, u * 2 * HALF * FOES2.v.snakeHeight).distanceTo(eye));
    if (c.exec.slams > slams) slamLook.push((c.exec.lookPitch * 180) / Math.PI);
    slams = c.exec.slams;
    lowest = Math.min(lowest, c.exec.middle.y);
    // (Once it's in your hands: the grab brings its tail to them.)
    if (c.exec.t >= 0.22) reach = Math.max(reach, c.exec.grip.distanceTo(p.pos.clone().setY(1.6)));
    head = Math.min(head, c.exec.grip.y + c.exec.dir.y * 0.78);
    p.hurtTime = 0;
  }
  check('while you hold it the world stands still', c.enemies[g].pos.distanceTo(gAt) < 1e-9 && c.enemies[g].phase !== 'windup');
  check('it smacks the floor twice (each a freeze)', seen.filter((k) => k === 'execSlam').length === 2);
  check('your hands never leave arm’s reach; the body never sinks into the floor', reach < 1.6 && lowest > -0.3, `reach ${reach.toFixed(2)}, lowest ${lowest.toFixed(2)}`);
  check('at the slams its head end hits the floor', head < 0.25 && head > -0.15, `head end down to ${head.toFixed(2)} m`);
  check('it never swings through your head', close > 0.35, `${close.toFixed(2)} m at its closest`);
  check('at each slam you look down at it', slamLook.length === 2 && slamLook.every((d) => d < -20), slamLook.map((d) => d.toFixed(0)).join('°, ') + '°');
  check('nothing hurts you while you hold it', p.hp === hp && p.invuln > 0);
  tick(c, p, 0.05);
  check('then you throw it', seen.includes('execThrow') && c.exec.thrown);
  // Someone where it will land.
  const near2 = spawnEnemy(c.enemies, 'grunt', new Vector3(c.exec.land.x + 1, 0, c.exec.land.z), 0);
  c.enemies[near2].frozen = 5;
  tick(c, p, EXECUTION.v.flight + 0.05);
  check(`it lands ${EXECUTION.v.throwDistance} m ahead and dies: one shot`, seen.includes('execLand') && c.enemies[s].phase === 'dead' && near(c.enemies[s].pos.z, -EXECUTION.v.throwDistance, 0.05));
  // (The landing may kill the one beside it: that kill counts, the snake's doesn't.)
  const splashKills = c.enemies[near2].hp <= 0 ? 1 / EXECUTION.v.killsToFill : 0;
  check('your kill (its coins burst) but the meter starts again from empty', seen.includes('kill') && near(c.execution, splashKills, 1e-9) && !c.exec.active);
  check('and what’s beside where it lands is hurt', c.enemies[near2].hp < ENEMY_STATS.grunt().hp);
  // A wall 5 m ahead: it lands short of it.
  const wall: Arena = { name: 'w', boxes: [boxAt(-40, -1, -40, 80, 1, 80, 'floor'), boxAt(-10, 0, -6, 20, 6, 1, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const w = setup(wall);
  tick(w.c, w.p, DT, true);
  tick(w.c, w.p, heldFor() + 0.05);
  check('thrown at a wall, it lands short of it', w.c.exec.land.z > -5 && w.c.exec.land.z < -1, `${w.c.exec.land.z.toFixed(2)}`);
}
