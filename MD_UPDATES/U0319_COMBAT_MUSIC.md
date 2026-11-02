# Update 0.3.19 — the floors' fight music

Status: built (2026-11-02). The designer: "I have Combat OST to be played during floor's gameplay; Combat ost start
when you enter the first room of a floor and is played and looped until you finish the Boss of the floor, the music
stops and will be replayed on the first room of the next floor". Three tracks; decided: "Random each floor"; their
credits "on the board". Then, before it was played: "let's only play the BGM when on room fights, challenge room, boss
room -> when a fight done, BGM fades away".

## The tracks
The designer's three (ASSETS/AUDIO/COMBAT, OST1–3: WAV, 44.1 kHz, 24-bit, stereo), encoded to **Ogg Vorbis** at
192 kbps: `public/music/combat1.ogg` (2:06), `combat2.ogg` (2:06), `combat3.ogg` (1:30), about 2–3 MB each. Ogg, not
MP3: an MP3 starts and ends with a gap of silence, so its loop clicks; an Ogg loops clean. Encoded with Blender's own
encoder (no ffmpeg on the PC): `tools/blender/encode_music.py`.
They're mixed loud (about −12 dB RMS), so they play at about a third (gains 0.29–0.33, under the fight's hits).
**(placeholder: by ear in the game)**

## When it plays: only while a fight is on
- **A fight room's fight** (the mini bosses' too) and **a challenge room's**: from its gates shutting till its last foe
  falls, fading in (1.5 s).
- **The boss's**: from its show through its fight.
- **A fight done, it fades away** (3 s; a challenge room won is done, its reward waiting quiet). **(placeholder)**
- **Quiet between fights**: the start room, the corridors, the shop, the cleared rooms, the chests, the boss beaten and
  its loot, the way down; and once you're dead (the death screen is quiet). Pausing keeps it as it was.
- **The next fight goes on where the floor's track left off** (looping round), so a floor's fights don't all open
  with the track's start.
- The menus' track wins over it (the main menu); the lobby has none (as before).

## Which track
Each floor picks one at random, **never the same as the floor before's**, and keeps it all through the floor. A Retry
is a new floor: a new pick.

## Credits
The lobby's credits wall has a third board, **MUSIC**: Polarnyne (Izakaya Funes' Metal Pack: its licence asks for the
credit) and Intersonic Sound (Replica · Extreme Cyber Metal). The three boards stand between the candelabra
(`CREDIT_BOARDS`: −5.2, 0, 5.2).

## What was built
`audio/music.ts` (the three tracks; two wishes, the screens' and the floor's, the screens' winning; `pickCombat`,
`floorTrack`, `combatMusicOn`, `loopAt`; the player going on where a fight track was left, its slower fade),
`engine/run.ts` (each frame: the floor's wish), `engine/Game.ts` (none left on after the game); `world/lobby/credits.ts`, `spots.ts`; `tools/blender/encode_music.py` (new); the three tracks.
Tests: `test-music.ts` (new), `test-sounds.ts` (a track an MP3 or an Ogg), `test-lobby.ts` (three boards).

## Checked without a browser
Rules (tests): the tracks are there and Ogg; a floor's pick never repeats the floor before's, all three come up, and it
holds all floor; on in a room's fight and the boss's show and fight; off before a fight, once it's done (a challenge
room's reward waiting too), the boss beaten, when dead, and on the way down; the slower fade; where the next fight goes
on; the credits board. **Not yet heard in the game**: the loudness against the fight's sounds, the loops' seams, the
fades.
