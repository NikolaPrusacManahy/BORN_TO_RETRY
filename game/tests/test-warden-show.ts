// Update 0.3.64 — Hellwarden's show, at Tidebreaker's quality.
// Update 0.3.65 — the designer's shot list, about 20 s: the door and torches; the bones dragged into the lava; it rises bare; the chains and rocks, its armor
// clamping on, piece by piece; its sword rising, the heat following its claws; the skull, the eye; silence; its leap stopped mid-air, its name and your
// falls; and it lands, its first attack, the controls yours. And what you see: every shot framed, none in the stone.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { updateQuakes } from '../src/sim/combat/quakes';
import { createCombat } from '../src/sim/combat/state';
import { inShow, portalOpen, wallsOpen } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { CLAMPS, LANDED, riverOpen, SHOW_AIR, SHOW_CROUCH, SHOW_FORGE, SHOW_HEAT, SHOW_MASK, SHOW_RISE, SHOW_SLAM, SHOW_SWORD, SHOW_UNDER, wardenAt, wardenBeats, wardenDark, wardenFreezeGrey, wardenSilent, wardenVeil, wardenViewT } from '../src/sim/dungeon/wardenShow';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { fallenLine, hydrateSave } from '../src/state/settings';
import { HELLWARDEN } from '../src/tuning/hellwarden';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { throneBones } from '../src/world/dungeon/throne';
import type { Shot } from '../src/engine/boss/cinema';
import { rockSpot, ROCKS } from '../src/engine/hell/throneRocks';
import { RIVER_LONG, RIVER_WIDE, ThroneView } from '../src/engine/hell/throneView';
import { FACE, WardenCinema } from '../src/engine/hell/wardenCinema';

const v = HELLWARDEN.v;
const s = wardenBeats();
const level = buildDungeon(planFloor(4242, FLOOR.hell));
const b = level.boss;
const room = level.rooms[b.room];
const solidAt = (x: number, y: number, z: number) => level.arena.boxes.some((q) => q.kind !== 'floor' && Math.abs(x - q.x) <= q.w / 2 && Math.abs(y - q.y) <= q.h / 2 && Math.abs(z - q.z) <= q.d / 2);

section('Hellwarden’s show — its beats, the designer’s times');
{
  const order = [s.doorAt, s.torchFrom, s.torchTo, s.bonesFrom, s.riseFrom, s.snapAt, s.clamps[0], s.clamps[1], s.clamps[2], s.clamps[3], s.clamps[4], s.swordFrom, s.swordAt, s.heatFrom, s.heatTo, s.skullAt, s.eyeAt, s.silentAt, s.crouchFrom, s.leapAt, s.freezeFrom, s.freezeTo, s.landAt];
  check('in order', order.every((t, i) => i === 0 || t > order[i - 1]));
  check('door and torches in the first 2 s', s.doorAt < 1 && s.torchTo <= 2);
  check('the bones from 2 s to 5 s', near(s.bonesFrom, 2, 1e-6) && near(s.bonesTo, 5, 1e-6));
  check('it rises from 5 s to 9 s', near(s.riseFrom, 5, 1e-6) && near(s.riseTo, 9, 1e-6));
  check('its armor from 9 s to 12 s, its sword coming up last', s.clamps[0] > 9 && s.clamps[CLAMPS - 1] < 12 && s.swordFrom > s.clamps[CLAMPS - 1] && s.swordFrom < 12);
  check('its sword heats till 14 s', near(s.heatTo, 14, 1e-6));
  check('its mask from 14 s to 16 s, the eye igniting near the end', near(s.skullFrom, 14, 1e-6) && s.eyeAt > 15 && s.eyeAt < 16 && near(s.crouchFrom, 16, 1e-6));
  check(`about 20 s in all (${s.landAt.toFixed(1)}): SPACE skips it`, s.landAt > 18.5 && s.landAt < 21);
  const at = new THREE.Vector3();
  check('it starts well under the lava, and is on its feet as the chains go', wardenAt(0, 0, 0, 0, 1, 27, at).y < -6 && near(wardenAt(0, 0, s.snapAt, 0, 1, 27, at).y, 0, 1e-6));
  check('the river opens; it’s only a crack as it leaps', riverOpen(s.riverFrom - 0.01) === 0 && near(riverOpen(s.riverTo + 0.2), 1, 1e-6) && riverOpen(s.leapAt) < 0.1);
  const mid = wardenAt(0, 0, (s.freezeFrom + s.freezeTo) / 2, 0, 1, 27, at).clone();
  check('stopped mid-air through the freeze frame, high and coming at you', mid.y > 3 && mid.z > 10 && wardenAt(0, 0, s.freezeFrom + 0.01, 0, 1, 27, at).distanceTo(wardenAt(0, 0, s.freezeTo - 0.01, 0, 1, 27, new THREE.Vector3())) < 0.01);
  check('what’s in the world stops with it', wardenViewT(s.freezeFrom + 1) === s.freezeFrom && near(wardenViewT(s.landAt), s.freezeFrom + (s.landAt - s.freezeTo), 1e-9));
  wardenAt(0, 0, s.landAt, 0, 1, 27, at);
  check(`it lands ${v.showLandGap} m short of you, on the floor`, near(at.y, 0, 1e-6) && near(27 - at.z, v.showLandGap, 1e-6));
}

