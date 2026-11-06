// Update 0.3.83 — Gravity Sean's Meteor in the world (sim/combat/gravityUlt.ts). Made in code, placeholders: the zone on the floor, following your aim; a burning rock coming down out of the sky onto it. (Update 0.3.89 — Black Hole: holeView.ts.)
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { SEAN } from '../../tuning/sean';

const ZONE = 0xff5a2a;
const FIRE = 0xffa040;
/** The meteor: its size, a share of its zone's; where it starts over the zone: this far beyond it from you, this high (m). */
const ROCK_SHARE = 0.37;
const FROM_FAR = 28;
const FROM_UP = 36;
/** Over the floor (m), so the zone doesn't flicker into it. */
const ZONE_UP = 0.06;

const inFront = new THREE.Vector3();
const from = new THREE.Vector3();

export class UltimatesView {
  private readonly zoneGeo = new THREE.RingGeometry(0.93, 1, 72).rotateX(-Math.PI / 2);
  private readonly fillGeo = new THREE.CircleGeometry(0.93, 72).rotateX(-Math.PI / 2);
  private readonly zoneMat = new THREE.MeshBasicMaterial({ color: ZONE, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly fillMat = new THREE.MeshBasicMaterial({ color: ZONE, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly zone = new THREE.Group();
  private readonly rockGeo = new THREE.IcosahedronGeometry(1, 1);
  private readonly rockMat = new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 1, flatShading: true, emissive: 0xff5a10, emissiveIntensity: 1.1 });
  private readonly rock = new THREE.Mesh(this.rockGeo, this.rockMat);
  private readonly tailGeo = new THREE.ConeGeometry(1, 1, 12, 1, true).translate(0, 0.5, 0);
  private readonly tailMat = new THREE.MeshBasicMaterial({ color: FIRE, transparent: true, opacity: 0.65, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly tail = new THREE.Mesh(this.tailGeo, this.tailMat);
  private time = 0;

  constructor(private readonly scene: THREE.Scene) {
    this.zone.add(new THREE.Mesh(this.zoneGeo, this.zoneMat), new THREE.Mesh(this.fillGeo, this.fillMat));
    this.zone.visible = this.rock.visible = this.tail.visible = false;
    for (const m of [this.rock, this.tail]) m.frustumCulled = false;
    scene.add(this.zone, this.rock, this.tail);
  }

  /** (For the tests.) */
  get showing() {
    return { zone: this.zone.visible, rock: this.rock.visible };
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    this.meteor(state);
  }

  private meteor(state: CombatState) {
    const m = state.grav.meteor;
    this.zone.visible = !!m;
    this.rock.visible = this.tail.visible = !!m && m.falling;
    if (!m) return;
    const v = SEAN.v;
    const pulse = 1 + 0.03 * Math.sin(this.time * 12);
    this.zone.position.set(m.x, m.y + ZONE_UP, m.z);
    this.zone.scale.setScalar(v.meteorRadius * pulse);
    if (!m.falling) return;
    const k = Math.min(1, (m.t - v.meteorAim) / Math.max(0.01, v.meteorFall));
    const fall = k * k;
    from.set(m.dx * FROM_FAR, FROM_UP, m.dz * FROM_FAR);
    inFront.set(m.x + from.x * (1 - fall), m.y + from.y * (1 - fall), m.z + from.z * (1 - fall));
    this.rock.position.copy(inFront);
    const rock = v.meteorRadius * ROCK_SHARE;
    this.rock.scale.setScalar(rock);
    this.rock.rotation.set(this.time * 2, this.time * 1.3, 0);
    // Its fire streams back the way it came.
    this.tail.position.copy(inFront);
    this.tail.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, from.normalize());
    this.tail.scale.set(rock * 0.95, 16 + 14 * k, rock * 0.95);
  }

  dispose() {
    this.scene.remove(this.zone, this.rock, this.tail);
    this.zoneGeo.dispose();
    this.fillGeo.dispose();
    this.zoneMat.dispose();
    this.fillMat.dispose();
    this.rockGeo.dispose();
    this.rockMat.dispose();
    this.tailGeo.dispose();
    this.tailMat.dispose();
  }
}
