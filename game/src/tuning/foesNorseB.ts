// Update 0.3.22 — floor 7's mini bosses (MD/FLOOR7_WARBAND_PLAN.md): the Berserker (his spin across the ice, dizzy
// after; below half health, two spins) and Haugbui the barrow-dweller (his stomp that ices the floor round him, a block
// of ice hurled). Within the floors before's 340 (the designer: "do not make enemies tankier NEVER").
// **(placeholders)**
import { group, knob } from './schema';

export const FOES_NORSE_B = group('foesNorseB', 'Frozen warband: mini bosses', {
  berserkerHp: knob(300, 50, 2000, 10, 'Berserker health', 'Damage to kill him.'),
  berserkerSpeed: knob(4, 0.5, 12, 0.1, 'Berserker speed', 'How fast he walks.'),
  berserkerReach: knob(2.7, 0.5, 6, 0.1, 'Berserker reach', 'His double axe reaches this far.'),
  berserkerWindup: knob(0.7, 0.1, 3, 0.05, 'Berserker wind-up', 'His chop’s warning.'),
  berserkerDamage: knob(24, 1, 80, 1, 'Berserker chop', 'His chop, to you.'),
  spinWarn: knob(0.7, 0.1, 3, 0.05, 'Spin warning', 'He roars this long before he spins.'),
  spinFor: knob(2.5, 0.5, 8, 0.1, 'Spin for', 'He spins this long.'),
  spinSpeed: knob(5, 0.5, 15, 0.25, 'Spin drift', 'Spinning, he drifts at you this fast on stone…'),
  spinIce: knob(9, 0.5, 20, 0.25, 'Spin drift on ice', '…and this fast on ice, skidding wide.'),
  spinReach: knob(2.4, 0.5, 6, 0.1, 'Spin reach', 'His spinning axe reaches this far.'),
  spinDamage: knob(14, 1, 60, 1, 'Spin hit', 'Each time his spinning axe catches you.'),
  spinEvery: knob(6, 1, 20, 0.5, 'Spin every', 'Between spins.'),
  dizzy: knob(1.6, 0.2, 5, 0.1, 'Dizzy', 'After a spin he reels this long: your hits do more.'),
  rageAt: knob(0.5, 0, 1, 0.05, 'Berserker rage', 'Below this share of his health he spins twice in a row.'),
  berserkerCoins: knob(25, 0, 200, 1, 'Berserker coins', 'Coins he drops.'),
  haugbuiHp: knob(320, 50, 2000, 10, 'Haugbui health', 'Damage to kill the barrow-dweller.'),
  haugbuiSpeed: knob(2.2, 0.5, 10, 0.1, 'Haugbui speed', 'How fast he lumbers.'),
  haugbuiReach: knob(2.8, 0.5, 6, 0.1, 'Haugbui reach', 'His fist reaches this far.'),
  haugbuiWindup: knob(0.9, 0.1, 3, 0.05, 'Haugbui wind-up', 'His blow’s warning.'),
  haugbuiDamage: knob(26, 1, 80, 1, 'Haugbui blow', 'His blow, to you.'),
  stompWindup: knob(1, 0.2, 3, 0.05, 'Stomp warning', 'His foot raised this long (a ring shows where it reaches).'),
  stompReach: knob(4.5, 1, 10, 0.25, 'Stomp reach', 'His stomp reaches this far.'),
  stompDamage: knob(18, 1, 60, 1, 'Stomp hit', 'Caught on the ground by it (jump it).'),
  stompShove: knob(12, 1, 30, 0.5, 'Stomp throw', 'It throws you back this hard.'),
  stompIce: knob(7, 1, 15, 0.5, 'Stomp ice', 'It freezes the floor round him this far across.'),
  stompEvery: knob(7, 1, 20, 0.5, 'Stomp every', 'Between stomps.'),
  hurlWindup: knob(1, 0.2, 3, 0.05, 'Hurl wind-up', 'He tears up a block of ice this long.'),
  hurlFlight: knob(1.1, 0.3, 3, 0.05, 'Hurl flight', 'It arcs to where you were going this long.'),
  hurlReach: knob(2, 0.5, 6, 0.1, 'Hurl burst', 'It shatters this far round.'),
  hurlDamage: knob(20, 1, 60, 1, 'Hurl hit', 'Caught where it shatters.'),
  hurlEvery: knob(5, 1, 20, 0.5, 'Hurl every', 'Between blocks.'),
  haugbuiCoins: knob(25, 0, 200, 1, 'Haugbui coins', 'Coins he drops.'),
});
