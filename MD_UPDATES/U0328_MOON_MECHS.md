# Update 0.3.28 — the Moon's four mechs, mini bosses all

Status: built (2026-11-03). The Moon's boss was to be the three mechs together (the Moon plan, 2026-11-02). The
designer chose the Bestiary pack's big alien, Tidebreaker, as the Moon's boss instead (its own update, next), and of the
mechs: "Mechs as minibosses, they are all the same just different looks, Bee is already there, just add the remaning 3
as identical functions as bee mech".

## The mechs
- **The Flamingo's, the Fox's and the Frog's mechs** join the Bee's as the Moon's mini bosses. Each is the Bee mech in
  everything but its look (`mech_flamingo.glb`, `mech_fox.glb`, `mech_frog.glb`, made in 0.3.17 for the planned boss):
  it walks at you and kicks close in; it jumps and glides on its jets out of reach, firing salvos of homing missiles;
  it comes down near you (its landing hurts close by) and holds there 1 s, its cooldown. The same health, speed, size
  and numbers (F1 → Moon mini bosses). Its wind-up glows its animal's colour (pink, orange, green).
- **Broken, its pilot climbs out** as Barbara does from the Bee's: **Fernando the Flamingo**, **Rae the Fox**, **Finn
  the Frog**, each fighting as Barbara (a blaster from range, quick punches close in), Barbara's health and coins, and
  executable and pinnable like her. They wear their astronauts' models, the same as the Gunner's, the Flanker's and the
  Leaper's.
- **How often:** the four mechs share what the Bee's mech alone was given, a quarter each: a Moon room sends a mech as
  often as before, now in one of four looks. The Bee's ship is as before.
- Never tankier: no new numbers.

## Elsewhere
- **The floor loads each mech's pilot with it** (`BRINGS`).
- **The death screen:** "The Flamingo Mech", "Fernando the Flamingo", "The Fox Mech", "Rae the Fox", "The Frog Mech",
  "Finn the Frog".
- **The lobby's bestiary** shows the three new mechs on the Moon's row (twelve plinths now, the most a row holds before
  the boss's plinth). Their pilots aren't shown again: they look as the Gunner, the Flanker and the Leaper already on
  that row do (Barbara stays beside the Bee mech).
- **The Lab:** a floor's mini bosses two to a row (the Moon has five now: its ship and four mechs), so its column still
  fits. The Moon's enemies have proper names there now (they showed their code names: `beeMech`…).

## What was built
`sim/enemies/kindsMoon.ts` (the kinds, `PILOT_OF`), `beeMech.ts` (each mech and pilot its own name), `enemy.ts` (a
broken mech becomes its pilot), `update.ts`, `kinds.ts` (mini bosses), `tokens.ts`, `flight.ts` (pinnable);
`sim/combat/execMoves.ts`; `sim/dungeon/wavePlan.ts` (the roster, the shares), `floorKinds.ts`; `sim/lobby/collection.ts`;
`engine/enemyLooks.ts`, `bloodLooks.ts`; `screens/deathText.ts`, `labLists.ts`, `LabPanel.tsx`;
`ui/theme/theme-19-lab.css`. Tests: `test-floor8-crew.ts` (the three mechs: their numbers, moves, pilots, names),
`test-lab.ts` (rows), `test-lobby.ts` (a row's room), `fakes/execRig.ts`.

## Checked without a browser
Tests: each new mech is a mini boss with the Bee mech's numbers; it jumps, glides, fires its own salvos and comes down
near you; broken, its own pilot climbs out with Barbara's health and fights on foot; pilots executable and pinnable,
never sent; names; the Lab's columns and the bestiary's rows fit. **Not yet seen in the game**: the three mechs' looks in
a room, their pilots climbing out.
