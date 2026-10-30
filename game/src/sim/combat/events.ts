// Update 0.1.4 — the combat events (moved out of state.ts, which re-exports them, to keep it short). What each one's
// value and x, y, z mean is next to it.
export type CombatEvent =
  | 'none'
  // Punches thrown (for the arms): value = combo step for jabs, charge (0..1) for heavy.
  | 'jabL'
  | 'jabR'
  | 'chargeStart'
  | 'chargeReady'
  | 'chargeCancel'
  | 'heavy'
  // M2 — sword swings (for the arms).
  | 'slash'
  | 'pierce'
  // What a punch or swing did; x, y, z = where.
  | 'whiff'
  | 'hitJab'
  | 'hitFinisher'
  | 'hitHeavy'
  | 'hitSlash'
  | 'hitPierce'
  | 'hitThrown'
  | 'kill'
  // The targets.
  | 'telegraph'
  | 'orbFire'
  | 'orbPop'
  | 'orbHitPlayer'
  | 'respawn'
  // M2 — enemies (value = which enemy): one arriving, each kind's warning and attack.
  | 'enemySpawn'
  | 'gruntWindup'
  | 'gruntStrike'
  | 'spitterWindup'
  | 'spit'
  | 'bruteWindup'
  | 'bruteSlam'
  // Update 0.0.13 — the leaper's crouch, its leap and its landing; the stinger's warning and its dive; the wraith's
  // warning and its cast.
  | 'leaperWindup'
  | 'leaperLeap'
  | 'leaperLand'
  | 'stingerWindup'
  | 'stingerDive'
  | 'wraithWindup'
  | 'wraithCast'
  // Update 0.0.15 — the Demon (value = which enemy, or the move for its warning: 0 charge, 1 leap, 2 volley): its
  // warning, its charge running into you or into a wall (stunned), its leap and landing, its volley, its roar; a quake
  // ring rolling under you (value = damage).
  | 'demonWindup'
  | 'demonCharge'
  | 'demonGore'
  | 'demonCrash'
  | 'demonLeap'
  | 'demonSlam'
  | 'demonVolley'
  | 'demonRoar'
  | 'quakeHit'
  // Update 0.0.15 — the boss room (value = the boss's slot): its show starts, the boss rises out of the portal, it's
  // killed, its body bursts, what it leaves you (value = the item), the wooden gate swings open.
  | 'bossIntro'
  | 'bossRise'
  | 'bossDown'
  | 'bossBurst'
  | 'bossLoot'
  | 'woodGateOpen'
  // Update 0.0.12 — your ground slam landing (value = its radius), and what it hit. A coin reaching you (value = your
  // money after).
  | 'slamImpact'
  | 'hitSlam'
  | 'coin'
  // Update 0.0.12 — the dungeon's room loop (value = the room; x, y, z = its middle): its gates slam shut, they open
  // (cleared); you take the way down (value = the floor you leave).
  | 'gatesShut'
  | 'gatesOpen'
  | 'floorExit'
  // Update 0.0.13 — an item is yours (value = its index in ITEM_KINDS); bought (value = the same), or not (value = the
  // offer); a chest begins opening, is locked (no key), lets out its loot (value = its item, −1: coins).
  | 'item'
  | 'buy'
  | 'buyFail'
  | 'chestOpen'
  // Update 0.2.0 — a chest starts rising out of the floor (value: its index).
  | 'chestRise'
  | 'chestLocked'
  | 'chestLoot'
  // Update 0.0.16 — the key to use switched (value = its item), a chest's rarity as its lid is up (value = its index in
  // RARITIES), an item falling to the floor (value = the item: a Yeti's key).
  | 'keySwitch'
  | 'chestRarity'
  | 'itemDrop'
  // Update 0.0.17 — a kill bonus taken (value = its index in BONUS_KINDS), a hit that froze (value = the enemy), a
  // weapon slot picked (value = the slot).
  | 'bonus'
  | 'freeze'
  | 'weaponSwap'
  // Update 0.0.18 — floor 2's enemies (value = which enemy; the Blue Demon's warning: its move): the slime swelling and
  // bursting, the frog's warning and its tongue (x, y, z = the tongue's end), the snake's warning and bite, the wasp's
  // warning and sting, the spider's warning, leap, landing and bite, the Blue Demon's warning and fireball (its charge
  // is the Demon's: 'demonCharge', 'demonCrash', 'demonGore').
  | 'slimeWindup'
  | 'slimeBlast'
  | 'frogWindup'
  | 'frogTongue'
  | 'snakeWindup'
  | 'snakeBite'
  | 'waspWindup'
  | 'waspSting'
  | 'spiderWindup'
  | 'spiderLeap'
  | 'spiderLand'
  | 'spiderBite'
  | 'blueWindup'
  | 'blueFireball'
  // Update 0.1.19 — floor 3's: a Skeleton's and a Mushnub's wind-up and blow (value = its slot), a Skeleton falling to
  // pieces and rising again, the Ninja's wind-up and slash, and its teleport (vanishing at x, y, z, then appearing).
  | 'skeletonWindup'
  | 'skeletonStrike'
  | 'skeletonCollapse'
  | 'skeletonRise'
  | 'mushnubWindup'
  | 'mushnubBite'
  | 'ninjaWindup'
  | 'ninjaStrike'
  | 'ninjaVanish'
  | 'ninjaAppear'
  // Update 0.2.3 — the Bone King (value = its slot unless said): its warning (value = the move), a skeleton thrown and
  // smashing where it lands (value = its radius), a jump and its landing (value = which jump: 1, 2), its grab, each of
  // your hits held (value = the hits so far), you breaking free, you thrown at the wall, falling to pieces and
  // rebuilding (its second life starting: its roar), calling up skeletons, its final blast charging, the floor
  // trembling (value = how far charged, 0..1) and the blast (value = its radius).
  | 'kingWindup'
  | 'kingThrow'
  | 'boneCrash'
  | 'kingJump'
  | 'kingSmash'
  | 'kingGrab'
  | 'kingQteHit'
  | 'kingFree'
  | 'kingThrowYou'
  | 'kingCollapse'
  | 'kingRise'
  | 'kingRoar'
  | 'kingSummon'
  | 'kingCharge'
  | 'kingRumble'
  | 'kingBlast'
  // Update 0.2.4 — floor 4's (value = its slot unless said): the Tribal drawing its spear, throwing it, springing aside;
  // a Cactoro digging in, the sand bulging where it'll come up, its ring of spines; the big Cactoro's warning (value =
  // its move), its volley, bursting up under you, shutting itself in its thorns, a blow turned by them; the Hywirl
  // darting aside, gathering its wind, rushing, its gust catching you; the Dino's warning (value = its move), its
  // charge, crashing, a snap (its jaws), its tail, a stomp (value = which), its pounce and landing, its roar.
  | 'tribalWindup'
  | 'tribalThrow'
  | 'tribalDodge'
  // (A Tribal jumping down from its perch to find you, and landing.)
  | 'tribalJump'
  | 'tribalLand'
  | 'cactoroDig'
  | 'cactoroRise'
  | 'cactoroSpines'
  | 'cactoroWindup'
  | 'cactoroVolley'
  | 'cactoroErupt'
  | 'cactoroGuard'
  | 'cactoroBlock'
  | 'hywirlDart'
  | 'hywirlWindup'
  | 'hywirlGust'
  | 'hywirlHit'
  | 'dinoWindup'
  | 'dinoCharge'
  | 'dinoCrash'
  | 'dinoBite'
  | 'dinoTail'
  | 'dinoStomp'
  | 'dinoPounce'
  | 'dinoLand'
  | 'dinoRoar'
  // Update 0.2.4 — the Dino (value = its slot): its crouch, its pounce, its bite, its hop back.
  | 'dinoBlobWindup'
  | 'dinoBlobPounce'
  | 'dinoBlobBite'
  | 'dinoBlobHop'
  // Update 0.2.4 — the Lizard showing itself, spitting, its glob splashing into a puddle; a Green Blob squashing down,
  // hopping, landing, splitting (value = its slot); a Flying Tribal chanting, warding (value = the ally's slot), a ward
  // turning a blow, its feathers; the Skull Orc's warning (value = its move), a swing, its guard turning a blow, its
  // riposte, its leap and slam.
  | 'lizardWindup'
  | 'lizardSpit'
  | 'poisonSplash'
  | 'blobWindup'
  | 'blobHop'
  | 'blobLand'
  | 'blobSplit'
  | 'maskChant'
  | 'maskWard'
  | 'wardBlock'
  | 'maskFeathers'
  | 'orcWindup'
  | 'orcSwing'
  | 'orcBlock'
  | 'orcRiposte'
  | 'orcLeap'
  | 'orcSlam'
  // Update 0.0.18 — the Dragon: a warning (value = its move), the beam starting, a fireball, the wing and the tail
  // swinging, its scream (rising in its show, and raging), an enemy burnt away by the beam (value = its slot).
  | 'dragonWindup'
  | 'dragonBreath'
  | 'dragonFireball'
  | 'dragonWing'
  | 'dragonTail'
  | 'dragonScream'
  | 'burnt'
  // Update 0.0.21 — the Dragon throwing a fire bomb from the sky, a bomb bursting (value = its radius), its flame burst.
  | 'dragonBomb'
  | 'bombBlast'
  | 'dragonBurst'
  // Update 0.1.1 — an execution: the grab (value = the enemy's slot), each slam (value = which), the throw, the landing.
  | 'execGrab'
  | 'execSlam'
  | 'execThrow'
  | 'execLand'
  // Update 0.1.2 — a blow (value = which: execMoves.ts BLOWS), and it bursts or dies where it is (value = its slot).
  | 'execBlow'
  | 'execBurst'
  // M2 — weapons: picked up (value = its uses), dropped, worn out, a throw begun and let go, broken on impact, back
  // on the stand.
  | 'pickup'
  | 'weaponDrop'
  | 'weaponBroken'
  | 'throwStart'
  | 'throw'
  | 'thrownBreak'
  // Update 0.1.4 — the Grimoire: a fireball cast and its burst (value = its charge, s: 0 for a plain one); a charge
  // begun (holding right click), and each second of it (value = the charges so far, each a use).
  | 'cast'
  | 'fireballBurst'
  | 'kiStart'
  | 'kiCharge'
  // Update 0.1.5 — the Gold Axe: sticking in a wall or lying on the floor (value 0: a wall, 1: the floor), turning back
  // for your hand (right click held), caught (value = its uses); the Hammer's smash on the floor (Update 0.1.6: value =
  // the way its half-circle shockwave rolls, a turn about up, radians).
  | 'axeStick'
  | 'recall'
  | 'catch'
  | 'smash'
  // Update 0.1.9 — the Dual Daggers' volley: a dagger thrown (value: the hand, 0 right, 1 left), one hitting something,
  // one sticking in a wall.
  | 'knifeThrow'
  | 'hitKnife'
  | 'knifeStick'
  // Update 0.2.4 — the Pistol: a shot (value: bullets left in the magazine; x, y, z = your eye), where its bullet ended
  // (value 1: on a target, 0: a wall, −1: nowhere in range; x, y, z = there), a bullet landing (value 1); a reload begun
  // (value 1: from empty), its magazine out (value: the bullets it held) and in (value: the bullets now in), the slide
  // let go home (from empty), done.
  | 'gunShot'
  | 'gunTrace'
  | 'hitShot'
  | 'reloadStart'
  | 'magOut'
  | 'magIn'
  | 'slideHome'
  | 'reloadDone'
  // Update 0.2.6 — right click with the Pistol: a whip swung (what it hits is a punch's hit).
  | 'pistolWhip'
  // Update 0.1.12 — an enemy you can execute comes into reach after a while with none (value: its slot): a sting.
  | 'execReady'
  | 'standRespawn';
