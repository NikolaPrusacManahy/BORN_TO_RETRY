# Update 0.2.12 — The alpha (floors 1–5, difficulties, checkpoints)

Status: built (2026-10-31). The designer: "I want to have a Alpha version of this game, I will publish it to netify and
let like 4 players try the game for a bit, allow room 1 to 5 only, don't include 6 yet", with these changes.

## Floors 1–5 only
- Floor 5's way down ends the run, as floor 7's did: the "you survived" screen (`LAST_FLOOR` 5 in `runLinks.ts`; the
  game's is 7, to put back when floor 6 ships). Floor 6 stays in the code and in the dev Lab; no tester can reach it.

## Weapons
- **The Pistol**: 60 rounds (was 40; 8 a magazine). **Uncommon**: it's in uncommon chests now, with the Gold Armour and
  the Great Heart (before, nothing in a run gave one: only the Lab). Its chest look is the Guns pack's pistol
  (`export_items.py --guns`).
- **The Grimoire**: 50 charges (was 25).

## Difficulties (the designer's rules)
- **WEAKLING EXPERIENCE**: easy, no one-life punishment. Dead, you're back at your checkpoint (below), full health,
  everything you carry kept (coins, rings, keys, the weapon in your hand); the fight you died in starts over when you go
  back in (the boss's too: its show again, full health). No death screen.
- **THE REAL EXPERIENCE**: the game as it was: one life; dead, the death screen, Retry is a new run.
- **ARE YOU EVEN HUMAN?**: "very hard and players only has fist, no other weapons, no coins, no chest, no keys … no
  shop, no reward, no sword drops … one life too". A kill gives nothing but the Execution meter: no coins, no sword, no
  key, no bonus; no chest ever rises (the rooms', the challenge room's, the boss's); the shop is empty; the challenge
  room gives no reward (it opens once it's won). Executions still heal (the designer: "executions always heals"). One
  life.
- **The gate mocks WEAKLING** (the designer: "give a mocking pop-up for the weakling experience"): three questions
  before it lets you through: "Hmm? Not feeling like playing properly?", "Bro, just play it normally", "Alright
  “Weakling”, go on and enjoy your run…" (the answers are Claude's: on through, or back into the lobby).

## Checkpoints
"respawns from lava pit and dying in general, you just respawn just in front of the room you just died, where is says
"Room" or "Boss", maybe add a saving checkpoint". Going into a fight room or the boss room saves a checkpoint: just
outside the door you came in by, under its sign, facing in.
- **Lava** (every difficulty): burnt as before, then back at the checkpoint (it was the floor's start); the fight you left
  starts over.
- **Dying** on WEAKLING: back at the checkpoint. (On the others a death still ends the run.)
- Before the first fight of a floor, the checkpoint is the floor's start.

## Boot screens, labels, credits
- **The studio's logo at the start** (the designer: "We need the NIKO GAME COLLECTION studio logo at the start, plus the
  Play in full screen for better experience … click the screen and it will make it faster like 0.5 … by default is 3
  sec", shown with a recording of Last Ward's): Last Ward's boot screens, ported. Black; "DEVELOPED BY / NIKO GAME
  COLLECTION" typing itself out (the designer's `studio_gif_new.gif`: "new gif for the logo, try it"; as
  `public/ui/studio.gif`, its loop flag taken out so it plays once, 5.25 s), held 0.75 s more, faded; then
  "[F11] Play in full screen for a better experience", held 3 s, faded into the main menu. A click (or any key but F11)
  fades the card that's up within 0.5 s. No headphones line (the designer: "no need for headphone message, just full
  screen").
- **"Alpha v0.2.12"** bottom right on the main menu (the designer: "Alpha version label is good").
- **The lobby's credits**: models and sound only (the designer: "no need to credit font and code"); two boards.
- **Characters not playable yet** say "Coming soon", not "Locked".

## What was built
`runLinks.ts` (`LAST_FLOOR`), `tuning/gun.ts`, `tuning/weapons.ts`, `loot.ts` and `items.ts` (the Pistol as an item),
`export_items.py`; `sim/dungeon/checkpoint.ts` (the checkpoint, a boss fight starting over), `roomLoop.ts`
(`DungeonRun.checkpoint`), `runBase.ts` (`respawn`, the difficulty, no shop), `run.ts`; `CombatState.bare` (`strike.ts`,
`treasure.ts`, `roomLoop.ts`); `GameBase.runDifficulty` passed to each run; `difficulty.ts` (WEAKLING's questions);
`state/creditIntro.ts`, `screens/CreditIntro.tsx`, `theme-32-credit.css` (the boot screens); `MainMenu.tsx` (the label);
`credits.ts`, `spots.ts` (two boards); `promptView.ts` ("Coming soon"). Tests: `test-alpha.ts`, `test-credit.ts`.
