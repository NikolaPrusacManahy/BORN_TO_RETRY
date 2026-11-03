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
// Update 0.2.2 (the designer: "every 2 floors, an additional room is added, floor 3 = 6, floor 5 = 7, floor 7 = 8") —
// the fight rooms on the way: Rooms on the way, one more every Rooms apart floors (the board holds 8 at most).
// Update 0.3.27 (the designer's new rules: "we do not increases the amount of enemies in each room every 2 floors
// anymore, start with 8 and each rooms increases the count by 2"; "there is only 4 main room, 1 challenge room, 1 shop,
// boss room"; "the amount of room needed to pass increases by 1 every 4 floors, starting by floor 4 - 8, and remain the
// same until 10") — 8, 10, 12, 14 … on every floor; 4 fight rooms on the way on floors 1–3, 5 on 4–7, 6 on 8–10.
import { group, knob } from './schema';

export const ROOMS = group('rooms', 'Rooms', {
  fieldMin: knob(5, 1, 12, 1, 'Enemies on field', 'While a room has more to send, at least this many are fighting.'),
  reinforceGap: knob(0.35, 0, 3, 0.05, 'Reinforcement gap', 'Seconds between enemies coming in to keep the field full.'),
  baseCount: knob(8, 1, 40, 1, 'First room’s count', 'Enemies in a floor’s first fight room (every floor).'),
  perRoom: knob(2, 0, 10, 1, 'Per room deeper', 'Enemies more in each fight room further along the way.'),
  bigMax: knob(2, 0, 6, 1, 'Mini bosses a room', 'At most this many Yetis, Spiders and Blue Demons in one room.'),
  challengeExtra: knob(6, 0, 20, 1, 'Challenge: more enemies', 'A challenge room has this many more than a fight room as deep.'),
  challengeMinis: knob(2, 0, 4, 1, 'Challenge: mini bosses', 'A challenge room always has this many mini bosses (and no more).'),
  challengeKeys: knob(1, 0, 4, 1, 'Challenge: keys', 'Keys its mini bosses drop (the first killed first), each white or gold.'),
  challengeField: knob(10, 1, 14, 1, 'Challenge: on field', 'In a challenge room, while it has more to send, at least this many are fighting.'),
  wayRooms: knob(4, 2, 8, 1, 'Rooms on the way', 'Fight rooms between the start and the boss on floors 1–3.'),
  quicksand: knob(0.45, 0.1, 1, 0.05, 'Quicksand', 'In quicksand (floor 4’s desert) you move at this share of your speed.'),
  wayRoomsApart: knob(4, 1, 6, 1, 'One more room every', 'Every this many floors down, one more fight room on the way (floors 4–7: 5, floors 8–10: 6).'),
});
