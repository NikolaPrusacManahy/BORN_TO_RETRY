// Update 0.3.13 — what floors 7 and 8 have of their own, drawn together (moved out of dungeonView.ts, which had reached
// its size): floor 7's sheets of ice (iceView.ts) and icicles (icicleView.ts); floor 8's presses, fire vents and belts
// (forge/), moving with the machinery's clock (sim/dungeon/machinery.ts). Made in code. Update 0.3.14 — and floor 6's
// powder kegs (cove/coveView.ts: the Pirate Kit's pieces, once the kit is loaded). Update 0.3.16 — and its boss arena
// under its water (cove/sharkArena.ts). Update 0.3.17 — and floor 8's moon (moon/moonView.ts: its sky, craters and
// meteors). Update 0.3.31 — its sky torn apart in Tidebreaker's show; its craters blown away with their rooms.
// Update 0.3.32 — and floor 8's, the Shrine Dimension's, sky (shrine/shrineSky.ts: islands floating all round).
// Update 0.3.43 — and floor 10's, Hell's (hell/hellView.ts: its sky, chains, braziers, the lava in its stone).
import * as THREE from 'three';
import type { DungeonRun } from '../sim/dungeon/roomLoop';
import type { DungeonLevel } from '../world/dungeon/assemble';
import { IceView } from './iceView';
import { IcicleView } from './icicleView';
import { BeltView } from './forge/beltView';
import { PressView } from './forge/pressView';
import { VentView } from './forge/ventView';
import { CoveView } from './cove/coveView';
import { SharkArena } from './cove/sharkArena';
import { MoonView } from './moon/moonView';
import { showTime } from './moon/floorBlast';
import { ShrineSky } from './shrine/shrineSky';
import { HellView } from './hell/hellView';
import { wardenVeil } from '../sim/dungeon/wardenShow';
import { islesTaken } from '../sim/dungeon/okamiShow';
import { styleOf } from '../world/dungeon/styles';

export class DepthsView {
  readonly group = new THREE.Group();
  private readonly ice: IceView;
  private readonly icicles: IcicleView;
  private readonly presses: PressView;
  private readonly vents: VentView;
  private readonly belts: BeltView;
  private readonly cove: CoveView;
  private readonly arena: SharkArena;
  private readonly moon: MoonView;
  private readonly shrine: ShrineSky | null;
  readonly hell: HellView;
  private time = 0;

  constructor(level: DungeonLevel) {
    this.ice = new IceView(level.ice);
    this.icicles = new IcicleView(level.icicles.length);
    this.presses = new PressView(level.forge.presses);
    this.vents = new VentView(level.forge.vents);
    this.belts = new BeltView(level.forge.belts);
    this.cove = new CoveView(level.cove);
    this.arena = new SharkArena(level.boss.end, level.plan.seed, styleOf(level.plan.level).id === 'cove');
    this.moon = new MoonView(level);
    const look = styleOf(level.plan.level);
    this.shrine = look.id === 'shrine' ? new ShrineSky(look.sky ?? 0xffffff) : null;
    if (this.shrine) this.group.add(this.shrine.group);
    this.hell = new HellView(level);
    this.group.add(this.hell.group);
    this.group.add(this.ice.group, this.icicles.group, this.presses.group, this.vents.group, this.belts.group, this.cove.group, this.arena.group, this.moon.group);
  }

  /** The dungeon kit is loaded (`material`: the floor's own take on a kit material). */
  build(kit: THREE.Object3D, material: (src: THREE.MeshStandardMaterial, piece: string) => THREE.Material) {
    this.cove.build(kit, material);
    this.moon.build(kit);
    this.shrine?.build(kit);
  }

  /** Update 0.3.34 — floor 8's sky (its islands go to Okami's show). */
  get sky(): ShrineSky | null {
    return this.shrine;
  }

  /** The view is under the boss arena's water. */
  get sunk(): boolean {
    return this.arena.sunk;
  }

  /** Update 0.3.31 — the Moon's craters (blown away with their rooms: moon/floorBlast.ts). */
  get craters(): readonly THREE.Object3D[] {
    return this.moon.craters;
  }

  /** `at`: the view; `flood`: the boss room's water (m); `kicks`: your kicks this frame. */
  update(dt: number, run: DungeonRun, at: THREE.Vector3, flood: number, kicks: number) {
    this.time += dt;
    this.arena.update(dt, at, flood, kicks);
    if (run.icicles.length) this.icicles.update(run.icicles, this.time);
    const mach = run.machinery;
    if (mach.presses.length) this.presses.update(mach.presses, mach.t);
    if (mach.vents.length) this.vents.update(mach.vents, mach.t);
    this.belts.update(mach.t);
    this.cove.update(run.powder, this.time);
    this.moon.update(dt, run.meteors, at, showTime(run.boss));
    this.shrine?.update(dt, at, islesTaken(run.boss));
    this.hell.update(dt, at, wardenVeil(run.boss));
  }

  dispose() {
    this.group.removeFromParent();
    this.ice.dispose();
    this.icicles.dispose();
    this.presses.dispose();
    this.vents.dispose();
    this.belts.dispose();
    this.cove.dispose();
    this.arena.dispose();
    this.moon.dispose();
    this.shrine?.dispose();
    this.hell.dispose();
  }
}
