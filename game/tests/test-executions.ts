// Update 0.1.2 — every enemy's execution (the designer's list, MD_UPDATES/U012_EXECUTIONS.md), played and drawn as the
// game does it (tests/fakes/execRig.ts, the real models): E grabs it and empties the meter; nothing hurts you while it's
// in your hands; your hands do the move; every blow and slam lands; it dies (thrown and landing, or where it is) as one
// kill; a torn or chopped piece comes off and the body is left without it; a burst leaves no body, only its pieces; a
// smashed or flattened one stays as it was left; the frog's tongue reaches your hand; the wizard is thrown at the
// nearest wall and bursts there. Update 0.1.3 — your fists never pass through each other.
// Update 0.1.8 — the slime's and the spider's smash are the ground slam's: the same clasped fists, up and down.
import * as THREE from 'three';
import { check, section } from './harness';
import { DT } from './fakes/flatWorld';
import { execRig } from './fakes/execRig';
import { moveOf } from '../src/sim/combat/execution';
import { EXECUTABLE } from '../src/sim/combat/execMoves';
import { EXEC_LOOKS } from '../src/engine/exec/looks';
import { boneOf } from '../src/engine/exec/bones';
import type { EnemyKind } from '../src/sim/enemies/kinds';
import { Arena, boxAt } from '../src/world/arena';
import { HAND_MOVES } from '../src/engine/exec/handMoves';
import { ARMS } from '../src/tuning/arms';
import { DT as STEP } from './fakes/flatWorld';
import { clock } from '../src/engine/exec/execScene';
import { slamEase } from '../src/engine/viewmodel/slamArms';

const visiblePieces = (group: THREE.Object3D) => group.children.filter((c) => c.visible && c.type === 'Group').length;

