// Update 0.3.13 — what a floor's look is (moved out of styles.ts, which had reached its size; no change): its pieces, its
// colours, its sky and sun, and what it has of its own. Pure data.

export type StyleId = 'brick' | 'stone' | 'sand' | 'drowned' | 'sunken' | 'venom' | 'bone' | 'frozen' | 'forge' | 'cove' | 'moon';
type Scale = [number, number, number];

export interface DungeonStyle {
  id: StyleId;
  /** The floor tile, and how far down it's placed (its top at the floor's level). */
  floor: string;
  floorY: number;
  /** The wall tile (2 m square, three high) and its depth; the cap over the top. */
  wall: string;
  wallDepth: number;
  cap: string;
  /** The doorway: its arch (scaled to the 4 m doorway); what fills over it (null: nothing). */
  arch: string;
  archScale: Scale;
  over: string | null;
  overY: number;
  overScale: Scale;
  /** The gate: its bars (scaled), where they hide when the gate's open (m: under the floor, or up over the doorway),
   *  and how fast they shut and open (m/s). */
  bars: string;
  barsScale: Scale;
  barsHidden: number;
  barsShut: number;
  barsOpen: number;
  /** A column: one piece, or a stack (bottom, middle repeated to the height, top) with each piece's height (m). */
  column: string[];
  columnHeights: number[];
  /** Update 0.3.10 — half a column's side, for its collision (m; none: the cell's, as the plain column's base is). */
  columnHalf?: number;
  /** Now and then on a wall: a banner, or a rubble patch; its height and how far out from the wall's face (m). */
  decor: string;
  decorY: number;
  decorOut: number;
  /** Update 0.3.13 — its size (as it comes when not given). */
  decorScale?: Scale;
  litter: string[];
  /** The walls' and ledges' solid cores (linear rgb). */
  core: [number, number, number];
  /** Update 0.2.4 — recoloured: each kit material (its name before any ".001") to a colour (sRGB hex), and the floor
   *  tile's own apart from the walls'. */
  tint?: Record<string, number>;
  floorTint?: Record<string, number>;
  /** Update 0.2.4 — the sky (the background and the haze), its light from above and from the ground, and the sun. */
  sky?: number;
  skyLight?: number;
  ground?: number;
  sun?: number;
  /** Update 0.2.4 — loose sand (the beds palms and cacti stand in) and quicksand. */
  sand?: number;
  quicksand?: number;
  /** Update 0.2.10 — water (its colour): the fight rooms flood (tide.ts). */
  water?: number;
  /** Update 0.2.11 — fully under water: the water's top over the floor (m; you swim, sim/player/swim.ts), and no
   *  torches. */
  under?: number;
  /** Update 0.3.16 — its boss room's walls this many rows of the kit's wall high (floor 6's: 4.5, 9 m; tallWalls.ts). */
  bossWalls?: number;
  /** Update 0.2.11 — low cover's piece and its size (crates when not given). Update 0.2.23 — it grows out of a bed of
   *  earth (floor 2's bushes: no paving under them). */
  low?: string;
  lowScale?: Scale;
  lowBed?: boolean;
  /** Update 0.2.23 — what fills the pits when it isn't lava (engine/lavaView.ts): its colours (sRGB hex) and its glow;
   *  it bubbles. */
  pit?: PitLook;
  /** Update 0.2.23 — pieces recoloured whole, every material of them (the boss room's charred trees); ash's colour
   *  (the boss room's beds). */
  burnt?: Record<string, number>;
  ash?: number;
  /** Update 0.2.24 — materials (names before any ".001") that glow in their own colour (floor 3's crystals). */
  glow?: string[];
  /** Update 0.3.14 — floor 6's cove: sand on every floor cell (no paving), and its own palms and their size. */
  sandFloor?: boolean;
  palms?: { list: readonly string[]; scale: number };
  /** Update 0.3.17 — floor 8's moon: in space (a black sky of stars with the Earth in it: engine/moon/spaceSky.ts; no
   *  torches, no air for a flame), the haze's colour apart from the sky's, and moon gravity (tuning/moon.ts). */
  space?: boolean;
  haze?: number;
  lowGravity?: boolean;
}

/** Update 0.2.23 — a pit's look: its dark base, the glow's two colours it drifts between, how bright. */
export interface PitLook {
  base: number;
  deep: number;
  hot: number;
  glow: number;
  /** Update 0.3.14 — still water (floor 6's sea): no bubbles, no glow round it, glossy; and it doesn't poison (floor 2's
   *  sludge does: `poisons`). */
  calm?: boolean;
  poisons?: boolean;
}
