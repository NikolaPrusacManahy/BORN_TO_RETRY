// Update 0.3.18 — floor 8's mini bosses, the Moon (MD/FLOOR8_MOON_PLAN.md; the designer: "Mini boss - One spaceship
// and Bee mech (turn into astronaut bee after mech dies) … Bee mech is able to glide in the air and shoot salvos of
// missiles and lands with a 1sec cooldown"). The Bee's ship and the Bee's mech; the mech's and the astronaut's health
// together no more than the floors before's mini bosses (Mako 340, Barbarossa 320: never tankier). Times in seconds,
// distances in metres, speeds in m/s. **(placeholders)**
import { group, knob } from './schema';

export const FOES_MOON_B = group('foesMoonB', 'Moon mini bosses', {
  beeShipHp: knob(300, 50, 2000, 10, 'Bee ship health', 'Barbara’s ship: it strafes, bombs a line, then drops low to cool down.'),
  beeShipSpeed: knob(10, 2, 25, 0.5, 'Bee ship speed', 'How fast it flies its passes.'),
  beeShipShots: knob(6, 1, 16, 1, 'Bee ship lasers', 'Twin bolts along a pass.'),
  beeShipShot: knob(8, 1, 40, 1, 'Bee ship laser', 'Each, to you.'),
  bombingEvery: knob(3, 1, 8, 1, 'Bombing every', 'After this many passes, a bombing run.'),
  bombLine: knob(0.9, 0.2, 3, 0.1, 'Bombing warning', 'Its line marked on the ground this long first.'),
  bombs: knob(6, 2, 14, 1, 'Bombs', 'Bombs down the line.'),
  bombReach: knob(2.2, 0.5, 5, 0.1, 'Bomb blast', 'A bomb’s blast reaches this far.'),
  bombDamage: knob(18, 1, 60, 1, 'Bomb hit', 'A bomb, to you.'),
  coolLow: knob(2, 0.5, 6, 0.1, 'Bee ship cool-down', 'After a bombing run it hangs low this long: hit it then.'),
  beeShipCoins: knob(15, 0, 300, 5, 'Bee ship coins', 'Coins it drops.'),
  mechHp: knob(230, 50, 2000, 10, 'Bee mech health', 'Barbara’s mech (then Barbara on foot: Bee astronaut health).'),
  mechSpeed: knob(4, 0.5, 12, 0.1, 'Bee mech speed', 'How fast it walks.'),
  glideTime: knob(3.4, 1, 8, 0.1, 'Bee mech glide', 'It glides on its jets this long, out of reach.'),
  glideHeight: knob(5, 2, 10, 0.25, 'Bee mech height', 'This high.'),
  salvos: knob(2, 1, 5, 1, 'Salvos', 'Missile salvos a glide.'),
  salvoSize: knob(6, 1, 12, 1, 'Salvo', 'Missiles a salvo.'),
  missileSpeed: knob(9, 3, 25, 0.5, 'Missile speed', 'A missile’s speed: dash through or sidestep.'),
  missileTurn: knob(1.5, 0, 6, 0.1, 'Missile homing', 'How fast a missile turns after you (rad/s).'),
  missileDamage: knob(10, 1, 50, 1, 'Missile hit', 'A missile, to you.'),
  landCool: knob(1, 0.2, 4, 0.1, 'Bee mech landing', 'Landed, it holds there this long (its cooldown: hit it then).'),
  stompReach: knob(2.2, 0.5, 5, 0.1, 'Landing reach', 'Its landing hurts you this near.'),
  stompDamage: knob(15, 1, 60, 1, 'Landing hit', 'Its landing, to you.'),
  nautHp: knob(100, 10, 1000, 5, 'Bee astronaut health', 'Barbara, out of her broken mech, on foot.'),
  nautSpeed: knob(6, 1, 15, 0.1, 'Bee astronaut speed', 'How fast she runs.'),
  nautPunch: knob(10, 1, 50, 1, 'Bee astronaut punch', 'Her quick punches.'),
  mechCoins: knob(15, 0, 300, 5, 'Bee coins', 'Coins Barbara drops, beaten.'),
});
