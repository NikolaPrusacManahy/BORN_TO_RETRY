// Update 0.3.42 — The Swarm's worms (the designer's spec MD/the-knot-3d-boss.md and the reel it came from): each worm a
// chain of beads moved by Verlet steps (Jakobsen's "Advanced Character Physics", Hitman: Codename 47's), held by
// constraints: neighbours a bead apart, every other one never folded flat. Beads push each other apart through a hashed
// grid (each bead tests only the 27 cells round it: the reel's 32 million checks a frame down to a few thousand), out of
// the eye, the floor and the walls near the heap (their footprints, gathered as it moves). Each worm's head swims where
// its state wants it (coiled round the eye, drawn back, lashing, coiling back); the rest of it is pulled to the eye, so
// the worms pack into a shell round it that thins as they die. Flat typed arrays, nothing made per tick. Pure.
import type { NavGrid } from '../../world/navGrid';
import type { Rng } from '../../core/rng';
import { SWARM } from '../../tuning/swarm';

export const MAX_WORMS = 400;
export const MAX_BEADS = 16;
const MAX = MAX_WORMS * MAX_BEADS;

/** A worm's state. */
export const MASS = 0;
export const WINDUP = 1;
export const LASH = 2;
export const RECOIL = 3;
export const DEAD = 4;
export const GONE = 5;

/** Constraint passes a tick; beads collide once, after the second. */
const PASSES = 4;
/** Every other bead kept at least this many spacings apart (a worm curls but never folds flat), and how hard.
 *  (Update 0.3.42 — thin worms bend more gently: tight curls read as shards.) */
const FOLD = 1.92;
const FOLD_STIFF = 0.12;
/** The most a bead moves in one tick (m): a lash can't blow the solver up. */
const MAX_STEP = 0.35;
/** A dead worm's speed kept each step, and how long it lies before it's gone (s). */
const DEAD_DAMPING = 0.9;
export const DEAD_FADE = 1.6;
/** Floor friction: speed along the floor kept by a bead touching it. */
const GRIP = 0.8;
/** Walls near the heap: gathered within this reach of the eye (m), again once it has moved this far. */
const WALL_REACH = 9;
const WALL_MOVE = 3;
const MAX_WALLS = 64;

export interface SwarmBody {
  seeded: boolean;
  worms: number;
  beads: number;
  /** Beads, worm by worm (bead b of worm w is w × beads + b; bead 0 the head): where, where a tick ago, how thick. */
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  ox: Float32Array;
  oy: Float32Array;
  oz: Float32Array;
  r: Float32Array;
  /** Worms: state and seconds in it, health, the white flash of a hit (s left), the glow of a wind-up (0 … 1). */
  state: Uint8Array;
  t: Float32Array;
  hp: Float32Array;
  flash: Float32Array;
  /** Each worm's coil round the eye: the axis it circles, its phase, how far out and how fast; its wriggle. */
  ax: Float32Array;
  ay: Float32Array;
  az: Float32Array;
  ux: Float32Array;
  uy: Float32Array;
  uz: Float32Array;
  orbit: Float32Array;
  spin: Float32Array;
  wPhase: Float32Array;
  wAmp: Float32Array;
  wFreq: Float32Array;
  /** A lash's aim (locked as it whips), and whether it has hit you yet. */
  aimX: Float32Array;
  aimY: Float32Array;
  aimZ: Float32Array;
  struck: Uint8Array;
  /** The eye's centre, the heap's reach now (m from it, where most of its worms are) and the worms alive. */
  cx: number;
  cy: number;
  cz: number;
  extent: number;
  alive: number;
  time: number;
  /** Ticks since it was seeded (its worms step on every other: swarm.ts). */
  tick: number;
  /** Where worms died this tick (x, y, z each) and where the eye was struck, for the feedback (cleared by its owner). */
  gore: Float32Array;
  goreN: number;
  eyeHit: number;
  /** The grid: each cell's first bead in `sorted`, how many, and the beads sorted by cell. */
  cellStart: Int32Array;
  cellCount: Int32Array;
  cellOf: Int32Array;
  sorted: Int32Array;
  /** Wall footprints near the heap (minX, minZ, maxX, maxZ each) and where the eye was when they were gathered. */
  walls: Float32Array;
  wallN: number;
  wallX: number;
  wallZ: number;
}

