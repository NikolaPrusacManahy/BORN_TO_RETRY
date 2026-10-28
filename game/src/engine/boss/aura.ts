// Update 0.0.18 — a boss's aura (was part of demonView.ts; the Dragon has one too): a glow behind it facing you,
// embers rising round it, a ring of fire at its feet and a light; all of it fiercer once it rages, dying away as its
// body sinks.
import * as THREE from 'three';
import { Dust } from '../fx/dust';

export interface AuraLook {
  /** The glow's colour (r, g, b) calm and raging; the ring's and the light's colour; the embers'. */
  calm: [number, number, number];
  rage: [number, number, number];
  ring: number;
  light: number;
  embers: number;
}

export class Aura {
  readonly group = new THREE.Group();
  private readonly glow: THREE.Mesh;
  private readonly glowMat: THREE.ShaderMaterial;
  private readonly ring: THREE.Mesh;
  private readonly light: THREE.PointLight;
  private readonly embers: Dust;
  private readonly geos: THREE.BufferGeometry[] = [];
  private time = 0;

  constructor(private readonly look: AuraLook) {
    this.glowMat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(...look.calm) }, power: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 color; uniform float power; varying vec2 vUv; void main() { float r = length(vUv * 2.0 - 1.0); float k = pow(max(0.0, 1.0 - r), 2.2); gl_FragColor = vec4(color * k * power, 1.0); }',
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const plane = new THREE.PlaneGeometry(1, 1);
    const ringGeo = new THREE.RingGeometry(0.75, 1, 48).rotateX(-Math.PI / 2);
    this.geos.push(plane, ringGeo);
    this.glow = new THREE.Mesh(plane, this.glowMat);
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: look.ring, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.light = new THREE.PointLight(look.light, 0, 18, 1.5);
    this.embers = new Dust(90, new THREE.Vector3(-2.6, 0, -2.6), new THREE.Vector3(2.6, 7, 2.6), { color: look.embers, size: 0.13, opacity: 0.9, rise: [1.5, 4] });
    this.group.add(this.glow, this.ring, this.light, this.embers.points);
  }

  /** `at`: its feet; `chest`: the glow's middle; `size`: its height (m); `fade`: 1 alive, to 0 as its body sinks;
   *  `camera`: the glow faces you. */
  update(at: THREE.Vector3, chest: THREE.Vector3, size: number, rage: boolean, fade: number, camera: THREE.Vector3, dt: number) {
    this.time += dt;
    const pulse = 0.85 + 0.15 * Math.sin(this.time * (rage ? 7 : 4));
    this.glow.position.copy(chest);
    this.glow.lookAt(camera);
    this.glow.scale.setScalar(size * (rage ? 1.75 : 1.45));
    this.glowMat.uniforms.power.value = (rage ? 1.1 : 0.7) * pulse * fade;
    (this.glowMat.uniforms.color.value as THREE.Color).setRGB(...(rage ? this.look.rage : this.look.calm));
    this.ring.position.set(at.x, Math.max(0.05, at.y + 0.05), at.z);
    this.ring.scale.setScalar(2.4 + 0.25 * Math.sin(this.time * 3));
    this.ring.rotation.y = this.time * 0.8;
    (this.ring.material as THREE.MeshBasicMaterial).opacity = (rage ? 0.85 : 0.5) * pulse * fade * (at.y > 0.5 ? 0.3 : 1);
    this.light.position.copy(chest);
    this.light.intensity = (rage ? 55 : 32) * pulse * fade;
    this.embers.points.position.set(at.x, at.y, at.z);
    (this.embers.points.material as THREE.PointsMaterial).opacity = (rage ? 1 : 0.7) * fade;
    this.embers.update(dt * (rage ? 1.6 : 1));
  }

  dispose() {
    for (const g of this.geos) g.dispose();
    this.glowMat.dispose();
    (this.ring.material as THREE.Material).dispose();
    this.embers.dispose();
  }
}
