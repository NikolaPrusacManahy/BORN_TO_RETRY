# Update 0.3.75 — how the Demon feels (phase 4 of 5, without its light)

Status: built (2026-11-06). The designer: "Start phase 4". From `enemy_bibles/Born to Retry — Playable Demon.docx`, its First-person feel.

The bible's sword light is the next update on its own (`U0376_SWORD_LIGHT.md`), so its frame rate can be judged alone. Its other feel items were already in: the arms (0.3.70), the metallic scrape on the combo (0.3.71), the heartbeat and silence before Last Verdict (0.3.73).

## What it adds
| The bible | What it does | Numbers (placeholders, F1's The Demon tab) |
|---|---|---|
| "Freeze 2–4 frames on every sword hit, plus a small camera shake" | Slashes had it. Now also Ember Wave, the thrown sword and its return, and Brand of Ruin's pillars, for each thing they hit. Every one of these already shakes the view | Slash 45 ms, overhead 110 ms, Lunge 30 ms, the rest 35 ms |
| "Lower-pitched footsteps" | A heavy step every stride on the ground: the landing's recording, lowered | Every 4.2 m (about 3 a second at a run); pitch 0.62; volume 0.3 |
| "A slight camera bob" | Each step dips the view, and the arms with it | 0.03 m |
| "Enemies that flinch or back off as you approach" | Ordinary enemies coming within reach lose their nerve: half flinch, half get shoved back | 4.5 m; each one at most every 7 s |
| "A forge hiss as heat rises" | A thin hiss rising with heat, fastest as it nears full. Silent through Last Verdict | At most 0.09, under a wall run's scrape |

## Decisions
- **Footsteps exist only for the Demon.** You took them out of the game before ("no need in this game"), and the bible asks for these, so Joseph stays silent. Say if the Demon's should go too.
- **Who loses their nerve:** only something walking at you. Never out of an attack, never a boss or a mini boss, and nothing that never flinches from a blow (a Kraken Tentacle). Each at most every 7 s, so it's a feeling and not a stun lock. It does make fights easier; that's phase 5's to weigh. "Presence: range" at 0 turns it off.

## How it's built
`sim/combat/presence.ts` (the feet and the nerve), `MoveSounds` (the step, the hiss), `CameraRig.heavyStep`. A test runs every ordinary kind through a flinch to be sure each comes out of it, since until now only a blow could start one.

## Still open
Not heard or felt by me: these are numbers until you've played it. All placeholders until phase 5.

## Tests
`tests/test-demon-feel.ts`.