section('Hellwarden’s show — through the run');
{
  const run = createDungeonRun(level);
  const combat = createCombat(level.arena, false);
  const st = bossRoomStart(level);
  const p = createPlayer(st.x, 0, st.z, st.yaw);
  p.grounded = true;
  const hp = p.hp;
  const rng = createRng(3);
  const counts = new Map<string, number>();
  const clampsHeard: number[] = [];
  const tick = (secs: number) => {
    for (let i = 0; i < ticks(secs); i++) {
      stepRooms(run, p, combat, rng, DT);
      updateEnemies(combat.enemies, p, combat, OPEN_WORLD, DT);
      updateQuakes(combat.quakes, p, combat.events, DT);
      for (let e = 0; e < combat.events.length; e++) {
        const ev = combat.events.at(e);
        counts.set(ev.kind, (counts.get(ev.kind) ?? 0) + 1);
        if (ev.kind === 'wardenClamp') clampsHeard.push(ev.value);
      }
      combat.events.clear();
    }
  };
  for (let i = 0; i < 60 && run.boss.beat !== 'intro'; i++) tick(DT);
  check('stepping in starts its show, no portal', inShow(run.boss) && run.boss.ownShow && portalOpen(run.boss) === 0);
  tick(DT * 2);
  const e = combat.enemies[run.boss.slot];
  check('it’s there, under the floor, and no target of yours', e.kind === 'hellwarden' && e.phase === 'intro' && e.move === SHOW_UNDER && e.pos.y < -3);
  check('its walls still shut you in', wallsOpen(run.boss) < 0.01);
  tick(s.doorAt + 0.05 - run.boss.t);
  check('the door slams', counts.get('wardenDoor') === 1 && room.gates.every((g) => run.shut[g]));
  tick(s.torchTo + 0.05 - run.boss.t);
  check('the torches die; the room’s in the dark, its sky drawn down', counts.get('wardenTorches') === 1 && wardenDark(run.boss) > 1 && wardenVeil(run.boss) > 0.9);
  tick(s.bonesFrom + 0.05 - run.boss.t);
  check('the floor splits; the bones are dragged in', counts.get('wardenRift') === 1 && counts.get('wardenBones') === 1);
  tick(s.riseFrom + 0.05 - run.boss.t);
  check('its walls have gone, and it’s coming up', wallsOpen(run.boss) > 0.9 && e.move === SHOW_RISE);
  check('its show time’s what it’s drawn from', near(e.warden!.showT, run.boss.t, 1e-6));
  tick(s.snapAt - 0.5 - run.boss.t);
  check('the lava surging with it', (counts.get('wardenSurge') ?? 0) >= 3 && e.pos.y > -2 && e.pos.y < 0);
  tick(s.clamps[CLAMPS - 1] + 0.05 - run.boss.t);
  check('the chains snap', counts.get('wardenSnap') === 1 && e.move === SHOW_FORGE);
  check('its armor clamps on, boots first, pauldrons last', clampsHeard.join() === '0,1,2,3,4', clampsHeard.join());
  tick(s.swordFrom + 0.05 - run.boss.t);
  check('its sword comes up out of the lava', counts.get('wardenSwordRise') === 1 && e.move === SHOW_SWORD);
  tick(s.heatFrom + 0.05 - run.boss.t);
  check('the heat comes along it', counts.get('wardenHeat') === 1 && e.move === SHOW_HEAT);
  tick(s.skullFrom + 0.05 - run.boss.t);
  check('the skull comes up off the pile', counts.get('wardenSkull') === 1 && e.move === SHOW_MASK);
  tick(s.eyeAt + 0.05 - run.boss.t);
  check('its mask is on, its eye ignites', counts.get('wardenMaskOn') === 1 && counts.get('wardenEye') === 1);
  check('the music’s still on, till the silence', !wardenSilent(run.boss));
  tick(s.silentAt + 0.05 - run.boss.t);
  check('a hard cut to silence', counts.get('wardenHush') === 1 && wardenSilent(run.boss));
  tick(s.crouchFrom + 0.05 - run.boss.t);
  check('it crouches', e.move === SHOW_CROUCH);
  tick(s.leapAt + 0.05 - run.boss.t);
  check('it leaps', counts.get('wardenLeap') === 1 && e.move === SHOW_AIR && e.pos.y > 0);
  tick((s.freezeFrom + s.freezeTo) / 2 - run.boss.t);
  check('everything stops, the colour drained', counts.get('wardenFreeze') === 1 && wardenFreezeGrey(run.boss) > 0.8 && e.pos.y > 3);
  check('you’re still locked in the show, unhurt', inShow(run.boss) && p.hp === hp);
  tick(s.freezeTo + 0.03 - run.boss.t);
  check('out of it, it comes down', counts.get('wardenThaw') === 1 && e.move === SHOW_SLAM && wardenFreezeGrey(run.boss) < 0.85);
  tick(s.landAt + DT * 2 - run.boss.t);
  check('it lands: the fight’s yours from that moment', run.boss.beat === 'fight' && counts.get('wardenLand') === 1 && e.pos.y === 0 && !inShow(run.boss));
  check('you’re unhurt as it lands', p.hp === hp);
  check('its landing isn’t over: it’s still following through', e.phase === 'recover' && e.move === LANDED);
  check('the light’s back, its sky still down for its silhouette', wardenDark(run.boss) === 0 && near(wardenVeil(run.boss), v.fightSky, 1e-6));
  check('its gates shut, the walls gone', room.gates.every((g) => run.shut[g]) && wallsOpen(run.boss) === 1);
  const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
  check(`it’s ${v.showLandGap} m away`, near(d, v.showLandGap, 0.05), d.toFixed(2));
  const q = combat.quakes.find((x) => x.alive);
  check('its first attack: a ring rolling out at you', !!q && q.damage === v.showLandDamage);
  const reach = (d - 0.5) / v.showRing;
  check(`time to react: ${reach.toFixed(2)} s before it reaches you`, reach > 0.4 && reach < 0.8);
  // Stand there: it hits.
  tick(reach + 0.3);
  check('stood there, it hits you', p.hp === hp - v.showLandDamage, `${p.hp}`);
}

