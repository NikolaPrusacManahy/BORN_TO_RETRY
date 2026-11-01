// Update 0.2.23 — floor 2's combat events, out of events.ts, which had reached its size: the Dragon's (its boss) and the
// Venom Garden's hives (sim/dungeon/hives.ts). x, y, z: where it happened.
export type Floor2Event =
  // Update 0.0.18 — the Dragon: a warning (value = its move), the beam starting, a fireball, the wing and the tail
  // swinging, its scream (rising in its show, and raging), an enemy burnt away by the beam (value = its slot).
  | 'dragonWindup'
  | 'dragonBreath'
  | 'dragonFireball'
  | 'dragonWing'
  | 'dragonTail'
  | 'dragonScream'
  | 'burnt'
  // Update 0.0.21 — the Dragon throwing a fire bomb from the sky, a bomb bursting (value = its radius), its flame burst.
  | 'dragonBomb'
  | 'bombBlast'
  | 'dragonBurst'
  // Update 0.2.23 — a wasps' hive lets one out (value = the wasp's slot; x, y, z = the hive), a hive falls (value = its
  // index).
  | 'hiveOut'
  | 'hiveDown';
