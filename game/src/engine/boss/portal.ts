// Update 0.0.15 — the portal in the boss room's middle (the designer: the boss's energy comes out of a portal): a
// swirling disc of red and violet on the floor, a column of light over it, sparks rising and a light that floods the
// room as it opens. Drawn only while it's open; updated in place.
import * as THREE from 'three';
import { Dust } from '../fx/dust';

/** Its size (m): the disc's radius, the column's height. */
const RADIUS = 5;
const COLUMN = 16;
const LIGHT = 90;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** The disc: bands wound round its middle, turning, brightest in the middle. */
const DISC = /* glsl */ `
  uniform float time;
  uniform float open;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float a = atan(p.y, p.x);
    float bands = sin(a * 5.0 + r * 16.0 - time * 5.0) * 0.5 + 0.5;
    vec3 col = mix(vec3(0.5, 0.05, 0.85), vec3(1.0, 0.22, 0.08), bands);
    float glow = 0.5 + 1.8 * (1.0 - r) * (1.0 - r);
    float edge = smoothstep(1.0, 0.82, r);
    gl_FragColor = vec4(col * glow * edge * open, 1.0);
  }
`;

/** The column: fading up, with bands climbing it. */
const COLUMN_FRAG = /* glsl */ `
  uniform float time;
  uniform float open;
  varying vec2 vUv;
  void main() {
    float up = 1.0 - vUv.y;
    float bands = sin(vUv.y * 22.0 - time * 7.0 + vUv.x * 6.2832 * 3.0) * 0.5 + 0.5;
    vec3 col = mix(vec3(0.7, 0.1, 0.9), vec3(1.0, 0.35, 0.15), bands);
    gl_FragColor = vec4(col * up * up * (0.35 + 0.4 * bands) * open, 1.0);
  }
`;

export class Portal {
  readonly group = new THREE.Group();
  private readonly uniforms = { time: { value: 0 }, open: { value: 0 } };
  private readonly light = new THREE.PointLight(0xff3a6a, 0, 40, 1.4);
  private readonly sparks: Dust;
  private readonly mats: THREE.Material[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];

  constructor(at: { x: number; z: number }) {
    const shader = (fragmentShader: string) => {
      const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      this.mats.push(mat);
      return mat;
    };
    const disc = new THREE.CircleGeometry(RADIUS, 64).rotateX(-Math.PI / 2);
    const column = new THREE.CylinderGeometry(RADIUS * 0.6, RADIUS * 0.9, COLUMN, 40, 1, true).translate(0, COLUMN / 2, 0);
    this.geos.push(disc, column);
    const d = new THREE.Mesh(disc, shader(DISC));
    d.position.y = 0.04;
    const c = new THREE.Mesh(column, shader(COLUMN_FRAG));
    this.light.position.y = 2.5;
    this.sparks = new Dust(160, new THREE.Vector3(-RADIUS, 0, -RADIUS), new THREE.Vector3(RADIUS, COLUMN * 0.8, RADIUS), { color: 0xff6040, size: 0.16, opacity: 0.9, rise: [3, 7] });
    this.group.add(d, c, this.light, this.sparks.points);
    this.group.position.set(at.x, 0, at.z);
    this.group.visible = false;
  }

  /** `open`: 0..1. */
  update(dt: number, open: number) {
    this.group.visible = open > 0.001;
    if (!this.group.visible) return;
    this.uniforms.time.value += dt;
    this.uniforms.open.value = open;
    this.light.intensity = LIGHT * open;
    this.group.scale.set(0.3 + 0.7 * open, 1, 0.3 + 0.7 * open);
    (this.sparks.points.material as THREE.PointsMaterial).opacity = 0.9 * open;
    this.sparks.update(dt);
  }

  dispose() {
    this.group.removeFromParent();
    for (const m of this.mats) m.dispose();
    for (const g of this.geos) g.dispose();
    this.sparks.dispose();
  }
}