section('Hellwarden’s landing — jumped');
{
  const run = createDungeonRun(level);
  const combat = createCombat(level.arena, false);
  const st = bossRoomStart(level);
  const p = createPlayer(st.x, 0, st.z, st.yaw);
  p.grounded = true;
  const hp = p.hp;
  const rng = createRng(3);
  for (let i = 0; i < ticks(s.landAt + 1) && run.boss.beat !== 'fight'; i++) {
    stepRooms(run, p, combat, rng, DT);
    updateEnemies(combat.enemies, p, combat, OPEN_WORLD, DT);
    combat.events.clear();
  }
  p.pos.y = 2;
  for (let i = 0; i < ticks(1.2); i++) updateQuakes(combat.quakes, p, combat.events, DT);
  check('with your feet off the floor it passes under you', p.hp === hp);
}

section('Hellwarden’s show — skipped');
{
  const run = createDungeonRun(level);
  const combat = createCombat(level.arena, false);
  const st = bossRoomStart(level);
  const p = createPlayer(st.x, 0, st.z, st.yaw);
  p.grounded = true;
  const rng = createRng(3);
  for (let i = 0; i < 60 && run.boss.beat !== 'intro'; i++) stepRooms(run, p, combat, rng, DT);
  stepRooms(run, p, combat, rng, DT);
  run.boss.skip = true;
  const hp = p.hp;
  stepRooms(run, p, combat, rng, DT);
  const e = combat.enemies[run.boss.slot];
  check('SPACE: straight to the fight, where it lands, you unhurt', run.boss.beat === 'fight' && e.pos.y === 0 && p.hp === hp && Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < v.showLandGap + 0.5);
  check('no ring for one who didn’t see it land', !combat.quakes.some((x) => x.alive));
}

