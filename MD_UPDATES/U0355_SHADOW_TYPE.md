# Update 0.3.55 — The removed shadow setting

Status: built (2026-11-05). The designer: "Yes, fix it".

`engine/renderer.ts` still asked for `THREE.PCFSoftShadowMap`, which three.js has removed. The installed r186 logs a warning at the first shadow render and switches to `PCFShadowMap` itself (`WebGLShadowMap.js`). The game now asks for `PCFShadowMap` directly, so the warning goes.

Found by the `threejs-performance` skill's list of common mistakes (CloudAI-X/threejs-skills, installed the same day in `.claude/skills`, which isn't committed).

## Unseen
- Shadows should look the same, since three.js was already using this setting. That comes from reading its code; I haven't looked at it in the game.
