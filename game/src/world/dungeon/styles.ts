// Update 0.0.20 — each floor's look (the designer: "floor 3 needs a new look, use the other type of walls, use the other
// type of gate, they close and open as you enter or win a room"). Floors 1 and 2 are brick (Modular Dungeon Pack part
// 1: brick walls and floor, the arch, its iron bars rising out of the floor to shut). Floor 3 is stone (part 2): grey
// stone walls and floor, a deep stone arch with a portcullis that drops from above to shut and is drawn back up when
// the room is won, stacked stone columns, rubble patches on the walls and grey rocks about. Pure data.

export type StyleId = 'brick' | 'stone';
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
  /** Now and then on a wall: a banner, or a rubble patch; its height and how far out from the wall's face (m). */
  decor: string;
  decorY: number;
  decorOut: number;
  litter: string[];
  /** The walls' and ledges' solid cores (linear rgb). */
  core: [number, number, number];
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
  decor: 'kit_p2_WallRocks',
  decorY: 0,
  decorOut: 0.1,
  litter: ['kit_p1_Skull', 'kit_p2_Bones', 'kit_p2_Rock4', 'kit_p2_Rock5', 'kit_p2_Rock1', 'kit_p2_Rock3'],
  core: [0.11, 0.11, 0.12],
};

/** Floor `floor`'s look: floors 1 and 2 brick, floor 3 (and on) stone. */
export const styleOf = (floor: number): DungeonStyle => (floor >= 3 ? STONE : BRICK);
