// Update 0.3.49 — the Dragon's core as you see it (the Boss Design Bible's Inferno Core): on its chest, a ring of scales
// opening round a white-hot core that swells as it charges; its light on the room. Its Ember Rain's tell uses it too: the
// scales shut, the chest pulsing through them. Made in code, as its model has no chest to open. Updated in place.
import * as THREE from 'three';

/** Its scales, how far off the core's middle they sit (m); their tilt shut (rad: their tips meet in front of the core) and
 *  how far they swing open. */
const SCALES = 8;
const OUT = 0.5;
const SHUT = -2.2;
const SWING = 1.8;
/** The core's size at the start and at the end of its charge (m). */
const SMALL = 0.3;
const BIG = 0.62;
const LIGHT = 340;

export class DragonCoreView {
  readonly group = new THREE.Group();
  private readonly ball = new THREE.SphereGeometry(1, 20, 14);
  private readonly scaleGeo = new THREE.ConeGeometry(0.24, 0.85, 4).translate(0, 0.425, 0);
  private readonly coreMat = new THREE.MeshBasicMaterial({ color: 0xfff0c8, toneMapped: false });
  private readonly haloMat = new THREE.MeshBasicMaterial({ color: 0xff6a18, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly scaleMat = new THREE.MeshStandardMaterial({ color: 0x5a1a12, roughness: 0.7, flatShading: true, emissive: 0xff4a10, emissiveIntensity: 0.2 });
  private readonly core = new THREE.Mesh(this.ball, this.coreMat);
  private readonly halo = new THREE.Mesh(this.ball, this.haloMat);
  private readonly hinges: THREE.Group[] = [];
  private readonly light = new THREE.PointLight(0xff8a30, 0, 48, 1.3);

  constructor() {
    this.group.add(this.core, this.halo, this.light);
    for (let i = 0; i < SCALES; i++) {
      // Round the core, in the plane its chest faces (its local x-y): each hinge's +y points out from the middle.
      const a = (i / SCALES) * Math.PI * 2;
      const hinge = new THREE.Group();
      hinge.rotation.z = a;
      const swing = new THREE.Group();
      swing.position.y = OUT;
      const scale = new THREE.Mesh(this.scaleGeo, this.scaleMat);
      scale.castShadow = true;
      swing.add(scale);
      hinge.add(swing);
      this.group.add(hinge);
      this.hinges.push(swing);
    }
    this.hide();
  }

  hide() {
    this.core.visible = this.halo.visible = false;
    for (const h of this.hinges) h.parent!.visible = false;
    this.light.intensity = 0;
  }

  /** At `pos`, its chest facing along `facing` (−sin, −cos). `open`: its scales, 0 shut, 1 wide; `swell`: 0..1; `glow`: how
   *  bright, 0..1; `struck`: 1 just hit, fading (the view's flash). */
  update(pos: THREE.Vector3, facing: number, open: number, swell: number, glow: number, struck: number, time: number) {
    this.group.position.copy(pos);
    this.group.rotation.set(0, facing, 0);
    const flick = 0.92 + 0.08 * Math.sin(time * 37) * Math.sin(time * 23);
    const r = (SMALL + (BIG - SMALL) * swell) * flick;
    this.core.visible = this.halo.visible = glow > 0.01 && open > 0.02;
    this.core.scale.setScalar(r * (1 + 0.2 * struck));
    this.halo.scale.setScalar(r * (1.5 + 0.5 * glow + 0.5 * struck));
    this.haloMat.opacity = 0.3 + 0.4 * glow;
    this.coreMat.color.setRGB(1, 0.9 + 0.1 * struck, 0.72 + 0.28 * struck);
    this.scaleMat.emissiveIntensity = 0.2 + 2.6 * glow;
    for (const h of this.hinges) {
      h.parent!.visible = true;
      // Shut, a bud over the core; open, they swing out and back.
      h.rotation.x = SHUT + open * SWING;
    }
    this.light.position.set(0, 0, -0.8);
    this.light.intensity = LIGHT * glow * flick;
  }

  dispose() {
    this.ball.dispose();
    this.scaleGeo.dispose();
    this.coreMat.dispose();
    this.haloMat.dispose();
    this.scaleMat.dispose();
  }
}
