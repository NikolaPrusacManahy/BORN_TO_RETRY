// Update 0.1.0 — a fight room's pressure (the designer: "a wave system that never allows less than 5 enemies on the
// field; constant pressure on the player"). A room's planned enemies come as a stream: the opening brings at least
// Enemies on field, and whenever fewer than that are fighting another comes, one every Reinforcement gap, until the room
// has sent them all.
// Update 0.1.1 (the designer: floor 1 starts at 8 and then 11; floor 2 should start at 11 then 14, and so on) — a room's
// enemy count: First room's count, plus Per room deeper for each room along the way, plus Per floor down for each floor.
import { group, knob } from './schema';

export const ROOMS = group('rooms', 'Rooms', {
  fieldMin: knob(5, 1, 12, 1, 'Enemies on field', 'While a room has more to send, at least this many are fighting.'),
  reinforceGap: knob(0.35, 0, 3, 0.05, 'Reinforcement gap', 'Seconds between enemies coming in to keep the field full.'),
  baseCount: knob(8, 1, 40, 1, 'First room’s count', 'Enemies in the first fight room of floor 1.'),
  perRoom: knob(3, 0, 10, 1, 'Per room deeper', 'Enemies more in each fight room further along the way.'),
  perFloor: knob(3, 0, 10, 1, 'Per floor down', 'Enemies more in every room on each floor down.'),
  bigMax: knob(2, 0, 6, 1, 'Mini bosses a room', 'At most this many Yetis, Spiders and Blue Demons in one room.'),
});
