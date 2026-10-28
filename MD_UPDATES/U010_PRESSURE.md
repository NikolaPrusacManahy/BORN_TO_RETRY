# Update 0.1.0 — constant pressure, the Execution Power meter

Status: built (2026-10-28), from the designer's list:
- "Make the wave system better. I don't want the map to end up empty while the player finds the last enemy before the next wave. I want a wave system that never allows less than 5 enemies on the field: constant pressure on the player."
- "A new meter just above the dash bar: the Execution Power meter."
- A question (answered separately): an execution move spending a full meter, like Doom Eternal's.

## Rooms keep the pressure on (Rooms tab)
- A fight room's planned enemies (the same plan and budget as before) now come as **one stream** instead of waves that waited for the last enemy to die.
  - **The opening** (0.7 s after the gates shut): the room's first planned wave, and at least **5** (Enemies on field).
  - **Then:** whenever fewer than 5 are fighting and the room has more to send, the next one comes in. One every **0.35 s** (Reinforcement gap), at a spawn spot at least 6 m from you; spitters take free perches first.
  - **The end:** when all are sent, the last few are fought out; with none left, the gates open.
- **Enemies left** (the HUD's skull) counts those fighting and those still to come.
- How many a room sends hasn't changed: it grows with the room's depth and the floor.
- **(placeholders)** 5 and 0.35 s.

## Execution Power meter (Execution tab)
- A thin crimson bar **just above the dash charges**, as wide as them.
- It fills **a tenth per kill** (Kills to fill: 10): your punches, swings, throws and slams. The Dragon's beam, lava and a slime's own burst don't count, nor do the Lab's dummies.
- Full, it burns brighter and pulses.
- It comes down to the next floor with you; a death empties it.
- It does nothing yet: what it pays for is the execution question.
