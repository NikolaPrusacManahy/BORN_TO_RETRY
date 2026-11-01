// Update 0.1.4 — the combat events (moved out of state.ts, which re-exports them, to keep it short). What each one's
// value and x, y, z mean is next to it.
import type { Floor2Event } from './events2';
import type { DrownedEvent } from './events5';
import type { FishEvent } from './events6';
import type { CardEvent } from './eventsCards';

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
  // The targets. Update 0.3.3 — a shot punched back (value: its slot; parry.ts).
  | 'telegraph'
  | 'orbFire'
  | 'orbPop'
  | 'orbHitPlayer'
  | 'parry'
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
  // darting aside, gathering its wind, rushing, its gust catching you; the Velociraptor's warning (value = its move),
  // its charge, crashing, its pounce and landing (value = the move: its own, a feint's, a lunge, the wall dive), its
  // roar (its entrance).
  // Update 0.2.8 — the Velociraptor's new moves (value = its slot unless said): a real charge's scrape (value = which),
  // a feint stopping dead, its sand kick (value 1: it caught you), its sprint to a wall, its claws on the wall, calling
  // up its sandstorm, its screech (value 1: it took your dash), its blitz, a slash (value = which), reeling (hit
  // mid-blitz); its pin (sim/combat/pin.ts; value = the bite unless said, x, y, z its jaws): pinning you (x, y, z: you),
  // a bite's glow, your twist out of it, a dash wasted too early, a bite on nothing (value = dodges so far), a bite on
  // you, kicked off (value = its slot), letting you go (value = its slot).
  | 'tribalWindup'
  | 'tribalThrow'
  | 'tribalDodge'
  // Update 0.2.7 — floor 3's newcomers: the Dragonling's warning (value: 0 a burst, 1 a spit in your face), a fireball,
  // its dart off; the White Rabbit's warning (value: 0 a bonk, 1 a throw), its bonk, its carrot thrown; the Big
  // Mushnub's warning (value: 0 smash, 1 spin), its smash, its spin, its split into Mushnubs. (The Skull Wraith's
  // teleports are the Ninja's vanish and appear.)
  | 'bratWindup'
  | 'bratSpit'
  | 'bratFlit'
  | 'rabbitWindup'
  | 'rabbitBonk'
  | 'rabbitThrow'
  | 'mushWindup'
  | 'mushSmash'
  | 'mushSpin'
  | 'mushSplit'
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
  | 'dinoPounce'
  | 'dinoLand'
  | 'dinoRoar'
  | 'dinoScrape'
  | 'dinoFeint'
  | 'dinoKick'
  | 'dinoSprint'
  | 'dinoClaws'
  | 'dinoStorm'
  | 'dinoScreech'
  | 'dinoBlitz'
  | 'dinoSlash'
  | 'dinoReel'
  | 'dinoPin'
  | 'pinCue'
  | 'pinTwist'
  | 'pinWasted'
  | 'pinSnap'
  | 'pinBite'
  | 'pinFree'
  | 'pinDone'
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
  | 'standRespawn'
  // Update 0.2.10 — floor 5's (events5.ts); Update 0.2.11 — floor 6's (events6.ts); Update 0.2.16 — the Fate Cards'.
  // Update 0.2.23 — floor 2's (events2.ts: the Dragon's, moved there, and the Venom Garden's).
  | Floor2Event
  | DrownedEvent
  | FishEvent
  | CardEvent;
