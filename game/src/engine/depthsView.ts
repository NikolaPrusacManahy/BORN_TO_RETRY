// Update 0.3.13 — what floors 7 and 8 have of their own, drawn together (moved out of dungeonView.ts, which had reached
// its size): floor 7's sheets of ice (iceView.ts) and icicles (icicleView.ts); floor 8's presses, fire vents and belts
// (forge/), moving with the machinery's clock (sim/dungeon/machinery.ts). Made in code.
import * as THREE from 'three';
import type { DungeonRun } from '../sim/dungeon/roomLoop';
import type { DungeonLevel } from '../world/dungeon/assemble';
import { IceView } from './iceView';
import { IcicleView } from './icicleView';
import { BeltView } from './forge/beltView';
import { PressView } from './forge/pressView';
import { VentView } from './forge/ventView';

export class DepthsView {
  readonly group = new THREE.Group();
  private readonly ice: IceView;
  private readonly icicles: IcicleView;
  private readonly presses: PressView;
  private readonly vents: VentView;
  private readonly belts: BeltView;
  private time = 0;

  constructor(level: DungeonLevel) {
    this.ice = new IceView(level.ice);
    this.icicles = new IcicleView(level.icicles.length);
    this.presses = new PressView(level.forge.presses);
    this.vents = new VentView(level.forge.vents);
    this.belts = new BeltView(level.forge.belts);
    this.group.add(this.ice.group, this.icicles.group, this.presses.group, this.vents.group, this.belts.group);
  }

  update(dt: number, run: DungeonRun) {
    this.time += dt;
    if (run.icicles.length) this.icicles.update(run.icicles, this.time);
    const mach = run.machinery;
    if (mach.presses.length) this.presses.update(mach.presses, mach.t);
    if (mach.vents.length) this.vents.update(mach.vents, mach.t);
    this.belts.update(mach.t);
  }

  dispose() {
    this.group.removeFromParent();
    this.ice.dispose();
    this.icicles.dispose();
    this.presses.dispose();
    this.vents.dispose();
    this.belts.dispose();
  }
}
