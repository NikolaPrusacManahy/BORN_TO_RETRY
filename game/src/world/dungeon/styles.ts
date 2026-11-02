// Update 0.0.20 — each floor's look (the designer: "floor 3 needs a new look, use the other type of walls, use the other
// type of gate, they close and open as you enter or win a room"). Floors 1 and 2 are brick (Modular Dungeon Pack part
// 1: brick walls and floor, the arch, its iron bars rising out of the floor to shut). Floor 3 is stone (part 2): grey
// stone walls and floor, a deep stone arch with a portcullis that drops from above to shut and is drawn back up when
// the room is won, stacked stone columns, rubble patches on the walls and grey rocks about. Pure data.
// Update 0.2.4 — floor 4 is the desert (the designer: "a dessert theme floor", the Sun Temple mock-up): floor 3's stone
// pieces recoloured sandstone (the kit is flat colours: each material's colour swapped), a sand floor, a warm sky and
// sun; loose sand where palms and cacti stand (their beds) and quicksand (desertDressing.ts, sandView.ts).
// Update 0.2.10 — floor 5 is the Drowned Temple (the designer chose it): floor 3's stone pieces wet and mossy (recoloured
// as the desert's were), under a pale grey-green haze; willows in beds of mud (`sand`: the beds' colour), mossy rocks,
// stumps and logs along the walls; its pits and its tide are water (`water`).
// Update 0.2.11 — floor 6 is the Sunken Grove, fully under water (the designer: "a floor that has been fully flooded …
// moss, rotten surface, trees"): floor 3's stone rotted and furred with algae, the water's top just over the walls
// (`under`: you swim), drowned trees in beds of silt (`sand`: the silt's colour), seaweed, mossy boulders for low cover
// (`low`), no torches; the haze a bright blue-green.
// Update 0.2.23 — floor 2 is the Venom Garden (the designer: "they need to match their enemies"): floor 1's brick ruins
// overgrown in bright sun, the brick mossy, earth beds (`sand`: the earth's colour) with flowers, tall grass and trees,
// bushes for low cover (`low`), green sludge in the pits (`pit`), the boss room's dead trees and logs charred (`burnt`).
// Update 0.2.24 — floor 3 is the Bone Keep: floor 3's stone bleached bone-white under a pale lavender sky; skulls on the
// walls (`decor`), stone tombs for low cover (`low`: the stone floor slab, stood tall), graves, glowing crystals (`glow`).
// Update 0.3.11 — floor 7 is Frozen Depths (the plan for floors 7–10): floor 3's stone frosted white and ice-blue under a
// pale winter sky; snowy trees in beds of snow (`sand`: the snow's colour), snowy rocks for low cover, crystals glowing
// ice-blue, sheets of ice on the floor (engine/iceView.ts).

export type StyleId = 'brick' | 'stone' | 'sand' | 'drowned' | 'sunken' | 'venom' | 'bone' | 'frozen';
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
}

/** Update 0.2.23 — a pit's look: its dark base, the glow's two colours it drifts between, how bright. */
export interface PitLook {
  base: number;
  deep: number;
  hot: number;
  glow: number;
}

export const BRICK: DungeonStyle = {
  id: 'brick',
  floor: 'kit_p1_Floor_Modular',
  floorY: -0.25,
  wall: 'kit_p1_Wall_Modular',
  wallDepth: 0.44,
  cap: 'kit_p1_WallCover_Modular',
  arch: 'kit_p1_Arch',
  archScale: [1.75, 1.2, 1],
  over: null,
  overY: 0,
  overScale: [1, 1, 1],
  bars: 'kit_p1_Arch_bars',
  barsScale: [1.69, 1.12, 1],
  barsHidden: -4.4,
  barsShut: 30,
  barsOpen: 6,
  column: ['kit_p2_Column'],
  columnHeights: [4.9],
  decor: 'kit_p1_Banner_wall',
  decorY: 3,
  decorOut: 0.3,
  litter: ['kit_p1_Skull', 'kit_p2_Bones', 'kit_p2_Bones2', 'kit_p2_Rock1', 'kit_p2_Rock2', 'kit_p2_Rock3', 'kit_p1_Vase', 'kit_p1_Bucket'],
  core: [0.196, 0.147, 0.096],
};