export function createSwarmBody(): SwarmBody {
  const f = (n: number) => new Float32Array(n);
  const w = MAX_WORMS;
  return {
    seeded: false,
    worms: 0,
    beads: 0,
    x: f(MAX), y: f(MAX), z: f(MAX), ox: f(MAX), oy: f(MAX), oz: f(MAX), r: f(MAX),
    state: new Uint8Array(w), t: f(w), hp: f(w), flash: f(w),
    ax: f(w), ay: f(w), az: f(w), ux: f(w), uy: f(w), uz: f(w), orbit: f(w), spin: f(w), wPhase: f(w), wAmp: f(w), wFreq: f(w),
    aimX: f(w), aimY: f(w), aimZ: f(w), struck: new Uint8Array(w),
    cx: 0, cy: 0, cz: 0, extent: 0, alive: 0, time: 0, tick: 0,
    gore: f(3 * 32), goreN: 0, eyeHit: 0,
    cellStart: new Int32Array(GRID_CELLS), cellCount: new Int32Array(GRID_CELLS), cellOf: new Int32Array(MAX), sorted: new Int32Array(MAX),
    walls: f(4 * MAX_WALLS), wallN: 0, wallX: Infinity, wallZ: Infinity,
  };
}

/** A worm still in the heap (not dying, not gone). */
export const livingWorm = (s: SwarmBody, w: number) => s.state[w] < DEAD;

/** The worms coiled round the eye at (cx, cy, cz), each lying along the shell (seeded). */
export function seedSwarm(s: SwarmBody, cx: number, cy: number, cz: number, rng: Rng) {
  const v = SWARM.v;
  s.worms = Math.min(MAX_WORMS, Math.round(v.worms));
  s.beads = Math.min(MAX_BEADS, Math.round(v.beads));
  s.cx = cx;
  s.cy = cy;
  s.cz = cz;
  s.time = 0;
  s.tick = 0;
  s.goreN = 0;
  s.eyeHit = 0;
  s.wallX = s.wallZ = Infinity;
  for (let w = 0; w < s.worms; w++) {
    // A way out from the eye (the upper side more), the axis it circles and the way it lies along the shell.
    const a = rng() * Math.PI * 2;
    const yy = rng() * 1.4 - 0.4;
    const k = Math.sqrt(Math.max(0, 1 - yy * yy));
    const dx = Math.cos(a) * k;
    const dz = Math.sin(a) * k;
    let tx = -dz;
    let ty = rng() - 0.5;
    let tz = dx;
    const tl = len3(tx, ty, tz);
    tx /= tl;
    ty /= tl;
    tz /= tl;
    s.ux[w] = dx;
    s.uy[w] = yy;
    s.uz[w] = dz;
    // (The axis it circles: its way out crossed with the way it lies, square to both.)
    const cx2 = yy * tz - dz * ty;
    const cy2 = dz * tx - dx * tz;
    const cz2 = dx * ty - yy * tx;
    const cl = len3(cx2, cy2, cz2) || 1;
    s.ax[w] = cx2 / cl;
    s.ay[w] = cy2 / cl;
    s.az[w] = cz2 / cl;
    s.orbit[w] = 0.25 + rng() * (v.shell - 0.25);
    s.spin[w] = (0.25 + rng() * 0.5) * (rng() < 0.5 ? -1 : 1);
    s.wPhase[w] = rng() * Math.PI * 2;
    s.wAmp[w] = v.wiggle * (0.7 + rng() * 0.6);
    s.wFreq[w] = 5 + rng() * 4;
    s.state[w] = MASS;
    s.t[w] = rng() * 10;
    s.hp[w] = v.wormHp;
    s.flash[w] = 0;
    s.struck[w] = 0;
    const out = v.eye + v.bead + s.orbit[w];
    for (let b = 0; b < s.beads; b++) {
      const i = w * s.beads + b;
      s.x[i] = s.ox[i] = cx + dx * out + tx * v.segment * b;
      s.y[i] = s.oy[i] = cy + yy * out + ty * v.segment * b;
      s.z[i] = s.oz[i] = cz + dz * out + tz * v.segment * b;
      // The head a little fatter, the tail thinner.
      s.r[i] = v.bead * (b === 0 ? 1.08 : b >= s.beads - 2 ? 0.8 : 1);
    }
  }
  s.alive = s.worms;
  s.extent = v.eye + v.shell;
  s.seeded = true;
}

