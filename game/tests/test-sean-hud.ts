// Update 0.3.87 — Gravity Sean's HUD (the designer: "his UI needs to correspond better since there is a lot of cooldown on his kit"). What it's told through a real run of his moves, and what it draws, as HTML.
import * as THREE from 'three';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { copySeanHud, createSeanHud, sameSeanHud, seanHud } from '../src/sim/combat/gravityHud';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { createPlayer } from '../src/sim/player/state';
import { SEAN } from '../src/tuning/sean';
import { createHudStore, type HudState } from '../src/engine/hudStore';
import { SeanControls } from '../src/screens/SeanControls';
import type { Arena } from '../src/world/arena';

const v = SEAN.v;
const world = new FlatWorld();
const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };

function room() {
  const c = createCombat(bare);
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
  const hud = () => seanHud(c.grav, !p.grounded, createSeanHud());
  return { c, p, step, hud };
}
const had = (c: ReturnType<typeof room>['c'], kind: string) => {
  for (let i = 0; i < c.events.length; i++) if (c.events.at(i).kind === kind) return true;
  return false;
};

section('His waits — by the stance he’s in');
{
  const r = room();
  const fresh = r.hud();
  check('all ready', fresh.rmb.left === 0 && fresh.ctrl.left === 0 && fresh.e.left === 0 && fresh.rmb.fill === 1 && fresh.otherRmb === 0 && fresh.otherCtrl === 0);
  r.step({ slamPressed: true });
  const slam = r.hud();
  check(`Ground Slam just used: ${slam.ctrl.left} s left, a clock at its start`, near(slam.ctrl.left, v.slamWait, 0.11) && slam.ctrl.fill < 0.05);
  r.step({}, v.slamWait / 2);
  const mid = r.hud();
  check(`half way: ${mid.ctrl.left} s, half full (${mid.ctrl.fill})`, near(mid.ctrl.left, v.slamWait / 2, 0.11) && near(mid.ctrl.fill, 0.5, 0.05));
  r.step({}, v.slamWait);
  check('back', r.hud().ctrl.left === 0 && r.hud().ctrl.fill === 1);
  const air = room();
  air.step({ slamPressed: true });
  air.p.grounded = false;
  check('in the air Ctrl’s a plunge, with no wait', air.hud().ctrl.left === 0);
}

section('His waits — Black Hole and Shockwave Punch, from either stance');
{
  const r = room();
  r.step({ interactPressed: true });
  r.step({ heavyPressed: true, heavyHeld: true });
  r.step({ heavyHeld: true }, v.palmMin);
  r.step({ pitch: -0.25 });
  r.step({ slamPressed: true });
  const u = r.hud();
  check(`Unstable: Black Hole ${u.rmb.left} s, Shockwave Punch ${u.ctrl.left} s`, near(u.rmb.left, v.holeWait, 0.11) && near(u.ctrl.left, v.shockWait, 0.11));
  r.c.grav.slamWait = 1;
  check('and it says what Ground Slam still has to wait', near(r.hud().otherCtrl, 1, 0.11));
  r.c.grav.slamWait = 0;
  r.c.grav.instab = 0;
  r.step({ interactPressed: true });
  const n = r.hud();
  check(`normal mode: its keys are clear (Grab’s wait’s too short to read)`, n.rmb.left === 0);
  check(`and it says what’s waiting in Unstable: ${n.otherRmb} s, ${n.otherCtrl} s`, n.otherRmb > 0 && n.otherCtrl > 0);
  const was = n.otherRmb;
  r.step({}, 1);
  check('they run while he’s not in that stance', near(r.hud().otherRmb, was - 1, 0.11));
  const o = room();
  o.c.grav.switchWait = v.overloadWait;
  check(`E after an overload: ${o.hud().e.left} s`, near(o.hud().e.left, v.overloadWait, 0.11));
}

section('His waits — never says 0 too soon, and changes only when what you’d read does');
{
  const a = room();
  a.c.grav.shockWait = 0.01;
  a.c.grav.unstable = true;
  check('a hair left: 0.1, not 0', a.hud().ctrl.left === 0.1);
  const before = a.hud();
  check('the same twice: nothing to redraw', sameSeanHud(before, a.hud()));
  const copy = copySeanHud(before);
  a.c.grav.shockWait = 3;
  check('a copy doesn’t follow it', !sameSeanHud(copy, a.hud()) && copy.ctrl.left === 0.1);
  a.c.grav.shockWait = 2.99;
  const x = a.hud();
  a.c.grav.shockWait = 2.991;
  check('within a tenth: the same', x.ctrl.left === a.hud().ctrl.left);
}