export const STONE: DungeonStyle = {
  id: 'stone',
  floor: 'kit_p2_ModularFloor',
  floorY: -0.37,
  wall: 'kit_p2_ModularStoneWall',
  wallDepth: 0.68,
  cap: 'kit_p1_WallCover_Modular',
  // The stone frame stretched to the doorway's width and the wall's depth (a thick stone arch); its keystone block over
  // it, filling up to the wall above.
  arch: 'kit_p2_Entrance',
  archScale: [2.2, 1.2, 6],
  over: 'kit_p2_ModularStoneWall_EntranceTop',
  overY: 2.65,
  overScale: [2.2, 1, 2.9],
  bars: 'kit_p2_Bars',
  barsScale: [2.4, 1.45, 1],
  barsHidden: 3.9,
  barsShut: 26,
  barsOpen: 3.5,
  column: ['kit_p2_ModularColumn_bottom', 'kit_p2_ModularColumn_middle', 'kit_p2_ModularColumn_top'],
  columnHeights: [0.62, 0.52, 0.62],
  // (Update 0.3.10 — the stacked stone is 1.02 m across: a cell's box held you half a metre off it.)
  columnHalf: 0.55,
  decor: 'kit_p2_WallRocks',
  decorY: 0,
  decorOut: 0.1,
  litter: ['kit_p1_Skull', 'kit_p2_Bones', 'kit_p2_Rock4', 'kit_p2_Rock5', 'kit_p2_Rock1', 'kit_p2_Rock3'],
  core: [0.11, 0.11, 0.12],
};

/** Update 0.2.4 — the desert: floor 3's stone pieces in sandstone and sand, under a warm sky. */
export const SAND: DungeonStyle = {
  ...STONE,
  id: 'sand',
  litter: ['kit_n_Rock_2', 'kit_n_Rock_5', 'kit_p1_Skull', 'kit_p2_Bones', 'kit_n_Rock_2'],
  core: [0.11, 0.065, 0.03],
  tint: { RockLight: 0xd6a868, Rock: 0xad7a42, Steel: 0xa8782e, Bones: 0xefe2c4, Wood: 0xa4744a, DarkWood: 0x7a5434, Grey_Floor: 0xb48c55, Fire: 0xff8a3a },
  floorTint: { RockLight: 0xecd3a0, Rock: 0xd8b47a },
  sky: 0xf4d9a6,
  skyLight: 0xfff0d8,
  ground: 0x9a7448,
  sun: 0xffd9a0,
  sand: 0xe6c27e,
  quicksand: 0xb98a4c,
};

/** Update 0.2.10 — the Drowned Temple: floor 3's stone, wet and mossy, under a grey-green haze; willows in mud. */
export const DROWNED: DungeonStyle = {
  ...STONE,
  id: 'drowned',
  litter: ['kit_n_Rock_Moss_1', 'kit_n_Rock_Moss_4', 'kit_n_Rock_Moss_6', 'kit_n_TreeStump_Moss', 'kit_n_WoodLog_Moss', 'kit_p1_Skull', 'kit_p2_Bones'],
  core: [0.035, 0.05, 0.042],
  tint: { RockLight: 0x8f9f88, Rock: 0x63766a, Steel: 0x587069, Bones: 0xd9ddc9, Wood: 0x6b5a40, DarkWood: 0x4a3c2a, Grey_Floor: 0x7e8d80, Fire: 0xff9a4a },
  floorTint: { RockLight: 0x7c8b7b, Rock: 0x56655a },
  sky: 0xc3d5cf,
  skyLight: 0xe8f1ec,
  ground: 0x506b5c,
  sun: 0xf1f3e6,
  sand: 0x4b3d2c,
  quicksand: 0x3a2f22,
  water: 0x2b7880,
};

/** Update 0.2.11 — the Sunken Grove: floor 3's stone rotted under the water, algae on it, silt where the trees stand. */
export const SUNKEN: DungeonStyle = {
  ...STONE,
  id: 'sunken',
  litter: ['kit_n_Rock_Moss_1', 'kit_n_Rock_Moss_6', 'kit_n_TreeStump_Moss', 'kit_n_WoodLog_Moss', 'kit_n_WoodLog_Moss', 'kit_p1_Skull', 'kit_p2_Bones'],
  core: [0.02, 0.035, 0.03],
  tint: { RockLight: 0x62785c, Rock: 0x46584a, Steel: 0x3f5552, Bones: 0xc7ccb4, Wood: 0x43392a, DarkWood: 0x30291e, Grey_Floor: 0x5a654f, Fire: 0x6fd6c0, White: 0xb4bba6, Black: 0x2b2f27, Green: 0x5b7f3c, DarkGreen: 0x33502c },
  floorTint: { RockLight: 0x59614a, Rock: 0x3f4737 },
  sky: 0x86c3c6,
  skyLight: 0xdaf6f1,
  ground: 0x3d6b5f,
  sun: 0xe8fbff,
  sand: 0x5b5139,
  quicksand: 0x4a412c,
  under: 6.5,
  low: 'kit_n_Rock_Moss_6',
  lowScale: [2.1, 1.8, 1.75],
};

