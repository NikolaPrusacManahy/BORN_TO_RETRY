# Update 0.2.10 — Floor 5, the Drowned Temple

Status: built (2026-10-31), for the designer to play: F8 Lab → Floor 5 (Play), Drowned King (Room). The designer: "let's design Floor 5 … with the assets we have and the 4 previous
floors done, what design and how difficult floor 5 will be … suggest a themed floor". Claude proposed the Drowned Temple
(and the Frozen Depths, the Aerie); the designer: "Drowned Temple". The design below is Claude's proposal as accepted;
its numbers are placeholders on knobs.

## How hard
The curve the designer set already makes floor 5 the hardest yet: **7 fight rooms** on the way (floor 4: 6), **12 to
30 enemies a room** (floor 4: 12 to 27), the challenge room 6 more with 10 on the field and 2 mini bosses. No more
damage than floor 4: it's harder by its mix (attackers you can't see coming but can read, the tide) and by knowledge.

## The look
- Floor 3's stone, wet and mossy (its pieces recoloured, as the desert's were): grey-green walls, darker floor.
- Open to the sky under a pale grey-green haze: as bright as the others.
- Weeping willows growing from beds of mud, mossy rocks, stumps and logs along the walls, lily pads on the water.
- No pits: the deep pools first built in some rooms (the lava pits' rules) were taken out (the designer: "remove those
  water pits you added, no need for them"). The lily pond, the cloister and the altar are open floor there now; the
  twin pools became the twin banks (two long dry banks, 1 m).

## The tide
- Every fight room floods and drains on one clock: low water (8 s), then a horn and the water rising (2.5 s), high
  water (10 s), the water falling (2.5 s).
- At high water the low floor is knee-deep: wading, you move at Wading of your speed (0.7). Ledges, perches and
  islands stay dry: the high ground matters again.
- The start room, the shop, the corridors and the boss room don't flood (the boss floods its own).

## Enemies (all new models)
- **Snapper** (the Fish blob): at high water it swims under, only its fin showing, and comes up under you with a bite
  (the water rings where it'll surface: step away). At low water it flops after you and lunges.
- **Urchin** (the Green Spiky Blob): rolls at you, spikes out; stops, spikes still out; then its spikes go in and it
  can be hit. Hitting it spiked hurts you.
- **Jelly** (the Pink Blob): drifts to you and glows, then shocks the water: at high water it reaches far through the
  water (anyone wading), at low water only close by.
- **Glub** (flying): keeps its distance and spits water bolts, two at a time.
- **Big Glub** (Glub_Evolved, flying): the floor's percher, on the high perches: lobs bubbles that burst where they land.
- **Squidle** (flying): dives at you; if it reaches you it sprays ink over your view (2 s).
- **Spawnling** (the Alien blob): small and fast, weak, many.

## Mini bosses
- **The Deep One** (the Alien, big): a tentacle lash along a line (it glows first): caught, you're dragged to it and
  slammed; a claw combo close up.
- **The Bog Brute** (the Monkroose): at high water it dives and comes up under you with a slam that rings out a wave;
  at low water it leaps and slams.

## The boss: the Drowned King
The Fish (big), 6 m, 2000 health, a gold crown on its head (the RPG pack's), never flinches. Reworked in this update
(the designer: "let's make them moves frustrating and challenging … use the water, use water based moves … spawn only
one wave of smaller minions, once only, not infinite … make him different in phase 1 & 2"). Its room floods knee-deep
(0.45 m) as it rises out of its portal, and down into the water it goes.
- **Phase 1, beneath** (above 50%): it's under the water, out of reach of every blow, circling you 9 m off (only its
  great fin shows). Every 1.8 s it strikes from there:
  - **Ambush**: its fin comes at you; the water rings under you (0.8 s: step out) and it bursts up jaws first (28,
    thrown).
  - **Undertow**: a swirling ring opens where you stand and the water drags you into it for 2 s (5.5 m/s: wade or
    dash out; a jump takes your feet out of the water); then it bursts up there (28).
  - **Jet**: it comes up wherever it is, rears (0.8 s) and sweeps a jet of water across you at the water's height,
    from one side or the other (110°, 24 m, 1.3 s: jump it; 20, thrown).
  - Only after each is it up to be hit: 1.6 s after coming up, 1.4 s after its jet; then it sinks again.
- **Phase 2, risen** (below 50%, the next time it's up): it roars and rises for good, raises the water deeper (0.75 m:
  you wade at 60% of your speed) and calls its **brood: 6 Spawnlings, once**, never again. It wades at you; every 1.4 s:
  - **Tidal wall**: a wall of water too high to jump rises at it (1.1 s) and rolls across the room (9 m/s) with one gap
    in it, somewhere up to 6 m either side of you: get to the gap (30, thrown).
  - **Surf**: it sinks into a wave (0.8 s) and surfs straight at you (17 m/s, turning after you a little: 26, thrown);
    into a wall or a column it's stunned 2.2 s, and hits do more. Bait it.
  - **Geysers**: 5 in a row, 0.35 s apart, each where you stand as it's called, the floor ringing 0.7 s before it
    bursts (16, thrown high). Keep moving.
  - **Bites**, close up: twice, the second quicker (24 each).
- Dead, its water drains; its chest has 15 coins, a key and a heart, as every boss's.

## Placeholders (Claude's)
Every number, the names, the sounds (made in code until recorded ones are picked), the colours, the rooms' layouts.

## What was built
- The look and the tide: `styles.ts` (`DROWNED`), `sim/dungeon/tide.ts`, `tuning/tide.ts`, `engine/waterView.ts`;
  10 rooms in `drownedRooms.ts`; willows, mossy litter and lily pads (the kit, `export_dungeon_kit.py`).
- The enemies: `snapper.ts`, `urchin.ts`, `jelly.ts`, `glub.ts`, `squidle.ts` (and the Spawnling), `deepOne.ts`,
  `bogBrute.ts`; knobs `tuning/foes5.ts`, `foes5b.ts`; numbers `kinds5.ts`; effects `drownedFx.ts`,
  `drownedFeedback.ts`; sounds `drownedSounds.ts`; the ink `Hud.tsx`.
- The boss: `drownedKing.ts` (its two phases), `drownedKingMoves.ts` (beneath), `drownedRisen.ts` (risen),
  `tuning/drowned.ts`; its water `CombatState.flood` (the tide in its room: `run.ts`), the undertow's drag
  `PlayerState.current`; geysers are bombs (`look: 'geyser'`); its brood once (`bossRoom.ts`); its jet and tidal wall
  drawn by `drownedKingFx.ts`; sounds `drownedKingSounds.ts`; its model `drowned_king.glb` (`export_monster.py --crown`).
- Tests: `test-floor5.ts`, `test-floor5-foes.ts`, `test-drowned-king.ts` (beneath), `test-drowned-risen.ts` (risen).

## Not changed
The run's length (7 floors), the enemy counts' curve, the shop, chests and keys.