section('Hellwarden’s show — what you see');
{
  const st = bossRoomStart(level);
  const eye = new THREE.Vector3(st.x, 1.6, st.z);
  const dir = new THREE.Vector3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw));
  const cin = new WardenCinema(level);
  cin.start(eye, dir);
  const shot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const cam = new THREE.PerspectiveCamera(67, 16 / 9, 0.05, 2000);
  const h = v.height;
  const mid = (y: number) => new THREE.Vector3(b.portal.x, y, b.portal.z);
  const toYou = new THREE.Vector3(eye.x - b.portal.x, 0, eye.z - b.portal.z).normalize();
  const aside = new THREE.Vector3(toYou.z, 0, -toYou.x);
  const d = Math.hypot(eye.x - b.portal.x, eye.z - b.portal.z);
  const frame = (t: number, target: THREE.Vector3) => {
    cin.intro(t, eye, shot);
    cam.position.copy(shot.pos);
    cam.lookAt(shot.look);
    cam.updateMatrixWorld(true);
    return target.clone().project(cam);
  };
  const seen = (n: THREE.Vector3) => Math.abs(n.x) < 1 && Math.abs(n.y) < 1 && n.z < 1;
  frame(0, mid(0));
  check('it starts in your eyes', shot.pos.distanceTo(eye) < 1e-6);
  const doorAt = new THREE.Vector3(eye.x + toYou.x * 4, 3, eye.z + toYou.z * 4);
  check('round to the door as it slams', seen(frame(s.doorAt, doorAt)) && shot.pos.distanceTo(eye) < 1e-6);
  check('its torches dying down the room', seen(frame(s.torchTo - 0.2, mid(2).addScaledVector(toYou, 10))));
  check('from high up, the river', seen(frame(s.bonesFrom + 0.5, mid(0))) && shot.pos.y > 14);
  check('down low, by the bones', shot.pos.y > 14 && seen(frame(s.bonesTo - 0.5, mid(0.5).addScaledVector(toYou, 3))) && shot.pos.y < 2);
  const at = new THREE.Vector3();
  for (const k of [0.5, 0.8, 0.99]) {
    const t = s.riseFrom + (s.riseTo - s.riseFrom) * k;
    wardenAt(b.portal.x, b.portal.z, t, toYou.x, toYou.z, d, at);
    const n = frame(t, at.clone().setY(Math.max(0.5, at.y + h * 0.75)));
    check(`low, looking up as it rises (${k})`, seen(n) && shot.pos.y < 3, `${n.x.toFixed(2)} ${n.y.toFixed(2)}`);
  }
  check('up at it with the rocks over it', seen(frame(s.snapAt + 0.1, mid(5))) && seen(frame(s.snapAt + 0.1, new THREE.Vector3(b.portal.x - toYou.x * 19, 11, b.portal.z - toYou.z * 19))));
  check('its boots', seen(frame(s.clamps[0], mid(0.6))) && shot.pos.y < 2);
  check('its gauntlet', seen(frame(s.clamps[1], mid(4).addScaledVector(aside, -2.3))));
  check('its chest', seen(frame(s.clamps[3], mid(3.8))));
  check('the whole of it as its pauldrons hit', seen(frame(s.clamps[4], mid(0.3))) && seen(frame(s.clamps[4], mid(5.5))));
  check('its sword coming up out of the lava', seen(frame((s.swordFrom + s.swordAt) / 2, mid(3).addScaledVector(toYou, 4))));
  for (const k of [0.1, 0.9]) {
    const t = s.heatFrom + (s.heatTo - s.heatFrom) * k;
    check(`the flat of its blade across the view (${k})`, seen(frame(t, mid(h * 0.62).addScaledVector(toYou, h * 0.2))) && shot.pos.distanceTo(mid(h * 0.62)) < 9);
  }
  check('the skull rising', seen(frame((s.skullFrom + s.skullAt) / 2, mid(2).addScaledVector(toYou, 2.5).addScaledVector(aside, 2.5))));
  const face = mid(FACE[1]).addScaledVector(toYou, FACE[0]);
  check('close on its mask as the eye ignites', seen(frame(s.eyeAt, face)) && shot.pos.distanceTo(face) < 3);
  wardenAt(b.portal.x, b.portal.z, (s.freezeFrom + s.freezeTo) / 2, toYou.x, toYou.z, d, at);
  const hang = frame((s.freezeFrom + s.freezeTo) / 2, at.clone().setY(at.y + h * 0.5));
  check('stopped mid-air: it on the left of the view, its name’s side clear', hang.x < -0.05 && hang.x > -0.95 && Math.abs(hang.y) < 1, `${hang.x.toFixed(2)} ${hang.y.toFixed(2)}`);
  const big = at.distanceTo(shot.pos);
  check(`close enough to loom (${big.toFixed(1)} m)`, big < 14);
  check('its name shows only while it’s stopped', WardenCinema.named((s.freezeFrom + s.freezeTo) / 2) && !WardenCinema.named(s.leapAt) && !WardenCinema.named(s.landAt));
  let inSolid = '';
  let low = false;
  for (let t = 0; t <= s.landAt; t += 1 / 30) {
    cin.intro(t, eye, shot);
    if (shot.pos.y < 0.3) low = true;
    if (shot.pos.y > 11) continue;
    if (solidAt(shot.pos.x, shot.pos.y, shot.pos.z) && !inSolid) inSolid = `${t.toFixed(2)} s`;
  }
  check('never in the floor', !low);
  check('nor inside a wall or a column', inSolid === '', inSolid);
  cin.intro(s.landAt, eye, shot);
  const facing = new THREE.Vector3().subVectors(shot.look, shot.pos).normalize();
  const toBoss = new THREE.Vector3(b.portal.x - eye.x, 0, b.portal.z - eye.z).normalize();
  check('it ends in your eyes, facing it', shot.pos.distanceTo(eye) < 1e-6 && facing.x * toBoss.x + facing.z * toBoss.z > 0.85);
}

