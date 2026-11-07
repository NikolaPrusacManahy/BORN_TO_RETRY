# Update 0.5.5 — floor 10's second batch

Status: built (2026-11-07). **Not played, not seen in the game** (no browser here). Checked through renders and real-blow tests. The designer: "Yes, batch 2", then on their looks: "they need Hell design yeah?"

Floor 10's roster is now all its own, with no stand-ins left: the four from 0.5.4, plus these four.

## The four
| | Health | What it does | How you beat it |
|---|---|---|---|
| **Cinder Chicken** (the Chicken, charred, its comb an ember) | 12 | A kamikaze that never waits its turn. It sprints at you squawking. At 2.2 m it stops, its comb flares and a ring on the floor shows its reach, then 0.8 s later it **bursts** (16 to you, 30 to the enemies in it). | Step out of the ring. Or **hit it**: a blow lights it and knocks it off, and lit it tumbles (it won't come back at you) and bursts 0.6 s later wherever it lands, on the enemies there. Killed, its body is flung with the blow and bursts there too. One burst sets off the next Chicken. |
| **Brimstone Bee** (the Armabee Evolved, soot and lava) | 22 | A flier, and the floor's percher. It hovers at 3.2 m, circling you about 6 m off. Every few seconds it rears back and drops a **fire bomb** where you're running to. The landing spot is ringed from the moment it drops, the bomb lands 1.1 s later (14 damage), and it leaves a pool of fire. | Keep moving. **As it drops it dips to 2.2 m, in reach of your fists**: get under it then. |
| **Pit Fiend** (mini boss: floor 1's old Demon) | 300 | It comes back from git with its 0.3.40 moves, at 4.5 m tall (it was 6.5) and with no Grunts called. It walks at you and warns before each move:<br>• **Charge** (head down): a straight run that throws you aside (20).<br>• **Leap** (crouch): it comes down where you stood (22) and a quake ring rolls out (12, jump it).<br>• **Fire fan** (trident up): five orbs.<br>At half health it roars, then warns quicker, pauses less, moves faster, leaps after a charge that runs out, and fires two fans. | Sidestep the charge so it hits a wall: it's stunned 2 s and takes 1.5× from your blows. Punch an orb back. Only a hard blow staggers it. |
| **Spore Lord** (mini boss: the Mushnub Evolved, ashen under an ember cap) | 280 | It plods at you. It shakes out three **burning spore clouds** (2.2 m across, 9 s) that drift your way at 0.8 m/s; standing in one burns you (6 every 0.7 s). It hops and **slams** (16, and a ring: jump it), and bites close in front (16). | **Clouds blow up near fire:** over lava, by a jetting vent, on the Axeman's line of fire, in a fire pool, when a fireball flies through, or by a burst (a bomb, a Chicken, another cloud). The blast hurts you in it (18) and the enemies in it (40), **the Spore Lord too**. So lure the clouds, or the Lord, onto fire. |

## Hell's look
- The three Ultimate Monsters came in their pack's bright palette, so each model's own copy of the palette texture is repainted in code by `tools/hell_paint.py`. Only the colours its mesh uses are changed. It's the pack's art recoloured, nothing generated.
  - **Chicken:** charred black, with an ember comb and wattle.
  - **Bee:** soot black, lava-red stripes, smoke wings, bone teeth.
  - **Spore Lord:** ashen, under an ember-red cap with burning spikes.
- **Kept everywhere:** the eyes.
- **The Pit Fiend** is the old red Demon, unchanged.
- **Flames and effects:** each Chicken's comb burns, higher when lit. The spore clouds are drawn as slow, swirling billows of ashen orange. Bursts and blasts get a ring of fire, sparks and a shake.
- **Sounds:** made in code. The Pit Fiend's are the old Demon's (growl, rising roar, crackle, the landing's boom, the roar). The rest are new: the Chicken's squawk and hiss, the Bee's buzz and the bomb's whistle, the Spore Lord's puff, and the blasts.

## Executions
They use the moves of their pack-mates' rigs: the Chicken the Slime's, the Bee the Wraith's, the Pit Fiend the Blue Demon's, the Spore Lord the Mushnub's. All four pass the execution test.

## Rooms
- Floor 10's mini bosses are now only the Pit Fiend and the Spore Lord. The Yeti and the Ninja stand-ins are gone.
- Brimstone Bees take the perches' place. In 30 test floors, floor 10's rooms had no perches, so that rule hasn't been exercised there yet.
- The source `.blend` files moved from `ASSETS/…/unused_monster` to `used_monster`: Chicken to `blobs/`, Armabee_Evolved to `flying/`, Demon and Mushnub_Evolved to `mini_boss/`. The pack's sorting rule moves a monster there once it's in the game.

## Different from the plan, or decided on the way
- **The Bee hovers lower than planned** (3.2 m) and dips to 2.2 m as it bombs. Higher up and backing off as you come, it would have been out of reach of your fists.
- **A Chicken lit by a blow doesn't run back at you:** it tumbles where it was sent. In a first try it did, and burst in your face. A trace showed it, and a test now holds it.
- **Spores catch fire from lava, vents, the Axeman's line, fire pools, fireballs and bursts.** The plan named only vents and lava.

## Numbers
All placeholders, in F1 → **Hell fighters 2**.

## Tests
- **New:** `tests/test-hell-fighters2.ts`, 37 checks, by real blows through the fight's step where a blow matters:
  - a jab lights a Chicken and knocks it into an enemy;
  - a sword kill flings one;
  - the Bee punched as it dips;
  - the Pit Fiend shrugging off a jab, but taking 1.5× stunned against a wall;
  - each cloud igniter: lava, a fireball, a Chicken's burst, a jetting vent.
- **Expected values changed (on purpose):** floor 10's roster has no stand-ins now, in `test-hell-fighters.ts`. The lobby bestiary's floor 10 shelf now shows eight, in `test-lobby.ts`.

## Still to do, when you say
- The echo rooms (earlier floors' enemies, hell-touched).
- Hellwarden calling Imps.
- Recorded sounds from the Sonniss library.
