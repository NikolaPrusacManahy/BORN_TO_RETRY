// Update 0.2.4 — the Pistol (the designer: "the pistol gun (not revolver) … reload animation top notch, throw with q
// key"). Its shots, its magazine and reloading (sim/weapons/gun.ts; the arms: engine/viewmodel/gunArms.ts). Then (the
// designer: "8 bullets per magazine, 40 in total"; "with fists … one grunt takes 6 hits, for the pistol it takes 5, so it
// is a little bit better as a ranged option, but remain a weak option"): its damage is a Grunt's health over Pistol
// shots a Grunt. Update 0.2.6 (the designer: "right click is only a hit with the gun, like a close range gun hit with
// it, like we are punching, no aiming"; "the bullet is going straight toward the crosshair"): no spread, no aiming down
// the sights, no view kick; right click a pistol-whip. Placeholders but those.
import { group, knob } from './schema';

export const GUN = group('gun', 'Pistol', {
  pistolShots: knob(5, 1, 20, 1, 'Pistol shots a Grunt', 'Bullets it takes to kill a Grunt (the designer: 5, fists 6): a bullet does a Grunt’s health over this, to every enemy.'),
  pistolKnock: knob(2.5, 0, 30, 0.5, 'Pistol knock', 'How hard a bullet pushes what it hits (m/s).'),
  pistolInterval: knob(0.14, 0.05, 1, 0.01, 'Pistol fire rate', 'Fewest seconds between shots: one shot a click.'),
  pistolMag: knob(8, 1, 50, 1, 'Pistol magazine', 'Bullets a magazine holds (the designer: 8).'),
  pistolRounds: knob(40, 1, 300, 1, 'Pistol rounds', 'Bullets in a pistol you find, its magazine included (the designer: 40; its uses: none left and the next click throws it).'),
  pistolRange: knob(80, 10, 200, 5, 'Pistol range', 'How far a bullet goes (m).'),
  pistolWhipDamage: knob(10, 1, 100, 1, 'Pistol whip damage', 'Right click: a strike with the gun at a fist’s reach (a finisher punch’s, at first).'),
  pistolWhipKnock: knob(8, 0, 30, 0.5, 'Pistol whip knock', 'How hard the whip pushes what it hits (m/s).'),
  pistolWhipRate: knob(0.5, 0.2, 2, 0.05, 'Pistol whip rate', 'Seconds from one whip to the next while right click is held.'),
  pistolReload: knob(1.3, 0.4, 4, 0.05, 'Pistol reload', 'Seconds to reload with a bullet still in.'),
  pistolReloadEmpty: knob(1.55, 0.4, 4, 0.05, 'Pistol empty reload', 'Seconds to reload once it’s empty (the slide locked back: the thumb releases it at the end).'),
  pistolSize: knob(1.4, 0.5, 2.5, 0.05, 'Pistol size (held)', 'Its size in your hand, times Weapon size (held): 1.33 is its true size.'),
});
