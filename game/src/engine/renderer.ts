// M1 — the WebGL renderer: sharp but capped pixel ratio, ACES tone mapping, soft shadows.
import * as THREE from 'three';

export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  // (Update 0.3.55 — PCFSoftShadowMap is gone from three.js: it warned and used this anyway.)
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.className = 'rb-canvas';
  container.appendChild(renderer.domElement);
  return renderer;
}
