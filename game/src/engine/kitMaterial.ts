// Update 0.3.31 (out of dungeonView.ts, which had reached its size) — a kit piece's material as a floor's look has it.
import * as THREE from 'three';
import { SEAWEED } from '../world/dungeon/dressExtras';
import { TALL_GRASS } from '../world/dungeon/gardenDressing';
import type { DungeonStyle } from '../world/dungeon/styles';
import { grassPatch } from './grassShader';
import type { Underwater } from './underwater';

/** The kit's flat colours, a little rough; fire glows. Update 0.2.4 — recoloured as the look says (`piece`: the floor
 *  tile has its own). Update 0.2.23 — or a piece recoloured whole (`burnt`); floor 2's tall grass parts. */
export function kitMaterial(src: THREE.MeshStandardMaterial, piece: string, look: DungeonStyle, under: Underwater | null): THREE.MeshStandardMaterial {
  const mat = src.clone();
  const base = src.name.split('.')[0];
  const tint = look.burnt?.[piece] ?? (piece === look.floor ? look.floorTint?.[base] : undefined) ?? look.tint?.[base];
  if (tint !== undefined) mat.color.setHex(tint);
  mat.roughness = 0.9;
  mat.metalness = 0;
  under?.patch(mat, SEAWEED.has(piece));
  if (look.id === 'venom' && TALL_GRASS.has(piece)) grassPatch(mat);
  if (/fire|candle/i.test(src.name) || look.glow?.includes(base)) {
    mat.emissive.copy(src.color);
    mat.emissiveIntensity = 2.2;
  }
  return mat;
}
