// Update 0.1.0 — a fight room's pressure (the designer: "a wave system that never allows less than 5 enemies on the
// field; constant pressure on the player"). A room's planned enemies come as a stream: the opening brings at least
// Enemies on field, and whenever fewer than that are fighting another comes, one every Reinforcement gap, until the room
// has sent them all.
// Update 0.1.1 (the designer: floor 1 starts at 8 and then 11; floor 2 should start at 11 then 14, and so on) — a room's
// enemy count: First room's count, plus Per room deeper for each room along the way, plus Per floor down for each floor.
// Update 0.1.16 (the designer: "2 more enemies every 2 floors, starting with floor 2"; it was 3 more every floor) —
// More every few floors, every Floors apart floors down (floors 2–3: 2 more, 4–5: 4 more, … floor 10: 10 more).
// Update 0.1.20 — the challenge room (the designer: "6 more enemies of the norm", "a guaranteed 2 mini boss", its
// mini boss drops "only either a white key or a gold key").
// Update 0.2.1 (the designer: "put 10 enemies at the same time", "making this room harder on purpose") — a challenge
// room keeps Challenge: on field fighting.
import { group, knob } from './schema';

export const ROOMS = group('rooms', 'Rooms', {
  fieldMin: knob(5, 1, 12, 1, 'Enemies on field', 'While a room has more to send, at least this many are fighting.'),
  reinforceGap: knob(0.35, 0, 3, 0.05, 'Reinforcement gap', 'Seconds between enemies coming in to keep the field full.'),
  baseCount: knob(8, 1, 40, 1, 'First room’s count', 'Enemies in the first fight room of floor 1.'),
  perRoom: knob(3, 0, 10, 1, 'Per room deeper', 'Enemies more in each fight room further along the way.'),
  perFloor: knob(2, 0, 10, 1, 'More every few floors', 'Enemies more in every room each time you get Floors apart floors deeper (from floor 2).'),
  floorsApart: knob(2, 1, 5, 1, 'Floors apart', 'Every this many floors down, every room has More every few floors more.'),
  bigMax: knob(2, 0, 6, 1, 'Mini bosses a room', 'At most this many Yetis, Spiders and Blue Demons in one room.'),
  challengeExtra: knob(6, 0, 20, 1, 'Challenge: more enemies', 'A challenge room has this many more than a fight room as deep.'),
  challengeMinis: knob(2, 0, 4, 1, 'Challenge: mini bosses', 'A challenge room always has this many mini bosses (and no more).'),
  challengeKeys: knob(1, 0, 4, 1, 'Challenge: keys', 'Keys its mini bosses drop (the first killed first), each white or gold.'),
  challengeField: knob(10, 1, 14, 1, 'Challenge: on field', 'In a challenge room, while it has more to send, at least this many are fighting.'),
});
