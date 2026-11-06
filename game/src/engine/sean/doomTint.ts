// Update 0.3.90 — in Gravity Sean's Time Stop, an enemy that's taken enough to die when it ends is highlighted red (the designer: "enemies that dies during time stop mode will be highlighted in red"). Its body's own colour's drawn to red and
// it glows red, so it reads as red on any model, light or dark. Its colour's put back as soon as it isn't: bodies are reused.
import * as THREE from 'three';

/** How far its own colour's green and blue go, and how strong its glow is. */
const OWN_LEFT = 0.18;
const GLOW = 0.85;

/** After its emissive's been set for this frame. */
export function tintDoomed(mats: readonly THREE.MeshStandardMaterial[], on: boolean) {
  for (const m of mats) {
    const own = m.userData.ownColor as THREE.Color | undefined;
    if (on) {
      if (!own) m.userData.ownColor = m.color.clone();
      const base = (m.userData.ownColor as THREE.Color);
      m.color.setRGB(base.r, base.g * OWN_LEFT, base.b * OWN_LEFT);
      m.emissive.setRGB(GLOW, 0, 0);
    } else if (own) {
      m.color.copy(own);
      delete m.userData.ownColor;
    }
  }
}
