// Update 0.3.15 — floor 6's Kraken Tentacle and its mini bosses (the plan, MD/FLOOR6_PIRATE_PLAN.md): Mako, the big
// shark (the designer's: a land shark: it dives into the sand and cuts at you, only its fin showing, and erupts under
// you; on boards it charges), and Captain Barbarossa (his pistol: a red aim line, then the shot; his hook sweep up
// close). Times in seconds, distances in metres, speeds in m/s. **(placeholders)**
import { group, knob } from './schema';

// (Update 0.3.15 — health no more than the floors before's mini bosses: the designer, "do not make enemies tankier
// NEVER".)
export const FOES_COVE_B = group('foesCoveB', 'Floor 6 kraken, Mako, Captain', {
  tentacleHp: knob(120, 20, 1000, 10, 'Tentacle health', 'Damage to drive it off for good.'),
  tentacleHeight: knob(7, 3, 14, 0.5, 'Tentacle height', 'How tall it stands out of the sea.'),
  tentacleReach: knob(5.5, 2, 10, 0.25, 'Tentacle reach', 'It grabs you this near it (it stands 2 m out in the water).'),
  tentacleLurk: knob(8, 2, 30, 0.5, 'Tentacle lurk', 'Lurking under with you never near, it rises anyway after this long.'),
  tentacleWindup: knob(0.8, 0.3, 3, 0.05, 'Tentacle wind-up', 'Once it’s up, it rears back this long before it lunges for you.'),
  tentacleGrabHits: knob(6, 1, 20, 1, 'Tentacle grab hits', 'Clicks (hits on it) to break free of its grab.'),
  tentacleGrabTime: knob(2.5, 1, 8, 0.1, 'Tentacle grab time', 'Seconds you have to land them before it slams you down.'),
  tentacleGrabHit: knob(10, 0, 100, 1, 'Tentacle grab hit', 'Each of those hits hurts it this much.'),
  tentacleDamage: knob(25, 1, 100, 1, 'Tentacle slam', 'Not broken free in time: slammed down on the shore, this much.'),
  tentacleStun: knob(2, 0, 5, 0.1, 'Tentacle stun', 'Broken free, it reels this long: hits do more.'),
  tentacleSinkAt: knob(0, 0, 1, 0.05, 'Tentacle sinks at', 'Its health down to this share, it sinks under once (0: never; the designer saw it vanish as you broke free).'),
  tentacleUnder: knob(3, 1, 15, 0.5, 'Tentacle under', 'Sunk, seconds it lurks (you never near) before it rises again.'),
  tentacleGap: knob(2.5, 0.3, 6, 0.1, 'Tentacle rest', 'Seconds between its grabs.'),
  makoHp: knob(340, 50, 2000, 10, 'Mako health', 'Damage to kill it.'),
  makoHeight: knob(2.7, 1.5, 4, 0.1, 'Mako size', 'How tall it stands.'),
  makoSpeed: knob(5.2, 1, 12, 0.1, 'Mako speed', 'How fast it walks.'),
  makoReach: knob(2.8, 1, 5, 0.1, 'Mako reach', 'Its cleaver reaches this far.'),
  makoWindup: knob(0.7, 0.2, 2, 0.05, 'Mako wind-up', 'Its cleaver goes up this long.'),
  makoDamage: knob(26, 1, 100, 1, 'Mako cleaver', 'To you, per blow.'),
  makoSwim: knob(10, 3, 25, 0.5, 'Mako sand swim', 'How fast its fin cuts through the sand.'),
  makoRise: knob(0.65, 0.2, 2, 0.05, 'Mako rise', 'The sand churns where it’ll erupt this long: step off.'),
  makoBite: knob(32, 1, 100, 1, 'Mako bite', 'Erupting under you, its bite.'),
  makoUp: knob(5, 1, 15, 0.5, 'Mako stays up', 'Seconds it fights on its feet before it dives again.'),
  makoCharge: knob(12, 4, 25, 0.5, 'Mako charge', 'On boards (it can’t dive): how fast it charges.'),
  makoChargeDamage: knob(22, 1, 100, 1, 'Mako charge damage', 'To you, run down.'),
  makoCoins: knob(25, 0, 200, 1, 'Mako coins', 'Coins it drops.'),
  captainHp: knob(320, 50, 2000, 10, 'Captain health', 'Damage to kill him.'),
  captainHeight: knob(2.3, 1.5, 4, 0.1, 'Captain size', 'How tall he stands.'),
  captainSpeed: knob(4.6, 1, 12, 0.1, 'Captain speed', 'How fast he walks.'),
  captainAim: knob(1.1, 0.3, 3, 0.05, 'Captain aim', 'His red aim line follows you this long before he fires.'),
  captainTrack: knob(5, 0.5, 20, 0.5, 'Captain aim speed', 'How fast his aim follows you (m/s): outrun it, or break the line.'),
  captainShot: knob(28, 1, 100, 1, 'Captain shot', 'To you, if his shot finds you.'),
  captainEvery: knob(3.5, 0.5, 10, 0.1, 'Captain every', 'Seconds between his shots.'),
  captainReach: knob(2.8, 1, 5, 0.1, 'Captain hook reach', 'His hook sweeps this far, wide.'),
  captainWindup: knob(0.6, 0.2, 2, 0.05, 'Captain hook wind-up', 'His hook goes back this long.'),
  captainDamage: knob(22, 1, 100, 1, 'Captain hook', 'To you, per sweep.'),
  captainCoins: knob(25, 0, 200, 1, 'Captain coins', 'Coins he drops.'),
});
