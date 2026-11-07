# Update 0.5.2 — the records screen

Status: built (2026-11-07). The designer saw the first look and said: "a bit cleaner please, a lot s impossible to even read". The section after the tables covers the second look, which hasn't been seen yet. The designer:

> put a panel after the demon that shows progression
> - press E near the screen and it becomes a computer desktop and you can follow your stats
> * desktop apps that matchs the vibes of the lobby designs
> * playtime, death counts, cards collected in total, how to unlock, how many times you used a character, tracks how many Grunts, spitter, snakes.... you killed. the whole list, how many executions in total etc etc

## The panel
- **Where:** on the hall's west wall past the end of the dais, after the Demon's figure. It sits between the two torches there at z 3.25, as the stretch nearer the Demon has a torch on it.
- **What it is:** one of the lobby's dark boards with a thin gold edge, saying RECORDS and "Your runs, kills and unlocks".
- **E:** near it the card says "RECORDS, [E] to open". E plays a click and a rising hum, holds the lobby, frees the mouse and opens the desktop.

## The desktop
The manor's stone for a wallpaper, lit warm in the middle, the manor's seal faint over it, in the lobby's pixel face, brass and dark.
- **Apps:** icons down the left. Each opens a window you drag by its title bar; the top window has the brighter frame.
- **Taskbar** along the bottom: the open windows, the time, and Leave.
- **Leaving:** Esc or Leave closes it. Esc can't lock the mouse again (browsers don't allow it), so you land on the lobby's pause menu, as when you turn back at the gate.

**Its five apps:**
| App | Shows |
|---|---|
| Ledger (opens with it) | Time played, runs (by difficulty), runs cleared (by difficulty), deaths, enemies killed, executions, chests opened, cards taken, the deepest floor reached, the fastest clear |
| Bestiary | Every enemy, floor by floor as in the manor's bestiary, its boss last, with how many you've killed. Those not killed yet are dim. A kill of anything the bestiary doesn't list goes under Others. |
| Deck | Every card, Joseph's and Gravity Sean's, with how many times you took it; how many in all; how many different ones of the 109 |
| Roster | Each character and how many runs you've played as them; how to unlock the locked ones |
| Unlocks | ARE YOU EVEN HUMAN?, Gravity Sean and the Demon: how to open each, and a bar of how far you've got (the Demon's out of 5) |

## Cleaner, after the first look
- **Its size:** the desktop grows with the screen, as the HUD does: the same share of it as at 1080p, times your Interface size. Before, it was drawn in fixed pixels, which came out small on a big screen.
- **Bigger type:** nothing is set smaller than 0.75 of the desktop's own size.
- **More contrast:** cards and enemies you haven't got yet are a warm grey, not near-black. Every text colour is at least 6.7 : 1 against the windows (WCAG asks 4.5).
- **One shelf at a time:** the Bestiary has a tab per floor, and the Deck a tab per kind (Fate, Traitor, Death, and the same three for Gravity Sean).
- **Colours:** each card's rarity is written in its rarity's colour.
- **Unlocks:** each count now sits beside its bar, not inside it.

## What's counted
- **When:** a run counts as it goes and hands its record to the save once, when it ends (death or clear) or is left (to the main menu, Restart).
- **Playtime** is time in runs, as the death screen counts it: not the lobby, not paused.
- **A run** counts for the character and the difficulty it was played on.
- **Kills** count by enemy kind.
- **Cards taken:** a card taken again as II counts twice.
- **Deaths:** a fall on WEAKLING EXPERIENCE, which sends you back to a checkpoint, now counts as a death, so Hellwarden's "Forged from the N times you fell" counts those too (**my call**).
- **The Lab** counts nothing.
- **Old saves** start with an empty record; deaths and clears they already had are kept.

**Not counted:** a run left by closing the browser tab mid-run, as nothing gets the chance to hand it in.

## Tests
- **New:** `tests/test-records.ts`. It checks the counting through real kills, a real execution, cards taken and a chest opened; the save adding it up; the panel's place (and that nothing hangs where it does); and what each app lists. It also draws the desktop as HTML.
- **No expected values changed.**
