// Update 0.2.4 — the Pistol (the designer: "the pistol gun (not revolver) … we can aim with right click and it aims like
// a normal fps game, reload animation top notch, throw with q key, max 15 bullets"). Its shots, its magazine, aiming
// down the sights and reloading (sim/weapons/gun.ts; the arms: engine/viewmodel/gunArms.ts). Then (the designer: "8
// bullets per magazine, 40 in total"; "with fists … one grunt takes 6 hits, for the pistol it takes 5, so it is a little
// bit better as a ranged option, but remain a weak option"): its damage is a Grunt's health over Pistol shots a Grunt.
// Placeholders but those.
import { group, knob } from './schema';

export const GUN = group('gun', 'Pistol', {
  pistolShots: knob(5, 1, 20, 1, 'Pistol shots a Grunt', 'Bullets it takes to kill a Grunt (the designer: 5, fists 6): a bullet does a Grunt’s health over this, to every enemy.'),
  pistolKnock: knob(2.5, 0, 30, 0.5, 'Pistol knock', 'How hard a bullet pushes what it hits (m/s).'),
  pistolInterval: knob(0.14, 0.05, 1, 0.01, 'Pistol fire rate', 'Fewest seconds between shots: one shot a click.'),
  pistolMag: knob(8, 1, 50, 1, 'Pistol magazine', 'Bullets a magazine holds (the designer: 8).'),
  pistolRounds: knob(40, 1, 300, 1, 'Pistol rounds', 'Bullets in a pistol you find, its magazine included (the designer: 40; its uses: none left and the next click throws it).'),
  pistolRange: knob(80, 10, 200, 5, 'Pistol range', 'How far a bullet goes (m).'),
  pistolSpread: knob(2.2, 0, 10, 0.1, 'Pistol spread', 'From the hip: how far off your aim a bullet may go (degrees).'),
  pistolAimSpread: knob(0.2, 0, 5, 0.05, 'Pistol aimed spread', 'Aimed down the sights.'),
  pistolBloom: knob(0.8, 0, 5, 0.1, 'Pistol bloom', 'Spread each shot adds, fading (degrees).'),
  pistolBloomFade: knob(4, 0.5, 20, 0.5, 'Pistol bloom fade', 'How fast the added spread fades (degrees a second).'),
  pistolAimIn: knob(0.16, 0.05, 0.6, 0.01, 'Pistol aim time', 'Seconds to bring the sights up to your eye.'),
  pistolZoom: knob(0.78, 0.4, 1, 0.01, 'Pistol aimed view', 'The view’s width aimed, times your field of view.'),
  pistolAimTurn: knob(0.78, 0.2, 1, 0.01, 'Pistol aimed mouse', 'Mouse speed aimed, times your sensitivity.'),
  pistolKick: knob(1.4, 0, 6, 0.1, 'Pistol kick', 'How far a shot kicks the view up (degrees; less aimed).'),
  pistolReload: knob(1.3, 0.4, 4, 0.05, 'Pistol reload', 'Seconds to reload with a bullet still in.'),
  pistolSize: knob(1.4, 0.5, 2.5, 0.05, 'Pistol size (held)', 'Its size in your hand, times Weapon size (held): 1.33 is its true size.'),
  pistolReloadEmpty: knob(1.55, 0.4, 4, 0.05, 'Pistol empty reload', 'Seconds to reload once it’s empty (the slide locked back: the thumb releases it at the end).'),
});
