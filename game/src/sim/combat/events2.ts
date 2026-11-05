// Update 0.2.23 — floor 2's combat events, out of events.ts, which had reached its size: the Dragon's (its boss) and the
// Venom Garden's hives (sim/dungeon/hives.ts). x, y, z: where it happened.
export type Floor2Event =
  // Update 0.0.18 — the Dragon: a warning (value = its move), its fire starting, a fireball leaving, its wind and its
  // tail's slam, its scream (rising in its show, and as phase 2 starts).
  | 'dragonWindup'
  | 'dragonBreath'
  | 'dragonFireball'
  | 'dragonWing'
  | 'dragonTail'
  | 'dragonScream'
  // Update 0.0.21 — the Dragon throwing a fire bomb from the sky, a bomb bursting (value = its radius), its blast.
  | 'dragonBomb'
  | 'bombBlast'
  | 'dragonBurst'
  // Update 0.3.49 — the Boss Design Bible's Dragon: rubble on the wind; its dive locking on and hitting the floor; its
  // core opening, the ground shaking through it (value = how far through, 0..1), and the core breaking.
  | 'dragonRubble'
  | 'dragonDive'
  | 'dragonSlam'
  | 'dragonCore'
  | 'dragonRumble'
  | 'dragonCoreBroken'
  // Update 0.2.23 — a wasps' hive lets one out (value = the wasp's slot; x, y, z = the hive), a hive falls (value = its
  // index).
  | 'hiveOut'
  | 'hiveDown';