section('His waits — you hear the long ones come back');
{
  const r = room();
  r.c.grav.holeWait = 0.02;
  r.step({}, 0.05);
  check('Black Hole', had(r.c, 'seanReady'));
  const s = room();
  s.c.grav.shockWait = 0.02;
  s.step({}, 0.05);
  check('Shockwave Punch', had(s.c, 'seanReady'));
  const n = room();
  n.step({}, 0.5);
  check('not with nothing waiting', !had(n.c, 'seanReady'));
}

section('Grab held, and Time Stop');
{
  const r = room();
  r.step({ pitch: -0.3, heavyPressed: true, heavyHeld: true });
  check('held: its clock’s how far it’s gathered', r.hud().gather === 0);
  r.step({ heavyHeld: true }, v.gatherTime / 2);
  const half = r.hud().gather;
  check(`(${half})`, near(half, 0.4, 0.15));
  r.step({ heavyHeld: true }, v.gatherTime);
  check('full', r.hud().gather === 1);
  r.step({}, v.grabRise);
  check('thrown: none', r.hud().gather === 0);
  const t = room();
  t.c.grav.ult = 1;
  check('no Time Stop: nothing', t.hud().stopLeft === 0 && t.hud().stopFill === 0);
  t.step({ throwPressed: true });
  const on = t.hud();
  check(`on: ${on.stopLeft} s, all of it`, near(on.stopLeft, v.stopTime, 0.11) && near(on.stopFill, 1, 0.03));
  t.step({}, v.stopTime / 2);
  check('half way', near(t.hud().stopFill, 0.5, 0.03));
  t.step({}, v.stopTime);
  check('over', t.hud().stopLeft === 0);
}

section('What it draws');
{
  const base = (): HudState => ({ ...createHudStore().get(), sean: true, attackKey: 'LMB', heavyKey: 'RMB', interactKey: 'E', dashKey: 'SHIFT', slamKey: 'CTRL', throwKey: 'Q' });
  const draw = (s: HudState) => renderToStaticMarkup(createElement(SeanControls, { s }));
  const n = draw(base());
  check('normal mode: its moves', ['Gravity Punch', 'Grab', 'Unstable', 'Dash', 'Ground Slam', 'Time Stop'].every((w) => n.includes(w)));
  check('and every key', ['LMB', 'RMB', '>E<', 'SHIFT', 'CTRL', '>Q<'].every((w) => n.includes(w)));
  const u = draw({ ...base(), unstable: true });
  check('Unstable: its moves', ['Gravity Fists', 'Black Hole', 'Vent', 'Dash', 'Shockwave Punch', 'Meteor'].every((w) => u.includes(w)));
  const air = draw({ ...base(), inAir: true });
  check('in the air, normal mode: Plunge', air.includes('Plunge'));
  check('nothing waiting: only Q’s clock, the meter', (n.match(/rb-sean-ring/g) ?? []).length === 1 && !n.includes('rb-sean-other'));
  const hud = createSeanHud();
  hud.rmb = { left: 4.2, fill: 0.4 };
  hud.ctrl = { left: 2.5, fill: 0.5 };
  const cool = draw({ ...base(), unstable: true, seanHud: hud });
  check('waiting: a clock on each, with its seconds', cool.includes('<b>4.2</b>') && cool.includes('<b>2.5</b>') && (cool.match(/rb-sean-ring/g) ?? []).length === 3);
  check('its fill', cool.includes('--ctl:0.4'));
  check('its name dimmed', (cool.match(/is-off/g) ?? []).length === 3);
  const other = createSeanHud();
  other.otherRmb = 3.1;
  other.otherCtrl = 1.2;
  const o = draw({ ...base(), seanHud: other });
  check('what’s waiting in the other stance, by name', o.includes('Black Hole 3.1') && o.includes('Shockwave Punch 1.2'));
  const ou = draw({ ...base(), unstable: true, seanHud: { ...createSeanHud(), otherCtrl: 0.9 } });
  check('and from Unstable', ou.includes('Ground Slam 0.9'));
  check('Q filling: its percent', draw({ ...base(), execution: 0.37 }).includes('<b>37</b>'));
  const ready = draw({ ...base(), execution: 1 });
  check('Q full: it says so, no clock', ready.includes('is-ready') && !ready.includes('rb-sean-ring'));
  const gather = createSeanHud();
  gather.gather = 0.5;
  check('a piece held: Throw, with its clock', draw({ ...base(), seanHold: 1, seanHud: gather }).includes('Throw') && draw({ ...base(), seanHold: 1, seanHud: gather }).includes('--ctl:0.5'));
  check('Black Hole in his palm: Throw', draw({ ...base(), unstable: true, seanHold: 2 }).includes('Throw'));
  const stop = createSeanHud();
  stop.stopLeft = 3.4;
  stop.stopFill = 0.68;
  const st = draw({ ...base(), seanHud: stop });
  check('Time Stop running: Q’s clock is its seconds', st.includes('<b>3.4</b>') && st.includes('--ctl:0.68'));
  void THREE;
}
