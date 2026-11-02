// Update 0.3.18 — floor 8's crew's combat events (the Moon), out of events.ts, which had reached its size. Each one's
// value is which enemy (unless said), x, y, z where it happened.
export type MoonEvent =
  // The Gunner: its gun glowing (a burst coming), each bolt fired; cornered, its kick wound up and landing.
  | 'gunnerAim'
  | 'gunnerShot'
  | 'gunnerWindup'
  | 'gunnerKick'
  // The Flanker: crouched at your side (its hiss: it's about to dart), darting in, each punch.
  | 'flankerCrouch'
  | 'flankerDart'
  | 'flankerPunch'
  // The Leaper: crouched, up (x, y, z: where it'll land), landing (its shock ring rolls out).
  | 'hopperCrouch'
  | 'hopperLeap'
  | 'hopperLand'
  // The tiny ships: the Strafer's line shown (x, z its start; it runs to its aim), each bolt of its pass; the Diver
  // spinning (its warning), ramming; the Mine-layer dropping a mine; a mine popping (value: its blast's reach).
  | 'strafeLine'
  | 'strafeShot'
  | 'diverSpin'
  | 'diverRam'
  | 'mineDrop'
  | 'mineBlast'
  // The Bee's ship: its pass's lasers; its bombing run's line shown, a bomb dropped; down low, cooling (hit it now).
  | 'beeShipShot'
  | 'beeBombLine'
  | 'beeBombDrop'
  | 'beeShipLow'
  // The Bee's mech: crouched, up on its jets, a salvo of missiles, landing (its 1 s on the ground); broken, Barbara
  // climbing out (she goes on as the Bee astronaut).
  | 'beeMechJump'
  | 'beeMechUp'
  | 'beeMissiles'
  | 'beeMechLand'
  | 'beeEject';