/** Where a worm's head wants to be and how hard it swims there, by its state (into out[0..3]: x, y, z, accel). The
 *  player is at (px, pz). */
function headGoal(s: SwarmBody, w: number, px: number, pz: number, out: Float32Array) {
  const v = SWARM.v;
  const st = s.state[w];
  if (st === WINDUP) {
    // Drawn back to the eye on your side, a little up: the tell.
    let dx = px - s.cx;
    let dz = pz - s.cz;
    const d = Math.sqrt((dx) * (dx) + (dz) * (dz)) || 1;
    dx /= d;
    dz /= d;
    out[0] = s.cx + dx * (v.eye + 0.4);
    out[1] = s.cy + v.eye * 0.9;
    out[2] = s.cz + dz * (v.eye + 0.4);
    out[3] = v.headPull * 1.4;
    return;
  }
  if (st === LASH) {
    out[0] = s.aimX[w];
    out[1] = s.aimY[w];
    out[2] = s.aimZ[w];
    out[3] = v.lashPull;
    return;
  }
  // Coiled round the eye: its way out turned about its axis as time goes, breathing in and out.
  const ang = s.time * s.spin[w] + s.wPhase[w];
  const c = Math.cos(ang);
  const sn = Math.sin(ang);
  const ax = s.ax[w], ay = s.ay[w], az = s.az[w];
  const ux = s.ux[w], uy = s.uy[w], uz = s.uz[w];
  // Rodrigues: u turned by `ang` about the axis (square to it).
  const kx = ay * uz - az * uy;
  const ky = az * ux - ax * uz;
  const kz = ax * uy - ay * ux;
  const rx = ux * c + kx * sn;
  let ry = uy * c + ky * sn;
  const rz = uz * c + kz * sn;
  // (Never far under the floor: a coil under it lies along the ground instead.)
  ry = Math.max(ry, -0.15);
  const out2 = v.eye + v.bead + s.orbit[w] + 0.4 * Math.sin(s.time * 0.9 + s.wPhase[w]);
  out[0] = s.cx + rx * out2;
  out[1] = s.cy + ry * out2;
  out[2] = s.cz + rz * out2;
  out[3] = st === RECOIL ? v.headPull * 1.7 : v.headPull;
}

const goal = new Float32Array(4);
/** (Math.hypot is slow in V8: plain roots in the hot loops.) */
const len3 = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);

/** One tick (`dt` s) of every worm: steps, constraints, collisions, the eye, the floor and the walls. The eye is at
 *  (cx, cy, cz) now; the player at (px, pz); `nav` the walls (null: none). */