/** Update 0.2.23 — the Venom Garden: floor 1's brick, mossy and overgrown, in bright sun; earth beds, green sludge. */
const CHAR = 0x2e2925;
export const VENOM: DungeonStyle = {
  ...BRICK,
  id: 'venom',
  litter: ['kit_n_Rock_Moss_1', 'kit_n_Rock_Moss_2', 'kit_n_WoodLog_Moss', 'kit_p1_Skull', 'kit_p2_Bones', 'kit_p2_Bones2', 'kit_n_Rock_Moss_6'],
  core: [0.06, 0.065, 0.04],
  tint: { Wall_Dark: 0x6f6d4c, Wall_Medium: 0x666647, Wall_Highlights: 0x8d8c66, Grey_Floor: 0x76785a, DarkGrey_Floor: 0x55573f, Green: 0x6a9a3c, DarkGreen: 0x467a2e, Rock: 0x9a9a84, Bone: 0xe2dcc0, Bones: 0xe2dcc0 },
  floorTint: { Grey_Floor: 0x8b8c69 },
  sky: 0xe8f0c8,
  skyLight: 0xfbffe8,
  ground: 0x6d7a40,
  sun: 0xfff3cc,
  sand: 0x5c4a32,
  quicksand: 0x4a3b28,
  pit: { base: 0x173a07, deep: 0x3d8a12, hot: 0x9ee024, glow: 0.9 },
  low: 'kit_n_Bush_1',
  lowScale: [1.5, 1.1, 1.2],
  lowBed: true,
  ash: 0x3b3631,
  burnt: { kit_n_CommonTree_Dead_2: CHAR, kit_n_CommonTree_Dead_3: CHAR, kit_n_BirchTree_Dead_3: CHAR, kit_n_TreeStump: CHAR, kit_n_WoodLog: CHAR },
};

/** Update 0.2.24 — the Bone Keep: floor 3's stone bleached bone-white, under a pale lavender sky. */
export const BONE: DungeonStyle = {
  ...STONE,
  id: 'bone',
  decor: 'kit_r_Skull2',
  decorY: 2.3,
  decorOut: 0.3,
  litter: ['kit_p1_Skull', 'kit_r_Skull', 'kit_p2_Bones', 'kit_p2_Bones2', 'kit_r_Bone', 'kit_p2_Candle', 'kit_p2_Rock4'],
  core: [0.13, 0.12, 0.14],
  tint: { RockLight: 0xe8e1d1, Rock: 0xc3baa7, Steel: 0x77727f, DarkSteel: 0x5c5866, Bones: 0xf1e9d6, Bone: 0xf1e9d6, Beige: 0xf1e9d6, Wood: 0x6f5b4b, DarkWood: 0x4e4036, Grey_Floor: 0xcdc5b3, Purple: 0x9a6cf2, Pink: 0xb27cf4, Cyan: 0x8a8cf6 },
  floorTint: { RockLight: 0xcdc3ae, Rock: 0xa69b87 },
  sky: 0xe6def4,
  skyLight: 0xf8f4ff,
  ground: 0x8e8398,
  sun: 0xfff2e0,
  sand: 0x5d4c40,
  quicksand: 0x4b3d33,
  low: 'kit_p2_ModularFloor',
  lowScale: [0.92, 3.5, 0.92],
  glow: ['Purple', 'Pink', 'Cyan'],
};

/** Update 0.3.11 — Frozen Depths: floor 3's stone frosted white and ice-blue, under a pale winter sky. */
export const FROZEN_LOOK: DungeonStyle = {
  ...STONE,
  id: 'frozen',
  litter: ['kit_n_Rock_Snow_1', 'kit_n_Rock_Snow_3', 'kit_n_TreeStump_Snow', 'kit_n_WoodLog_Snow', 'kit_p1_Skull', 'kit_p2_Bones'],
  core: [0.15, 0.18, 0.22],
  tint: { RockLight: 0xe6eff6, Rock: 0xb3c5d5, Steel: 0x8ea3b6, DarkSteel: 0x6d8397, Bones: 0xf1f3f2, Bone: 0xf1f3f2, Grey_Floor: 0xd9e4ec, Fire: 0xff9a4a, Purple: 0x8fdcff, Pink: 0xc4f0ff, Cyan: 0x6fd6ff },
  // (The paving a grey-blue, so the snow's white and the ice's blue stand out on it.)
  floorTint: { RockLight: 0xc4d2de, Rock: 0x9fb2c2 },
  sky: 0xdde9f3,
  skyLight: 0xf6fbff,
  ground: 0x9fb3c5,
  sun: 0xfdfcff,
  sand: 0xf2f6fa,
  quicksand: 0xd9e3eb,
  low: 'kit_n_Rock_Snow_6',
  lowScale: [2, 1.6, 1.7],
  glow: ['Purple', 'Pink', 'Cyan'],
};

/** Floor `floor`'s look: floor 1 brick, floor 2 the Venom Garden (Update 0.2.23), floor 3 the Bone Keep (Update 0.2.24), floor 4 the desert, floor 5 the Drowned Temple, floor 6
 *  the Sunken Grove, floor 7 (and on, for now) Frozen Depths (Update 0.3.11). */
export const styleOf = (floor: number): DungeonStyle => (floor >= 7 ? FROZEN_LOOK : floor === 6 ? SUNKEN : floor === 5 ? DROWNED : floor === 4 ? SAND : floor === 3 ? BONE : floor === 2 ? VENOM : BRICK);
