# Update 0.5.4 — floor 10's own fighters

Status: built (2026-11-07). **Not played, not seen in the game** (no browser here). Checked through renders and real-blow tests. The designer:

> we need enemies in Floor 10 / what do you suggest?

I suggested a roster from `MD/FLOOR10_HELL_PLAN.md`, starting with its four Bestiary enemies. The designer: "Yes, start".

## The four
All four are the Bestiary pack's monsters, with the Animation Library's clips baked on (`tools/ual_bake.py`) and each with its own weapon in hand. Every blow lands at the moment its weapon reaches furthest in its clip, measured with `tools/foe-poses.ts`.

| | Health | What it does | How you beat it |
|---|---|---|---|
| **Imp** (lanky, spiked mace) | 30 | Circles you a little way off. Two quick mace swings, or a four-blow combo. From 5.5 m or more, a fireball from its left hand. A blow about to land, about 3 times in 10 it's gone in a puff of smoke and behind you, swinging; otherwise it may side-step. Comes in threes. | Punch the fireball back. Hit it after its combo, when it's open. Turn as it vanishes. |
| **Puglin** (squat, tusked, club; 1 m tall) | 20 | Comes in packs of four. They never wait their turn: the whole pack crowds you with quick little clubbings. From 3 to 8 m one rushes you, club out, and on through. | Three jabs each. A sideways dash slips the rush. Don't get surrounded. |
| **Bone Axeman** (horned helm, great axe) | 42 | Slow. Walks at you, then stands its ground, turning to you only so fast. A jab doesn't make it flinch; a sword slash or harder does. In front: an overhead chop. From 3 m or more: it leaps and splits the floor in a **line of fire** straight ahead. The line shows on the floor for 0.7 s first, runs up to 7 m (stopping at a wall), and burns for 1.6 s. Behind it or beside it: a spin all round. | Step off the line or jump it. Get behind it, but not for long. Punish after the chop. |
| **Bone Guard** (helm, sword) | 36 | Walks at you, then plants with its **guard up** (sword across it). It turns to you slowly. Every blow from in front glances off with a ring of steel; after two turned, it ripostes at once with a rising cut that throws you up. A cut and a three-cut combo. | Circle it and hit from the side or behind. Hit it while it swings or right after. A heavy blow breaks its guard. So does a parry, whose 60-damage counter usually just kills it. Broken, it reels, and its guard stays down 1.8 s. |

**Heavy enough to break the guard (28 or more):** the axe (30), the hammer, a charged weapon blow, the Demon's overhead (48). **Not heavy enough:** jabs, a sword's slash (22), the daggers, the Demon's first two slashes (26), Gravity Sean's punches.

**Never tankier:** all four are inside the earlier floors' range for regular enemies. They're harder by how they fight.

## Their rooms
- Floor 10's roster: Imp, Puglin, Bone Axeman, Bone Guard.
- Its mini bosses are still stand-ins (the Yeti, the Ninja) until its own exist. The perchers are still Tribals.
- Imps always come in whole threes and Puglins in whole fours (`warbandWaves.ts`). Across 30 test floors, no wave broke a pack.
- Who waits their turn: Imps and Bone Guards close in on their turn, the Axeman as a heavy, and Puglins never wait.

## Executions
Done the 0.3.40 way. The Orc's lift, hang, flail and fold reactions are baked straight onto each model, since they're on the Library's own skeleton. Your hands do the Orc's move, and they burst into head, arms and legs. The rendered hang and flail look right.

## Seen and heard
- **The floor split:** a glowing strip on the floor while the Axeman leaps, brighter and pulsing faster as it comes. Then flames along it, a fire ring, chunks, and the view shakes nearby.
- **The Bone Guard:** sparks off its guard, more when it breaks.
- **Sounds:** made in code for now, like floor 8's were. These are placeholders until recorded ones are picked from the Sonniss library: mace and club whooshes, a fireball's roar, the Axeman's rising growl before the split and the boom after, steel ringing on the guard, a crack when it breaks.

## Different from the plan
- **The Bone Guard ripostes after two blows are turned, not after "a whiffed punch".** Enemies can't see a punch that hits nothing. The lesson is the same: don't keep swinging into its guard.
- **"A charged punch breaks the guard":** barehanded punches haven't charged since 0.3.5 (right click is the parry). So it's a heavy blow or a parry.
- **The Puglins don't leap over belts yet.**
- **Bone Axeman's poise:** only a blow of 12 or more makes it flinch, so jabs don't stop its swings. Its health is untouched. Say if you'd rather it flinch like the others (F1 → Hell fighters → Bone Axeman stagger, 0).

## Numbers
All placeholders, in F1 → **Hell fighters**: health, speeds, every blow's damage, the blink and side-step shares, pack sizes, the split's length, width, burn and life, the guard's arc, break and riposte.

## Tests
- **New:** `tests/test-hell-fighters.ts`, 34 checks, blows thrown as you'd throw them through the fight's own step. It covers:
  - the roster, and that none of the four is tankier than the earlier floors;
  - their models, every clip each plays and their weapons, each strike timed by its clip;
  - where each waits between blows being in reach of one of its blows;
  - the Imp's blink behind you;
  - the Puglin pack all going at once, the rush, and three jabs to drop one;
  - the Axeman shrugging off a jab but not a slash, its chop in front and spin behind, and its line (shown first, burning, a side-step clear, stopping at a wall);
  - the Bone Guard turning jabs and slashes from in front, its riposte, a jab from behind landing, the axe breaking its guard, its guard down then up, and the parry;
  - the packs in its rooms.
- **Caught on the way:** the Puglins first circled at 2.2 m with clubs that reached only to 2.2, so half of them never swung. Fixed, and the reach check above now holds it.
- **Expected values changed (on purpose: floor 10 has its own now):** `test-lobby.ts`. Floor 10's bestiary shelf is its four, not empty, and no bestiary row says COMING SOON any more.

## Still to do, when you say
- The second batch: Cinder Chicken, Brimstone Bee, the Pit Fiend (the old Demon back as a mini boss), the Spore Lord.
- The echo rooms (hell-touched versions of earlier floors' enemies).
- Hellwarden calling Imps.