export function stepSwarm(s: SwarmBody, cx: number, cy: number, cz: number, px: number, pz: number, nav: NavGrid | null, dt: number) {
  const v = SWARM.v;
  s.cx = cx;
  s.cy = cy;
  s.cz = cz;
  s.time += dt;
  if (nav && Math.sqrt((cx - s.wallX) * (cx - s.wallX) + (cz - s.wallZ) * (cz - s.wallZ)) > WALL_MOVE) gatherWalls(s, nav);
  const n = s.beads;
  const dt2 = dt * dt;
  const eyeR = v.eye;
  for (let w = 0; w < s.worms; w++) {
    const st = s.state[w];
    if (st === GONE) continue;
    s.t[w] += dt;
    if (s.flash[w] > 0) s.flash[w] = Math.max(0, s.flash[w] - dt);
    if (st === DEAD && s.t[w] >= DEAD_FADE) {
      s.state[w] = GONE;
      continue;
    }
    const damp = st === DEAD ? DEAD_DAMPING : v.damping;
    // (Update 0.3.42 — a lashing worm flies free, its body thrown after its head: thin worms anchored to the heap
    // fell short of you. Recoiling, the eye draws it back.)
    const pullK = st === DEAD || st === LASH ? 0 : 1;
    if (st !== DEAD) headGoal(s, w, px, pz, goal);
    for (let b = 0; b < n; b++) {
      const i = w * n + b;
      let ax = 0;
      let ay = -v.gravity;
      let az = 0;
      const ex = s.x[i] - cx;
      const ey = s.y[i] - cy;
      const ez = s.z[i] - cz;
      const ed = len3(ex, ey, ez) || 1;
      if (b === 0 && st !== DEAD) {
        // The head swims to its goal (gently as it arrives), wriggling across its neck.
        const gx = goal[0] - s.x[i];
        const gy = goal[1] - s.y[i];
        const gz = goal[2] - s.z[i];
        const gd = len3(gx, gy, gz) || 1;
        const k = goal[3] * Math.min(1, gd / 0.4);
        ax += (gx / gd) * k;
        ay += (gy / gd) * k + v.gravity * 0.85;
        az += (gz / gd) * k;
        const nx = s.x[i] - s.x[i + 1];
        const ny = s.y[i] - s.y[i + 1];
        const nz = s.z[i] - s.z[i + 1];
        // Across the neck: the neck crossed with the coil's axis.
        let wx = ny * s.az[w] - nz * s.ay[w];
        let wy = nz * s.ax[w] - nx * s.az[w];
        let wz = nx * s.ay[w] - ny * s.ax[w];
        const wl = len3(wx, wy, wz) || 1;
        const wig = Math.sin(s.time * s.wFreq[w] + s.wPhase[w]) * s.wAmp[w] * (st === LASH ? 0.3 : 1);
        wx /= wl;
        wy /= wl;
        wz /= wl;
        ax += wx * wig;
        ay += wy * wig;
        az += wz * wig;
      } else if (st === LASH && b < n / 2) {
        // (Update 0.3.42 — the whip down its front half, weaker towards its middle: the head alone, dragging the rest,
        // fell short of you.)
        const gx = goal[0] - s.x[i];
        const gy = goal[1] - s.y[i];
        const gz = goal[2] - s.z[i];
        const gd = len3(gx, gy, gz) || 1;
        const k = goal[3] * (1 - b / (n / 2)) * Math.min(1, gd / 0.4);
        ax += (gx / gd) * k;
        ay += (gy / gd) * k + v.gravity * 0.85;
        az += (gz / gd) * k;
      } else if (pullK > 0) {
        // The body drawn to the eye, harder the further past its coil.
        const past = Math.max(0, ed - (eyeR + v.shell));
        const pull = Math.min(v.pullMax, v.pull + v.pullGrow * past) * pullK;
        ax -= (ex / ed) * pull;
        ay -= (ey / ed) * pull;
        az -= (ez / ed) * pull;
      }
      // Verlet: what it moved last tick, a little lost, plus what pulls it now.
      let vx = (s.x[i] - s.ox[i]) * damp;
      let vy = (s.y[i] - s.oy[i]) * damp;
      let vz = (s.z[i] - s.oz[i]) * damp;
      const vl = len3(vx, vy, vz);
      if (vl > MAX_STEP) {
        vx *= MAX_STEP / vl;
        vy *= MAX_STEP / vl;
        vz *= MAX_STEP / vl;
      }
      s.ox[i] = s.x[i];
      s.oy[i] = s.y[i];
      s.oz[i] = s.z[i];
      s.x[i] += vx + ax * dt2;
      s.y[i] += vy + ay * dt2;
      s.z[i] += vz + az * dt2;
    }
  }
  for (let pass = 0; pass < PASSES; pass++) {
    constrain(s, v.segment);
    if (pass === 1) collide(s);
  }
  environment(s, eyeR);
  measure(s, eyeR);
}

