// Update 0.3.63 — what Hellwarden has that no other enemy does (spec MD_UPDATES/U0363_HELLWARDEN.md): the walls of fire its Arc leaves, the
// lines of fire pillars its Brand spreads, the shadows of the bosses you've beaten, its blades. Pure.
export interface FireWall {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  left: number;
  /** Till it can burn you again (s). */
  burn: number;
}

export interface Brand {
  x: number;
  z: number;
  /** The first line's way (rad). */
  a: number;
  t: number;
  /** Steps erupted so far. */
  done: number;
}

/** Which shadow: the Dragon's dive, the Giant's stomp, the Raptor's pounce, the Wolf's dashes. */
export const ECHO_DRAGON = 0;
export const ECHO_GIANT = 1;
export const ECHO_RAPTOR = 2;
export const ECHO_WOLF = 3;

export interface Echo {
  type: number;
  t: number;
  /** Where it is (feet), where it's from, where it's going. */
  x: number;
  y: number;
  z: number;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  facing: number;
  /** Blows of it done. */
  done: number;
  /** The Wolf's lines through where you were (angle). */
  a: number;
}

export interface WardenBody {
  walls: FireWall[];
  brand: Brand | null;
  echoes: Echo[];
  /** Echoes still to come, till the next, which next. */
  echoLeft: number;
  echoIn: number;
  echoNext: number;
  /** Two blades (phase 2); both thrown; one knocked away: seconds it's weak. */
  twin: boolean;
  thrown: boolean;
  weak: number;
  /** Its sword shattered. */
  shattered: boolean;
  /** Update 0.3.65 — how far into its show (s; what its views are drawn from). */
  showT: number;
}

export const createWardenBody = (): WardenBody => ({ showT: 0, walls: [], brand: null, echoes: [], echoLeft: 0, echoIn: 0, echoNext: 0, twin: false, thrown: false, weak: 0, shattered: false });