section('The Throne of Cinders — drawn');
{
  const view = new ThroneView(level);
  let inside = 0;
  view.group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.name !== 'void') return;
    const p = o.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) if (p.getX(i) > room.min.x && p.getX(i) < room.max.x && p.getZ(i) > room.min.z && p.getZ(i) < room.max.z && p.getY(i) < 20) inside++;
  });
  check('nothing of its void stands inside its room', inside === 0, `${inside}`);
  check('bones to drag', view.bones.count > 40, `${view.bones.count}`);
  view.dispose();
}

section('The Throne of Cinders — its bones');
{
  const u = new THREE.Vector3(-1, 0, 0);
  const bones = throneBones(level.plan, b.portal.x, b.portal.z, u.x, u.z, RIVER_WIDE / 2, RIVER_LONG / 2);
  const more = throneBones(level.plan, b.portal.x, b.portal.z, u.x, u.z, RIVER_WIDE / 2, RIVER_LONG / 2, 100);
  check('the more you’ve fallen, the more of them', more.length >= bones.length + 90, `${bones.length} → ${more.length}`);
  check('the same each time', JSON.stringify(bones) === JSON.stringify(throneBones(level.plan, b.portal.x, b.portal.z, u.x, u.z, RIVER_WIDE / 2, RIVER_LONG / 2)));
  const moving = bones.filter((x) => !x.keep);
  check('each one ends in the river', moving.every((x) => Math.abs(x.toZ - b.portal.z) < RIVER_WIDE / 2 && Math.abs(x.toX - b.portal.x) < RIVER_LONG / 2));
  check('all gone by the time it rises', moving.every((x) => x.delay + x.dur <= 3.05), `${Math.max(...moving.map((x) => x.delay + x.dur)).toFixed(2)}`);
  check('a heap left on its bank for its mask', bones.filter((x) => x.keep).length >= 5 && bones.some((x) => x.keep && x.piece === 'kit_r_Skull'));
  check('all on the room’s floor', bones.every((x) => x.x > room.min.x && x.x < room.max.x && x.z > room.min.z && x.z < room.max.z));
}

section('The rocks its armor’s in');
{
  const at = new THREE.Vector3();
  let low = true;
  let inRoom = true;
  for (let i = 0; i < ROCKS; i++) {
    rockSpot(i, b.portal.x, b.portal.z, -1, 0, at);
    if (at.y < 8) low = false;
    if (at.x < room.min.x || at.x > room.max.x || at.z < room.min.z || at.z > room.max.z) inRoom = false;
  }
  check('over its room, high enough to clear its columns', low && inRoom);
  rockSpot(2, b.portal.x, b.portal.z, -1, 0, at);
  const right = new THREE.Vector3(at.x - b.portal.x, 0, at.z - b.portal.z).dot(new THREE.Vector3(0, 0, -1));
  check('its right gauntlet comes from its right', right > 0, `${right.toFixed(1)}`);
}

section('How many times you fell');
{
  check('a new save hasn’t fallen', hydrateSave(null).deaths === 0);
  check('an old save with no count starts at none', hydrateSave({ settings: {} }).deaths === 0);
  check('it’s kept', hydrateSave({ settings: {}, deaths: 247 }).deaths === 247);
  check('nonsense isn’t', hydrateSave({ settings: {}, deaths: 'lots' }).deaths === 0 && hydrateSave({ settings: {}, deaths: -3 }).deaths === 0);
  check('the designer’s line', fallenLine(247) === 'Forged from the 247 times you fell.');
  check('one time reads right', fallenLine(1) === 'Forged from the one time you fell.');
  check('never yet reads right', fallenLine(0).includes('never'));
}
