// Update 0.3.71 — the Playable Demon's Blazing Arc (enemy_bibles/Born to Retry — Playable Demon.docx; the designer: "swing animation
// needs premium treatment"): its numbers and its timing, which the rules and the arms share, so the blade arrives as the
// hit lands. Times in seconds, distances in metres. **(placeholders)**
import { group, knob } from './schema';

export const DEMON = group('demon', 'The Demon', {
  slashDamage: knob(26, 1, 200, 1, 'Slash damage', 'Blazing Arc’s first two hits, to everything they sweep through.'),
  overheadDamage: knob(48, 1, 300, 1, 'Overhead damage', 'Its third hit.'),
  slashKnock: knob(8, 0, 40, 0.5, 'Slash knock', 'How hard they push what they hit (m/s).'),
  overheadKnock: knob(16, 0, 40, 0.5, 'Overhead knock', 'How hard its third does.'),
  reach: knob(4.6, 1, 8, 0.05, 'Blade reach', 'How far from the eye it hits (m): as far as it looks.'),
  width: knob(0.9, 0.2, 2.5, 0.05, 'Blade width', 'How wide its sweep is at any one angle (m).'),
  slashArc: knob(65, 10, 120, 1, 'Slash sweep', 'Degrees each side of your aim a slash hits.'),
  overheadArc: knob(22, 5, 90, 1, 'Overhead sweep', 'Degrees each side the overhead hits.'),
  slashWindup: knob(0.16, 0.03, 0.5, 0.005, 'Slash wind-up', 'Seconds from the click to the blade meeting what it hits.'),
  overheadWindup: knob(0.28, 0.05, 0.8, 0.005, 'Overhead wind-up', 'Seconds from the click to the blade landing.'),
  slashStrike: knob(0.06, 0.02, 0.3, 0.005, 'Slash strike', 'The end of its wind-up: seconds it takes to come through from cocked. Short: it explodes.'),
  overheadStrike: knob(0.085, 0.02, 0.4, 0.005, 'Overhead strike', 'Seconds it takes to come down from over your head.'),
  slashFollow: knob(0.13, 0.03, 0.5, 0.005, 'Slash follow-through', 'Seconds its weight carries it on after contact.'),
  overheadFollow: knob(0.16, 0.03, 0.6, 0.005, 'Overhead follow-through', 'Seconds its weight carries on after it lands.'),
  slashBack: knob(0.42, 0.1, 1.2, 0.01, 'Slash return', 'Seconds back to ready, if no swing follows.'),
  overheadBack: knob(0.62, 0.1, 1.5, 0.01, 'Overhead return', 'Seconds it takes to heave it back up.'),
  slashNext: knob(0.16, 0.02, 0.8, 0.01, 'Slash to the next', 'After contact, seconds till the next swing can start (quicker with green rings).'),
  overheadNext: knob(0.3, 0.02, 1.2, 0.01, 'Overhead to the next', 'After its contact, seconds till you can start again.'),
  combo: knob(0.5, 0.1, 2, 0.05, 'Combo window', 'Swing again within this and the combo goes on.'),
  stop: knob(45, 0, 200, 5, 'Hit-stop: slash (ms)', 'The blade biting: 2 to 4 frames, the bible says.'),
  overheadStop: knob(110, 0, 300, 5, 'Hit-stop: overhead (ms)', 'Its third.'),
  view: knob(0.18, 0, 1, 0.01, 'Swing view lean', 'How much the view turns with the swing (the arms turn this much more).'),
  flare: knob(1.6, 0, 5, 0.05, 'Blade flare', 'How much brighter the blade burns through a strike.'),
});
