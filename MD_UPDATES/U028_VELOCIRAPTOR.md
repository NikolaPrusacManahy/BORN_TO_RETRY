# Update 0.2.8 — the Velociraptor's new moves

Status: built (2026-10-30). The designer, after playing floor 4's boss: "After testing the Floor 4 boss, the
velociraptor, it does not feel great, I am sure the moves are still in placeholders but my idea now is to have moves
sets that were not in the game yet, coming from a boss of course. Make a challenging boss, what do you suggest?"
Claude proposed seven moves in three phases; the designer: "Build all of them".

They replace its old moves (bites, tail sweep, stomps, the pounce, the roar that called its pack, the charge held while
you dash). Its charge and pounce stay as building blocks. 1800 health, 5 m, never flinches; a wall or a column still
stuns its charge.

## Phase 1, the hunt
- **Feint charge.** It lowers its head (0.8 s). A **real** charge **scrapes the sand twice** in that warning, then
  charges (steering after you). Half its charges (Feint chance) are **feints**: no scrapes; at the end of the warning
  it **stops dead** (0.2 s), then **pounces where you went** (a ring glows where it'll land). Read: scrapes → dodge the
  charge late; silence → don't dodge yet, dodge the pounce.
- **Wall launch.** It crouches (0.45 s), **sprints to the nearest wall or column** (4–18 m off), **claws its way up**
  (0.35 s, claws scraping stone: the warning) and **dives at you** off it (0.7 s, its landing ring glowing), 26.
- **Sand kick.** It **turns its back** to you and scrapes (0.65 s; it stops turning after 60% of that), then kicks sand
  out behind it (14 m, 30° either side). Caught (no wall between, not dashing): **your view is blurred with sand for
  2 s**, 6 damage, and it **charges at once** (a real charge: you hear its scrapes). Step aside once it's turned.

## Phase 2, the frenzy (below 50%: Velociraptor frenzy at)
Quicker in everything (×1.2).
- **Sandstorm stalk.** At once, then every 22 s after one ends: it rears up and screeches (1 s); a **sandstorm** for
  8 s closes your sight to **8 m** (the haze sand-coloured, the sky too). It **circles you 12 m off**, out of sight,
  **its eyes glowing through the storm**; every 2.6 s it **hisses** (0.5 s) and **lunges** out of it at you (22).
- **Pin.** In its frenzy it also **pounces** at you (0.5 s crouch, 0.8 s flight). Landing on you (not mid-dash) it
  **pins you**: you're held, looking up at its jaws, the world holding still. It bites every 1 s; each bite's jaws
  **glow 0.35 s** before it lands: **dash in the glow** and you twist out of it; **dash before the glow and that bite's
  dodge is wasted** (TOO SOON). **3 dodges kick it off** (stunned 2.4 s); after **5 bites** it lets you go (14 each,
  so 70 if you dodge none). A feint's pounce pins too. The screen: your dash's key, dim while you wait, lit with DASH!
  in the glow; a pip per dodge; KICKED OFF / LET GO as it ends.
- **Deafening screech.** It rears up and draws breath (1 s). Caught **in the open within 30 m** (no wall or column
  between you): **no dash for 3 s** (the dash bars grey and struck through, your ears ringing); then it charges (a
  real one).

## Phase 3, the blitz (below 25%: Velociraptor blitz at)
- **Afterimage blitz.** At once, then 35% of its picks. It drops low (0.35 s, glowing), then blurs at you in **3
  zig-zags** (0.22 s each) with **two afterimages**, the three fanning out to end round where you stood (3.5 m apart).
  **Only it casts a shadow** (the afterimages none; it also gets a dark shadow on the sand, so the tell holds with the
  sun's shadows off). There it **slashes 3 times** (0.28 s apart, 12 each, one after another). **Hit it** (not an
  afterimage: they're only pictures) before its slashes are done and it **reels, stunned**.

## Picks (placeholders)
- Hunt: close (≤7 m) kick 50%, charge 30%, wall launch 20%; between: charge 50%, wall 30%, kick 20%; far (>16 m):
  charge 50%, wall 50%.
- Frenzy: close: pounce 35%, kick 30%, charge 20%, screech 10%, wall 5%; between: charge 30%, pounce 25%, wall 20%,
  screech 20%, kick 5%; far: wall 35%, charge 30%, screech 20%, pounce 15%. The sandstorm whenever its gap is over.
- Never the same move three times running.

## (placeholders)
- Every number (F1 → Velociraptor). Testing tip: Velociraptor frenzy at 1 starts its frenzy at once; Velociraptor
  blitz at 1 its blitzes.
- Sounds made in code, plus the library's Demon charge/crash/slam/roar, the Dragon's scream (its screeches), the
  Leaper's hiss (before a lunge), a bite, a blade's swing.
- The pin's framing (you look up at its jaws from just in front of it) was checked in a flat-shaded Blender render
  only.