for (const kind of EXECUTABLE) {
  section(`Execution — ${kind}`);
  const r = await execRig(kind as EnemyKind);
  const move = moveOf(kind);
  const look = EXEC_LOOKS[kind] ?? {};
  const hp = r.p.hp;
  r.step();
  check('E: it’s grabbed, the meter empties', r.c.exec.active && r.c.enemies[r.s].phase === 'held' && r.c.execution === 0);
  let hands = 0;
  let safe = true;
  let piecesSeen = 0;
  let tongue = false;
  // While its body's there (the corpse lasts its death time): a cut piece stays off it; a burst one stays gone.
  const names = (look.cuts ?? []).flatMap((c) => c.pieces.flatMap((p) => look.pieces![p]));
  const lastCut = Math.max(0, ...(look.cuts ?? []).map((c) => c.t));
  let cutSeen = 0;
  let cutOk = true;
  let goneSeen = 0;
  let goneOk = true;
  // Update 0.1.3 — your fists never pass through each other (the clasped hammer's sit side by side, touching).
  const kl = new THREE.Vector3();
  const kr = new THREE.Vector3();
  let closest = Infinity;
  let closestSlam = Infinity;
  let clasped = 0;
  const end = move.endAt + (move.end === 'burst' ? 0 : r.c.exec.flight || 2.5) + 0.3;
  for (let t = DT; t < end + 0.6; t += DT) {
    r.step();
    const ex = r.c.exec;
    const body = r.c.enemies[r.s].alive ? r.view.rootOf(r.s) : null;
    if (body && names.length && t > lastCut + 0.05) {
      cutSeen++;
      cutOk &&= names.every((n) => (boneOf(body, n)?.scale.x ?? 0) < 0.01);
    }
    if (body && look.burst && !ex.active) {
      goneSeen++;
      goneOk &&= !body.visible;
    }
    if (ex.active && !ex.thrown) {
      safe &&= r.p.hp === hp && r.p.invuln > 0;
      if (r.vm.grip.weight > 0 && (r.vm.grip.bend('L') > 0.9 || r.vm.grip.bend('R') > 0.9)) hands++;
      r.p.hurtTime = 0;
    }
    if (r.vm.grip.bend('L') > 0.9 && r.vm.grip.bend('R') > 0.9) {
      const gap = r.rig.knuckle('L', kl).distanceTo(r.rig.knuckle('R', kr));
      const h = r.vm.grip.hand;
      // (Update 0.1.8 — the slam's clasp meets knuckle to knuckle, wrists straight: touching renders at 8.5 cm between the
      // knuckles, through each other at 6.3; the old palms-together clasp touched at 9.)
      if (h.L.b.mode.startsWith('slam') && h.R.b.mode.startsWith('slam')) closestSlam = Math.min(closestSlam, gap);
      else closest = Math.min(closest, gap);
      if (h.L.b.mode === 'slamDown' && h.R.b.mode === 'slamDown' && h.L.u > 0.95) clasped = Math.max(clasped, gap);
    }
    piecesSeen = Math.max(piecesSeen, visiblePieces(r.exec.pieces.group));
    tongue ||= r.exec.group.children.some((c) => c.type === 'Mesh' && c.visible);
  }
  const e = r.c.enemies[r.s];
  const blows = r.seen.filter((s) => s.startsWith('execBlow')).length;
  const slams = r.seen.filter((s) => s.startsWith('execSlam')).length;
  check('nothing hurts you while it’s in your hands', safe);
  check('your hands do the move', hands > 20, `${hands} frames posed`);
  if (closest < Infinity) check('your fists never pass through each other', closest > 0.09, `${closest.toFixed(3)} m apart at the closest`);
  if (closestSlam < Infinity) check('clasped, they never pass through each other', closestSlam > 0.08, `${closestSlam.toFixed(3)} m apart at the closest`);
  if (clasped > 0) check('clasped, they sit side by side', clasped < 0.16, `${clasped.toFixed(3)} m apart`);
  check(`its ${move.beats.length} blows and ${move.keys.filter((k) => k.hit).length} slams all land`, blows === move.beats.length && slams === move.keys.filter((k) => k.hit).length, `${blows} blows, ${slams} slams`);
  check(move.end === 'burst' ? 'it dies where it is' : 'it’s thrown, and dies where it lands', e.phase === 'dead');
  check('it ends as one kill that doesn’t refill the meter', r.seen.filter((s) => s.startsWith('kill:')).length === 1 && r.c.execution === 0);
  check(`it ends ${move.end === 'throw' ? 'landing' : 'bursting'}`, r.seen.some((s) => s.startsWith(move.end === 'throw' ? 'execLand' : 'execBurst')));
  const root = r.view.rootOf(r.s);
  if (look.cuts) {
    const want = new Set(look.cuts.flatMap((c) => c.pieces)).size;
    check(`its ${want} piece(s) come off`, piecesSeen >= want, `${piecesSeen} seen`);
    check('and the body is left without them', cutSeen > 10 && cutOk, `${cutSeen} frames`);
  }
  if (look.burst) {
    check('it bursts: no body, only its pieces', goneSeen > 10 && goneOk && piecesSeen >= 3, `${goneSeen} frames, ${piecesSeen} pieces`);
  }
  if (look.keep && root) {
    const at = root.position.clone();
    const q = root.quaternion.clone();
    for (let k = 0; k < 30; k++) r.step();
    check('it stays as it was left', root.position.distanceTo(at) < 1e-6 && root.quaternion.angleTo(q) < 1e-6);
  }
  if (look.tongue) check('its tongue reaches your hand', tongue);
  r.exec.dispose();
}

