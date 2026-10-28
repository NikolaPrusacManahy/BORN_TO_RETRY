// Update 0.1.2 — every enemy's execution (the designer's list, MD_UPDATES/U012_EXECUTIONS.md), played and drawn as the
// game does it (tests/fakes/execRig.ts, the real models): E grabs it and empties the meter; nothing hurts you while it's
// in your hands; your hands do the move; every blow and slam lands; it dies (thrown and landing, or where it is) as one
// kill; a torn or chopped piece comes off and the body is left without it; a burst leaves no body, only its pieces; a
// smashed or flattened one stays as it was left; the frog's tongue reaches your hand; the wizard is thrown at the
// nearest wall and bursts there. Update 0.1.3 — your fists never pass through each other.
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
      closest = Math.min(closest, gap);
      const h = r.vm.grip.hand;
      if (h.L.b.mode === 'hammer' && h.R.b.mode === 'hammer' && h.L.u > 0.95) clasped = Math.max(clasped, gap);
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
