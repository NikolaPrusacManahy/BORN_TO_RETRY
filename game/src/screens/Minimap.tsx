// Update 0.0.12 — the dungeon's minimap, top right (the designer: a small minimap). Rooms you know of are outlined,
// rooms you've been in are filled, the one you're in is bright; the way down shows once you know its room; you're an
// arrow. Drawn in floor-grid cells, scaled to the box.
import type { MapView } from '../engine/hudStore';

/** The map's box (px) and the cells shown across it (it follows you, a few rooms around). */
const SIZE = 220;
const SPAN = 70;

export function Minimap({ map, x, z, yaw }: { map: MapView; x: number; z: number; yaw: number }) {
  const s = SIZE / SPAN;
  // Centred on you, kept inside the floor.
  const cx = Math.max(SPAN / 2, Math.min(map.size - SPAN / 2, x));
  const cz = Math.max(SPAN / 2, Math.min(map.size - SPAN / 2, z));
  const px = (v: number) => (v - cx) * s + SIZE / 2;
  const pz = (v: number) => (v - cz) * s + SIZE / 2;
  // Facing: yaw 0 looks along −z (up on the map); the arrow is drawn pointing up.
  const turn = (-yaw * 180) / Math.PI;
  return (
    <div className="rb-map">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {map.corridors.map((c, i) => (
          <rect key={`c${i}`} className="rb-map-corridor" x={px(c.x)} y={pz(c.z)} width={c.w * s} height={c.h * s} />
        ))}
        {map.rooms.map((r, i) => (
          <rect key={`r${i}`} className={`rb-map-room is-${r.state} is-${r.kind}`} x={px(r.x)} y={pz(r.z)} width={r.w * s} height={r.h * s} rx={2} />
        ))}
        <path className="rb-map-you" d="M 0 -7 L 5 6 L 0 3 L -5 6 Z" transform={`translate(${px(x)} ${pz(z)}) rotate(${turn})`} />
      </svg>
    </div>
  );
}
