// Update 0.2.11 — floor 6's mini bosses (spec MD_UPDATES/U0211_SUNKEN_GROVE.md). The Manta Ray glides over you: its
// blanket (its shadow marks the spot, it drops: get out from under it; then it lies there, hits doing more), its barb
// behind it (poison), its gust (a shove). The Shark circles tighter and tighter, lunges through you; a punch on the nose
// stuns it; its death roll holds you and shakes you until you hit it hard enough; below half it frenzies.
import { check, section } from './harness';
import { at, meet, ready, run, until } from './fakes/fishMeet';
import { BARB, BLANKET, GUST } from '../src/sim/enemies/manta';
import { frenzied } from '../src/sim/enemies/shark';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { hitEnemy } from '../src/sim/enemies/enemy';
import { fishMiddle } from '../src/sim/enemies/fishSwim';
import { AIM_HEIGHT } from '../src/sim/combat/turret';
import { maxHpOf } from '../src/sim/player/health';
import { setKnob } from '../src/tuning/schema';
import { FOES6B } from '../src/tuning/foes6b';
import { Vector3 } from 'three';

const v = FOES6B.v;
const mid = new Vector3();

section('Floor 6 — the Manta Ray');
{
  const m = meet('mantaRay', at(6, 4, -6), 1);
  m.e.cooldown = 99;
  run(m, 4);
  fishMiddle(m.e, mid);
  check(`it glides over you (${v.mantaHover} m over your chest)`, Math.hypot(m.e.pos.x, m.e.pos.z) < 4 && Math.abs(mid.y - (1 + AIM_HEIGHT + v.mantaHover)) < 1, `${Math.hypot(m.e.pos.x, m.e.pos.z).toFixed(1)} m off, ${mid.y.toFixed(1)} m up`);
  ready(m);
  m.e.facing = Math.PI;
  const r = until(m, () => m.e.phase === 'stun', 4);
  check(`over you, its blanket: its shadow on the floor, then it drops on you (${v.mantaDamage})`, m.e.move === BLANKET && r.includes('mantaShadow') && r.includes('mantaDrop') && maxHpOf(m.p) - m.p.hp === v.mantaDamage);
  check(`then it lies on the floor ${v.mantaDown} s: hits do more`, m.e.phase === 'stun' && m.e.pos.y < 0.5 && ENEMY_STATS.mantaRay().stunned > 1);
  const d = meet('mantaRay', at(0, 5, -1), 1);
  d.e.cooldown = 99;
  run(d, 2);
  ready(d);
  until(d, () => d.e.phase === 'windup', 2);
  d.p.pos.set(d.e.aim.x + v.mantaRadius + 2, 1, d.e.aim.z);
  until(d, () => d.e.phase === 'stun', 4);
  check('swim out from under its shadow and it misses', d.p.hp === maxHpOf(d.p));
  const b = meet('mantaRay', at(0, 3, -2), 1);
  b.e.cooldown = 99;
  b.e.facing = 0;
  ready(b);
  const rb = until(b, () => b.e.phase === 'recover', 2);
  check('behind it, its barb: it whips and poisons you', b.e.move === BARB && rb.includes('mantaBarbWindup') && rb.includes('mantaBarb') && b.p.poison > 0);
  const g = meet('mantaRay', at(0, 3, -7), 1);
  g.e.facing = Math.PI;
  ready(g);
  const rg = until(g, () => g.e.phase === 'recover', 2, () => undefined);
  check(`in front, its gust shoves you away (${v.mantaGust} m/s)`, g.e.move === GUST && rg.includes('mantaGust') && Math.hypot(g.p.vel.x, g.p.vel.z) >= v.mantaGust * 0.8);
}

section('Floor 6 — the Shark');
{
  const m = meet('shark', at(0, 2, -14));
  m.e.cooldown = 99;
  run(m, 0.1);
  const wide = m.e.near;
  run(m, 3);
  check(`it circles you, tighter every second (from ${v.sharkRing} m)`, Math.abs(wide - v.sharkRing) < 0.3 && m.e.near < wide - 2, `${m.e.near.toFixed(1)} m`);
  setKnob(FOES6B, 'sharkRoll', 0);
  const bite = meet('shark', at(0, 2, -10));
  ready(bite);
  const r = until(bite, () => bite.e.phase === 'recover', 3);
  check(`it turns on you and lunges through you: ${v.sharkDamage}`, r.includes('sharkWindup') && r.includes('sharkLunge') && r.includes('sharkBite') && maxHpOf(bite.p) - bite.p.hp === v.sharkDamage);
  const nose = meet('shark', at(0, 2, -14));
  ready(nose);
  until(nose, () => nose.e.phase === 'charge', 3);
  hitEnemy(nose.e, v.sharkNose, 0, 0, 0);
  const rn = run(nose, 0.05);
  check('punch it on the nose as it comes: stunned, you unhurt', rn.seen.includes('sharkStun') && nose.e.phase === 'stun' && nose.p.hp === maxHpOf(nose.p));
  setKnob(FOES6B, 'sharkRoll', 1);
  const roll = meet('shark', at(0, 2, -10));
  ready(roll);
  const rr = until(roll, () => roll.e.phase === 'grab', 3);
  const held = roll.p.pos.clone();
  const shaken = run(roll, 1.3, () => roll.p.pos.x += 0.5);
  check('its death roll: it holds you where it caught you and shakes you', rr.includes('sharkRoll') && roll.e.phase === 'grab' && roll.p.pos.distanceTo(held) < 1e-6 && shaken.seen.includes('sharkShake') && shaken.lost >= v.sharkShake * 2);
  hitEnemy(roll.e, v.sharkBreak, 0, 0, 0);
  const free = run(roll, 0.05);
  check(`hit it hard enough (${v.sharkBreak}) and you’re free; it’s stunned`, free.seen.includes('sharkFree') && roll.e.phase === 'stun');
  setKnob(FOES6B, 'sharkRoll', 0.4);
  const f = meet('shark', at(0, 2, -10));
  check('not frenzied at first', !frenzied(f.e));
  f.e.hp = ENEMY_STATS.shark().hp * 0.4;
  ready(f);
  until(f, () => f.e.phase === 'windup', 3);
  until(f, () => f.e.phase !== 'windup', 3);
  check(`below ${v.sharkFrenzy * 100}%, its frenzy: shorter warnings`, frenzied(f.e) && f.e.phase === 'charge');
}