/** Neighbours a spacing apart (each moved half the error); every other bead never closer than FOLD spacings. */
function constrain(s: SwarmBody, seg: number) {
  const n = s.beads;
  const fold = seg * FOLD;
  for (let w = 0; w < s.worms; w++) {
    if (s.state[w] === GONE) continue;
    const o = w * n;
    for (let b = 0; b < n - 1; b++) {
      const i = o + b;
      const j = i + 1;
      const dx = s.x[j] - s.x[i];
      const dy = s.y[j] - s.y[i];
      const dz = s.z[j] - s.z[i];
      const d = len3(dx, dy, dz) || 1e-6;
      const k = ((d - seg) / d) * 0.5;
      s.x[i] += dx * k;
      s.y[i] += dy * k;
      s.z[i] += dz * k;
      s.x[j] -= dx * k;
      s.y[j] -= dy * k;
      s.z[j] -= dz * k;
    }
    for (let b = 0; b < n - 2; b++) {
      const i = o + b;
      const j = i + 2;
      const dx = s.x[j] - s.x[i];
      const dy = s.y[j] - s.y[i];
      const dz = s.z[j] - s.z[i];
      const d = len3(dx, dy, dz) || 1e-6;
      if (d >= fold) continue;
      const k = ((d - fold) / d) * 0.5 * FOLD_STIFF;
      s.x[i] += dx * k;
      s.y[i] += dy * k;
      s.z[i] += dz * k;
      s.x[j] -= dx * k;
      s.y[j] -= dy * k;
      s.z[j] -= dz * k;
    }
  }
}

/** The grid round the eye: cells a bead and a bit wide (15 cm for the thin worms), this many each way: about 5.5 m
 *  across and 4 m high (a bead past its edge is counted in the edge's cell: still tested, just against more). Dense, so
 *  no two cells share a bucket. */
const GX = 36;
const GY = 28;
const GZ = 36;
export const GRID_CELLS = GX * GY * GZ;

/** Beads pushed apart where they overlap: sorted into the grid by cell (count, prefix sum, scatter), then each tested
 *  only against the beads in the 27 cells round it (not its own worm's near neighbours). Returns the pairs tested.
 *  Update 0.3.42 (thin worms, three times as many) — only every other bead of a worm collides (and its tail), as a ball
 *  half a spacing bigger, covering the gap to the next: half the balls, bigger cells, a fraction of the pairs; the beads
 *  between share half its shove. */
