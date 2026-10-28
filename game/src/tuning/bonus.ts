// Update 0.0.17 — kill bonuses (the designer: like the power-ups in CoD Zombies). A kill may drop one: a snowflake (for
// a while every melee hit freezes what it hits), gold ingots (more coins from kills for a while), a blue potion (faster
// for a while). Each turns where it fell until you walk over it, or until it fades. Placeholders past the designer's
// numbers: how many a room gives, how long one lies there, bosses never frozen.
import { group, knob } from './schema';

export const BONUS = group('bonus', 'Kill bonuses', {
  snowflakeOdds: knob(0.1, 0, 1, 0.01, 'Snowflake chance', 'Chance a kill drops a snowflake.'),
  goldOdds: knob(0.1, 0, 1, 0.01, 'Gold ingots chance', 'Chance a kill drops gold ingots.'),
  potionOdds: knob(0.1, 0, 1, 0.01, 'Blue potion chance', 'Chance a kill drops a blue potion.'),
  perRoom: knob(2, 0, 10, 1, 'Bonuses a room', 'Most a fight room drops.'),
  life: knob(20, 3, 60, 1, 'Bonus lifetime', 'Seconds one lies on the floor before it fades (it blinks near the end).'),
  freezeFor: knob(7, 1, 30, 0.5, 'Snowflake time', 'Seconds your melee hits freeze what they hit.'),
  frozen: knob(1, 0.1, 5, 0.1, 'Freeze', 'Seconds a hit enemy stays frozen (a boss never is).'),
  goldFor: knob(10, 1, 30, 0.5, 'Gold ingots time', 'Seconds kills give more coins.'),
  goldBoost: knob(0.5, 0, 3, 0.05, 'Gold ingots boost', 'Extra coins from kills meanwhile (0.5: +50%).'),
  potionFor: knob(7, 1, 30, 0.5, 'Blue potion time', 'Seconds you run faster.'),
  potionBoost: knob(0.3, 0, 2, 0.05, 'Blue potion boost', 'Extra speed meanwhile (0.3: +30%).'),
});
