// Update 0.0.15 — the boss room's show (the designer): stepping in, the view leaves your eyes and rises over the room,
// the walls slide back as the room grows, a portal opens in the middle and the boss rises out of it, takes a stance
// beside its name, and the view glides back into your eyes as the fight starts. Its death slows the world; the wooden
// gate swings open (the view turns to it); the dark beyond it fades to the next floor. Placeholders.
import { group, knob } from './schema';

export const CINEMA = group('cinema', 'Boss show', {
  pull: knob(1.4, 0.4, 4, 0.1, 'Out of your eyes', 'Seconds the view takes to rise over the room.'),
  walls: knob(2.4, 0.5, 6, 0.1, 'Walls slide', 'Seconds the walls take to slide back.'),
  portal: knob(0.9, 0.2, 3, 0.1, 'Portal opens', 'Seconds the portal takes to open.'),
  rise: knob(1.5, 0.3, 4, 0.1, 'Boss rises', 'Seconds the boss takes to rise out of the portal.'),
  stance: knob(1.8, 0.5, 5, 0.1, 'Stance', 'Seconds it holds its stance beside its name.'),
  back: knob(1.3, 0.4, 4, 0.1, 'Back to your eyes', 'Seconds the view takes to glide back.'),
  height: knob(12, 6, 40, 0.5, 'View height', 'How high the view rises over the room (m).'),
  bossShot: knob(13, 6, 30, 0.5, 'Boss shot distance', 'How far in front of the boss the view stops (m).'),
  slow: knob(0.3, 0.05, 1, 0.05, 'Death slow motion', 'The world runs this fast as the boss dies.'),
  slowTime: knob(1.4, 0, 4, 0.1, 'Death slow time', 'Real seconds of slow motion (it eases back).'),
  gateDelay: knob(1, 0, 4, 0.1, 'Gate delay', 'Seconds from the burst to the gate opening.'),
  gateSwing: knob(2.2, 0.5, 5, 0.1, 'Gate swing', 'Seconds the gate takes to swing open.'),
  gateShot: knob(1, 0, 1, 1, 'Show the gate', 'The view turns to the gate as it opens (1: on).'),
  gateShotTime: knob(2.8, 1, 6, 0.1, 'Gate shot', 'Seconds the view stays with the gate (including the glide there and back).'),
  floorFade: knob(0.9, 0.2, 3, 0.1, 'Into the dark', 'Seconds to fade to black in the dark beyond the gate.'),
  floorTitle: knob(2.2, 0.5, 5, 0.1, 'Floor title', 'Seconds the next floor’s name shows.'),
});