for (const kind of ['slime', 'spider'] as const) {
  section(`Execution — the ${kind}'s smash is the ground slam's`);
  // Update 0.1.8 — the designer: "use the same ground slam with the F key and port it to the slime and spider
  // executions". Its fists, clasped up and smashed down, measured against the slam's own (F) on the same arms.
  const r = await execRig(kind);
  const smash = moveOf(kind).beats.find((b) => b.blow === 'smash')!.t;
  const keys = HAND_MOVES[kind]!;
  const downAt = keys.findIndex((k) => k.L.mode === 'slamDown');
  check('the fists come down in the slam\'s time, at the blow', downAt > 0 && keys[downAt].t === smash && Math.abs(keys[downAt].t - keys[downAt - 1].t - ARMS.v.slamDown) < 1e-9 && keys[downAt - 1].L.mode === 'slamUp');
  check('held down and back to the guard in the slam\'s times', Math.abs(keys[downAt + 1].t - smash - ARMS.v.slamHold) < 1e-9 && Math.abs(keys[downAt + 2].t - keys[downAt + 1].t - ARMS.v.slamBack) < 1e-9 && keys[downAt + 2].L.mode === 'guard');
  const up = { L: new THREE.Vector3(), R: new THREE.Vector3(), seen: false };
  const down = { L: new THREE.Vector3(), R: new THREE.Vector3(), seen: false };
  // The backs of the hands, down: facing up, not each other (the designer: "just let them be normal").
  const wrist = new THREE.Vector3();
  const knuckle = new THREE.Vector3();
  const back = new THREE.Vector3();
  let across = 0;
  let eased = 0;
  let strayed = 0;
  r.step();
  for (let k = 0; k < 600; k++) {
    r.step();
    const h = r.vm.grip.hand;
    if (r.vm.grip.weight === 0) continue;
    const at = h.L.a.mode === 'slamUp' && h.L.b.mode === 'slamUp' ? up : h.L.a.mode === 'slamDown' && h.L.b.mode === 'slamDown' ? down : null;
    if (at && !at.seen) {
      r.rig.knuckle('L', at.L);
      r.rig.knuckle('R', at.R);
      at.seen = true;
      if (at === down)
        for (const s of ['L', 'R'] as const) {
          r.vm.scene.updateMatrixWorld(true);
          r.rig.handFrame(s, wrist, knuckle, back);
          across = Math.max(across, Math.abs(back.normalize().dot(new THREE.Vector3(1, 0, 0).transformDirection(r.vm.camera.matrixWorld))));
        }
    }
    // On the way down, as far as the slam's strike is at that share of its time (eased in: a blow speeding up).
    if (h.L.a.mode === 'slamUp' && h.L.b.mode === 'slamDown') {
      const w = (clock.t - (smash - ARMS.v.slamDown)) / ARMS.v.slamDown;
      eased++;
      strayed = Math.max(strayed, Math.abs(h.L.u - slamEase(Math.max(0, Math.min(1, w)))));
    }
  }
  r.exec.dispose();
  // The slam's own, on the same arms (F: up as it drops, down as it lands).
  const slam = { up: { L: new THREE.Vector3(), R: new THREE.Vector3() }, down: { L: new THREE.Vector3(), R: new THREE.Vector3() } };
  r.vm.slam.start();
  for (let t = 0; t < 0.3; t += STEP) r.step();
  r.rig.knuckle('L', slam.up.L);
  r.rig.knuckle('R', slam.up.R);
  r.vm.slam.land();
  for (let t = 0; t < ARMS.v.slamDown + 0.03; t += STEP) r.step();
  r.rig.knuckle('L', slam.down.L);
  r.rig.knuckle('R', slam.down.R);
  const off = (a: THREE.Vector3, b: THREE.Vector3) => a.distanceTo(b);
  const upOff = Math.max(off(up.L, slam.up.L), off(up.R, slam.up.R));
  check('raised, the fists are clasped where the slam raises them', up.seen && upOff < 0.01, `${(upOff * 100).toFixed(1)} cm off`);
  // Down, on its body (the slam's lands on the floor at the bottom of your view): side by side as the slam's, the backs
  // of the hands up.
  const gap = Math.abs(off(down.L, down.R) - off(slam.down.L, slam.down.R));
  check('smashed on its body, side by side as the slam\'s fists are', down.seen && gap < 0.01, `${(gap * 100).toFixed(1)} cm off`);
  check('the backs of the hands up, not facing each other', down.seen && across < 0.3, `${across.toFixed(2)} across`);
  check('the strike speeds up as it falls, as the slam does (eased in)', eased > 0 && strayed < 1e-6, `${eased} frames`);
}

section('Execution — the wizard, thrown at the nearest wall');
{
  // A wall 4 m to your right (you look along −z).
  const walled: Arena = { name: 'w', boxes: [boxAt(-40, -1, -40, 80, 1, 80, 'floor'), boxAt(4, 0, -20, 1, 6, 40, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const r = await execRig('spitter', walled);
  r.step();
  check('it’s swung towards the wall on your right', Math.abs(Math.atan2(Math.sin(r.c.exec.aimYaw + Math.PI / 2), Math.cos(r.c.exec.aimYaw + Math.PI / 2))) < 0.25, `${((r.c.exec.aimYaw * 180) / Math.PI).toFixed(0)}°`);
  for (let k = 0; k < 400 && r.c.exec.active; k++) r.step();
  check('and bursts against it', r.seen.some((s) => s.startsWith('execBurst')) && r.c.enemies[r.s].pos.x > 2.5 && r.c.enemies[r.s].pos.x < 4, `at x ${r.c.enemies[r.s].pos.x.toFixed(2)}`);
  r.exec.dispose();
}
