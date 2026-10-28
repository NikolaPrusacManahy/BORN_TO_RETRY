// Update 0.1.0 — a fight room's pressure (the designer: "a wave system that never allows less than 5 enemies on the
// field; constant pressure on the player"). A room's planned enemies come as a stream: the opening brings at least
// Enemies on field, and whenever fewer than that are fighting another comes, one every Reinforcement gap, until the room
// has sent them all.
import { group, knob } from './schema';

export const ROOMS = group('rooms', 'Rooms', {
  fieldMin: knob(5, 1, 12, 1, 'Enemies on field', 'While a room has more to send, at least this many are fighting.'),
  reinforceGap: knob(0.35, 0, 3, 0.05, 'Reinforcement gap', 'Seconds between enemies coming in to keep the field full.'),
});