export function collide(s: SwarmBody): number {
  const n = s.beads;
  const total = s.worms * n;
  const grow = SWARM.v.segment * 0.5;
  const cell = (SWARM.v.bead * 1.08 + grow) * 2.2;
  const inv = 1 / cell;
  const x0 = s.cx - (GX / 2) * cell;
  const y0 = s.cy - (GY / 2) * cell;
  const z0 = s.cz - (GZ / 2) * cell;
  s.cellCount.fill(0, 0, GRID_CELLS);
  for (let i = 0; i < total; i++) {
    const wq = (i / n) | 0;
    const bq = i - wq * n;
    if (s.state[wq] === GONE || (bq & 1 && bq !== n - 1)) {
      s.cellOf[i] = -1;
      continue;
    }
    const ix = clampCell(((s.x[i] - x0) * inv) | 0, GX);
    const iy = clampCell(((s.y[i] - y0) * inv) | 0, GY);
    const iz = clampCell(((s.z[i] - z0) * inv) | 0, GZ);
    const h = (ix * GY + iy) * GZ + iz;
    s.cellOf[i] = h;
    s.cellCount[h]++;
  }
  let run = 0;
  for (let h = 0; h < GRID_CELLS; h++) {
    s.cellStart[h] = run;
    run += s.cellCount[h];
  }
  // (Scatter, the starts spent as cursors and put back after.)
  for (let i = 0; i < total; i++) {
    const h = s.cellOf[i];
    if (h < 0) continue;
    s.sorted[s.cellStart[h]++] = i;
  }
  for (let h = 0; h < GRID_CELLS; h++) s.cellStart[h] -= s.cellCount[h];
  let checks = 0;
  for (let i = 0; i < total; i++) {
    const hi = s.cellOf[i];
    if (hi < 0) continue;
    const wi = (i / n) | 0;
    const bi = i - wi * n;
    const iz = hi % GZ;
    const iy = ((hi - iz) / GZ) % GY;
    const ix = (hi - iz - iy * GZ) / (GY * GZ);
    const xa = Math.max(0, ix - 1), xb = Math.min(GX - 1, ix + 1);
    const ya = Math.max(0, iy - 1), yb = Math.min(GY - 1, iy + 1);
    const za = Math.max(0, iz - 1), zb = Math.min(GZ - 1, iz + 1);
    const xi = s.x[i], yi = s.y[i], zi = s.z[i], ri = s.r[i] + grow;
    for (let cx = xa; cx <= xb; cx++)
      for (let cy = ya; cy <= yb; cy++)
        for (let cz = za; cz <= zb; cz++) {
          const h = (cx * GY + cy) * GZ + cz;
          const end = s.cellStart[h] + s.cellCount[h];
          for (let q = s.cellStart[h]; q < end; q++) {
            const j = s.sorted[q];
            if (j <= i) continue;
            const wj = (j / n) | 0;
            if (wj === wi && j - wj * n - bi <= 2) continue;
            checks++;
            const dx = s.x[j] - xi;
            const dy = s.y[j] - yi;
            const dz = s.z[j] - zi;
            const rr = ri + s.r[j] + grow;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 >= rr * rr) continue;
            const d = Math.sqrt(d2) || 1e-6;
            const k = ((rr - d) / d) * 0.4;
            // (Each ball's neighbours share half its shove: the worm bends as a whole, no zig-zag.)
            shove(s, i, bi, n, -dx * k, -dy * k, -dz * k);
            shove(s, j, j - wj * n, n, dx * k, dy * k, dz * k);
          }
        }
  }
  return checks;
}

/** Bead `i` (bead `b` of its worm's `n`) moved by (x, y, z), its neighbours half as far. */
function shove(s: SwarmBody, i: number, b: number, n: number, x: number, y: number, z: number) {
  s.x[i] += x;
  s.y[i] += y;
  s.z[i] += z;
  if (b > 0) {
    s.x[i - 1] += x * 0.5;
    s.y[i - 1] += y * 0.5;
    s.z[i - 1] += z * 0.5;
  }
  if (b < n - 1) {
    s.x[i + 1] += x * 0.5;
    s.y[i + 1] += y * 0.5;
    s.z[i + 1] += z * 0.5;
  }
}
const clampCell = (c: number, max: number) => (c < 0 ? 0 : c >= max ? max - 1 : c);


/** Out of the eye, above the floor (sliding less along it), out of the walls near. */
function environment(s: SwarmBody, eyeR: number) {
  const n = s.beads;
  const total = s.worms * n;
  for (let i = 0; i < total; i++) {
    if (s.state[(i / n) | 0] === GONE) continue;
    const r = s.r[i];
    const ex = s.x[i] - s.cx;
    const ey = s.y[i] - s.cy;
    const ez = s.z[i] - s.cz;
    const ed = len3(ex, ey, ez);
    const min = eyeR + r;
    if (ed < min) {
      const k = ed > 1e-6 ? min / ed : 0;
      if (k > 0) {
        s.x[i] = s.cx + ex * k;
        s.y[i] = s.cy + ey * k;
        s.z[i] = s.cz + ez * k;
      } else s.y[i] = s.cy + min;
    }
    if (s.y[i] < r) {
      s.y[i] = r;
      // Friction: it moved less along the floor than it would have.
      s.ox[i] = s.x[i] - (s.x[i] - s.ox[i]) * GRIP;
      s.oz[i] = s.z[i] - (s.z[i] - s.oz[i]) * GRIP;
      if (s.oy[i] < r) s.oy[i] = r;
    }
    for (let k = 0; k < s.wallN; k++) {
      const o = k * 4;
      const fx = Math.max(s.walls[o], Math.min(s.x[i], s.walls[o + 2]));
      const fz = Math.max(s.walls[o + 1], Math.min(s.z[i], s.walls[o + 3]));
      const dx = s.x[i] - fx;
      const dz = s.z[i] - fz;
      const d = Math.sqrt((dx) * (dx) + (dz) * (dz));
      if (d >= r) continue;
      if (d > 1e-6) {
        s.x[i] = fx + (dx / d) * r;
        s.z[i] = fz + (dz / d) * r;
      } else {
        // Inside its footprint: out the nearest side.
        const l = s.x[i] - s.walls[o];
        const rt = s.walls[o + 2] - s.x[i];
        const bk = s.z[i] - s.walls[o + 1];
        const fr = s.walls[o + 3] - s.z[i];
        const m = Math.min(l, rt, bk, fr);
        if (m === l) s.x[i] = s.walls[o] - r;
        else if (m === rt) s.x[i] = s.walls[o + 2] + r;
        else if (m === bk) s.z[i] = s.walls[o + 1] - r;
        else s.z[i] = s.walls[o + 3] + r;
      }
    }
  }
}

/** The wall footprints within reach of the eye (the nav grid's). */
function gatherWalls(s: SwarmBody, nav: NavGrid) {
  s.wallN = 0;
  s.wallX = s.cx;
  s.wallZ = s.cz;
  for (const f of nav.walls) {
    if (s.wallN >= MAX_WALLS) break;
    const fx = Math.max(f.minX, Math.min(s.cx, f.maxX));
    const fz = Math.max(f.minZ, Math.min(s.cz, f.maxZ));
    if (Math.sqrt((s.cx - fx) * (s.cx - fx) + (s.cz - fz) * (s.cz - fz)) > WALL_REACH) continue;
    const o = s.wallN * 4;
    s.walls[o] = f.minX;
    s.walls[o + 1] = f.minZ;
    s.walls[o + 2] = f.maxX;
    s.walls[o + 3] = f.maxZ;
    s.wallN++;
  }
}

/** The worms alive, and how far out the heap reaches (the head of its living worms, at most its full coil). */
function measure(s: SwarmBody, eyeR: number) {
  let alive = 0;
  let sum = 0;
  let count = 0;
  const n = s.beads;
  for (let w = 0; w < s.worms; w++) {
    if (!livingWorm(s, w)) continue;
    alive++;
    for (let b = 0; b < n; b += 3) {
      const i = w * n + b;
      sum += len3(s.x[i] - s.cx, s.y[i] - s.cy, s.z[i] - s.cz);
      count++;
    }
  }
  s.alive = alive;
  // (The mean bead's distance, out to a bead's width more: thinned, its reach comes in towards the eye.)
  const mean = count > 0 ? sum / count : eyeR;
  const full = Math.max(1, s.worms);
  s.extent = Math.max(eyeR + 0.15, Math.min(mean + SWARM.v.bead * 2, eyeR + SWARM.v.shell + SWARM.v.bead) * Math.sqrt(alive / full) + eyeR * (1 - Math.sqrt(alive / full)));
}
