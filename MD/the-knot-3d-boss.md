# THE KNOT: 3D Worm-Swarm Boss Spec

A boss for a fast, ULTRAKILL-style first-person shooter: a writhing heap of physically simulated worms wrapped around one eye. The worms pile up, pour around the arena geometry, lash at the player, spit crawlers, and climb walls. Shooting worms off the heap opens gaps to the eye.

- **Target engine:** Unity (C#). The simulation, attack and combat sections work in any engine; only the "Unity implementation" section is Unity-specific.
- **Reference:** a worm-simulation dev video (verlet worm chains, spatial-hash collisions, distance-field level collision, thousands of worms) and a working 2D JavaScript prototype (`worm-boss.js`). This spec turns the prototype into 3D.

---

## 1. Fantasy and feel

- One big, gross, readable silhouette: a 5–7 m mound of glossy red worms with a pulsing eye at the centre.
- It is never still. Worm heads orbit, writhe and poke out of the heap.
- Every attack has a clear tell (glowing tips, the eye widening, a red line), then happens fast. The fight should reward movement, dashing and parrying, not standing and tanking.
- Shooting it feels physical. Hits knock worms back, kills burst into gore, and the heap visibly thins.

---

## 2. How the simulation works

### 2.1 Worm = chain of beads (verlet)
Each worm is `N` beads (default 12). Each bead stores `position`, `previousPosition` and `radius`. There are no rigidbodies: everything runs in one custom solver.

Each substep:
1. **Integrate:** `velocity = (pos - prevPos) * damping`, `prevPos = pos`, `pos += velocity + accel * h²`.
2. **Clamp speed:** limit travel per substep (`maxStep`) so lashes can't explode the solver.
3. **Constraints (4 iterations):**
   - Distance: neighbouring beads stay `segmentLength` apart (each moves half the error).
   - Anti-fold: bead `i` and `i+2` are pushed apart if closer than `1.85 × segmentLength` (stiffness 0.08). This stops worms folding flat but still lets them curl.
   - Run **bead–bead collision once**, after the 2nd iteration.
4. **Environment:** push beads out of the core sphere, the level geometry and the arena bounds.

Fixed timestep: **60 Hz sim, 2 substeps** (h = 1/120 s). Interpolate render positions between sim ticks so it stays smooth at 144+ fps.

### 2.2 Bead–bead collision (3D spatial hash)
- Uniform grid, cell size = `2.2 × beadRadius`.
- Each sim step, bucket every live bead into its cell with a counting sort (count → prefix sum → scatter). No allocations.
- For each bead, test only the beads in the 27 neighbouring cells, and only pairs where `j > i`.
- Skip pairs in the same worm that are ≤ 2 beads apart (the constraints handle those).
- On overlap, push both apart by `overlap × 0.4` each.
- Use a hashed grid (cell coordinates → hash → table of size ~2× bead count) so the arena size doesn't matter.

### 2.3 Level collision
Use one of these, in order of preference:
1. **Baked signed distance field (SDF)** of the arena: a 3D texture or a `float[]` grid around the boss room. Sample the distance and gradient, and push the bead out along the gradient if `distance < radius`. This is what the reference video does, and it's the fastest.
2. **Primitive list:** boxes, spheres and capsules that match the arena blockout, with closest-point pushout (the 2D prototype does this with rects and circles).
3. **Fallback:** `Physics.ComputePenetration` against level colliders for beads near geometry. This is the slowest, so only use it for prototyping.

Floor contact should add friction (damp tangential velocity) so the heap sits rather than skates.

### 2.4 Gravity and the "heap"
- Gravity applies to all beads (`-9.81 m/s²`, tune up to `-20` for snappier motion).
- Mass beads (everything except the head) are also pulled toward the core: `accel = min(maxPull, basePull + k × distanceBeyondCoreSurface)`. The core sphere pushes beads out, so they pack into a thick shell around the eye.
- Fewer worms makes a thinner shell, which opens real gaps for shots. That is the main progression loop.

### 2.5 Head steering (each worm's brain)
Only the head bead is steered; the body follows through constraints. Each worm has a state:

| State | Head target | Head accel | Body pull to core | Notes |
|---|---|---|---|---|
| `Mass` | Point on a slowly rotating orbit around the core (random axis, radius and speed per worm) | low | 1.0 | Adds a lateral sine wiggle so it writhes |
| `Windup` | Point just outside the core surface, on the player's side | medium | 1.0 | Head glows (the tell). 0.55–0.65 s |
| `Lash` | Player position locked at windup start (+ small random offset) | very high | 0.25 | 0.42 s. Damages the player |
| `Recoil` | Back to its orbit | medium-high | 1.0 | 0.6 s, then back to `Mass` |
| `Crawler` | Player (live) | low-medium | 0 | Detached and hunts the player. Bursts on contact |
| `Climber` | Point on a wall or ceiling surface (from the SDF) | medium | 0 | Phase 3 only, see attacks |
| `Dead` | none | 0 | 0 | Ragdolls, fades and shrinks over 1.6 s, then is removed |

The wiggle is a lateral force perpendicular to the neck direction: `sin(t × wiggleFreq + phase) × wiggleAmp`. Use 2× amplitude for crawlers and 0.3× for lashes. In 3D, pick the perpendicular as `cross(neckDir, randomPerWormAxis)` and slowly rotate that axis.

---

## 3. Combat

### 3.1 Health
- `maxHp = 100`.
- Each worm has **3 HP**. Killing a worm removes `0.6 × maxHp / wormCount` from the boss bar, so killing every worm deals 60%.
- Hits on the **eye** deal full weapon damage (or 1.5× with a crit/weakpoint multiplier). The eye is only reachable through gaps, during lashes, or when the boss is stunned.
- Phase thresholds: **Phase 2 below 66%**, **Phase 3 below 33%**.

### 3.2 Hit detection
- **Hitscan:** ray against beads. Walk the hash grid along the ray (3D DDA) and do ray–sphere tests in each cell. The first bead hit absorbs the shot. If no bead is hit, test the eye sphere.
- **Projectiles:** sphere query against the grid each tick (substep fast projectiles).
- **Explosions:** radius query. Damage every worm in range once and push their beads outward. Big explosions should visibly blow a crater in the heap.
- On a worm hit: flash that worm white for 0.12 s and push the hit bead along the shot direction.

### 3.3 Damage to the player
- Touching the eye: 1 hit. During a charge: 2 hits plus knockback.
- Lash heads and the first 3–4 beads of a lashing worm: 1 hit.
- Crawler head: 1 hit, and the crawler bursts.
- Mass worms push the player away physically but **don't** deal contact damage, so you can play aggressively and close-range.
- Expose damage as events. Don't hardcode health, so your existing player health, i-frames and dash rules apply.

### 3.4 Fast-FPS hooks (ULTRAKILL-style)
- **Parryable lashes:** a lash head inside the parry window gets reflected. The worm is killed, the boss takes bonus damage, and the boss is briefly staggered. The windup glow is the parry cue.
- **Blood-on-hit:** every worm hit and kill emits a `BloodSpray(position, amount)` event, so it plugs into a heal-from-blood or style system.
- **Gibs:** dead worms keep simulating as loose chains, so you can shoot them around before they fade.

---

## 4. Attacks by phase

| Attack | Phase | Tell | What happens | Counterplay |
|---|---|---|---|---|
| **Lash** | 1+ | Worm tips on the player side glow and pull back (0.55 s) | 3 / 5 / 7 worms (by phase) whip to where the player stood | Keep moving, dash through, or parry a head |
| **Spew** | 2+ | Eye flashes, heap bulges toward the player | 2–3 worms are flung out as crawlers (max 8 alive) that chase the player across floors and walls | Shoot them (they take 2–3 hits) or dodge until they burst |
| **Roll / Charge** | 3 | Eye widens, a red line on the floor tracks the player, then locks 0.25 s before launch | The whole heap rolls at ~18 m/s for 0.65 s; worms trail behind it like a comet | Side-dash. If it hits a wall it is **stunned for 0.8–1.5 s**: eye fully exposed |
| **Worm Rain** | 3 | Several worms climb the walls onto the ceiling (visible) | Climbers drop onto the player's position after 1 s | Watch the ceiling, keep moving |
| **Swallow** (optional) | 3 | Heap goes quiet and flattens | Worms spread into a carpet; standing in it slows the player, then it snaps closed | Get out or jump. Height is the counter |

Cooldown between attacks: **2.6 s / 2.0 s / 1.4 s** by phase. Avoid repeating the same attack twice in a row (60% re-roll).

Between attacks the core drifts toward the player and tries to hold **6–9 m** away. Make it faster than the 2D prototype, since the player is fast: about 4 m/s in Phase 1, scaling +35% per phase.

**Death:** worms die in a staggered wave over 1.4 s and fling outward, the eye shrinks over 1.8 s, then fire `Finished` at 3.2 s.

---

## 5. Tuning values (starting point)

These are converted from the working 2D prototype to metres and adjusted for a fast 3D game.

| Parameter | Value |
|---|---|
| Worm count | 120 (target 150–300 with Burst) |
| Beads per worm | 12 |
| Segment length | 0.2 m (worm ≈ 2.4 m long) |
| Bead radius | 0.15 m (head 1.08×, last 2 beads 0.8×) |
| Core (eye) radius | 1.0 m |
| Damping per substep | 0.945 (dead: 0.9) |
| Max bead travel per substep | 0.35 m |
| Mass head accel | 37 m/s² |
| Windup head accel | 52 m/s² |
| Lash head accel | 270 m/s² |
| Recoil head accel | 63 m/s² |
| Crawler head accel | 20 + 3.5 × phase m/s² |
| Wiggle amplitude | 14–26 m/s² (random per worm), frequency 5–9 rad/s |
| Core pull | `min(90, 20 + 9 × distanceBeyondCore)` m/s² |
| Orbit distance beyond core | 0.25–2.0 m, ±0.4 m sine breathing |
| Crawler fling speed | 14–18 m/s |
| Charge speed | 18 m/s for 0.65 s |

---

## 6. Rendering

- **Worm meshes:** build one tube per worm each frame from a Catmull-Rom spline through its beads (8 sides × ~24 rings). Write all worms into **one dynamic mesh** with `Mesh.SetVertexBufferData`, or generate it on the GPU in a compute shader. Tapered ends, rounded caps.
- **Material:** wet, glossy flesh. Dark red base, high smoothness, a bit of subsurface or wrap lighting, and a lighter band (clitellum) near the head. In the 2D prototype the colours were body `#9a2f3b`, dark `#3b0d16`, highlight `#f4a0a6` and band `#c75b68`. Shift toward a brighter red in later phases.
- **Per-worm data:** pass flash (hit), glow (windup) and fade (dead) as vertex colour or a per-worm buffer.
- **Eye:** sphere with an iris that tracks the player and a slit pupil that widens in Phase 3.
- **LOD:** past ~40 m, drop to 4-sided tubes. Never change the simulation by distance, only the rendering.
- **Debug view:** draw the beads as teal spheres (instanced) and show `checks / frame` on screen, like the reference video. It's useful for tuning.

---

## 7. Unity implementation

```
Assets/Bosses/TheKnot/
  TheKnotBoss.cs          // MonoBehaviour: states, phases, attacks, events, public API
  WormSim.cs              // owns NativeArrays, schedules jobs, fixed-step loop
  Jobs/IntegrateJob.cs    // [BurstCompile] IJobParallelFor over beads (needs worm state per bead)
  Jobs/ConstraintJob.cs   // [BurstCompile] IJobParallelFor over worms
  Jobs/HashBuildJob.cs    // counting sort into hash grid
  Jobs/CollideJob.cs      // bead-bead pushout
  Jobs/EnvironmentJob.cs  // SDF + core + bounds pushout
  ArenaSDF.cs             // bakes and samples the distance field for the boss room
  WormRenderer.cs         // builds the tube mesh (or drives a compute shader)
  WormHitQuery.cs         // Raycast / SphereCast / OverlapSphere against beads
  Shaders/WormFlesh.shader
  Debug/WormDebugDraw.cs
```

- Store positions in `NativeArray<float3>` (positions, previous positions) with `float` radii and `int` worm ids. No per-bead objects and no GC allocations per frame.
- **Collision with Jobs:** parallel pushout writes to shared beads cause races. Either accumulate pushes into a separate `NativeArray<float3>` delta buffer and apply them after, or colour the grid into 8 checkerboard passes (in 3D, alternating cells on each axis).
- Keep attack logic and state on the main thread. Only the per-bead maths goes in Burst.
- Hits come from your weapon code: `boss.Raycast(ray, maxDist, out WormHit hit)` and `boss.ApplyDamage(hit, amount, impulse)`.

### Public API
```csharp
public event Action<AttackKind> OnAttack;
public event Action<int> OnPhaseChanged;          // 1, 2, 3
public event Action<Vector3> OnWormKilled;
public event Action<Vector3, float> OnBloodSpray; // position, amount (for heal/style systems)
public event Action<Vector3> OnCoreHit;
public event Action<Vector3> OnSlam;              // charge hit a wall → stunned
public event Action OnDefeated;                   // HP reached 0, death animation starts
public event Action OnFinished;                   // death animation done

public bool Raycast(Ray ray, float maxDistance, out WormHit hit);
public int  OverlapSphere(Vector3 centre, float radius, List<WormHit> results);
public void ApplyDamage(in WormHit hit, float damage, Vector3 impulse);
public void ApplyExplosion(Vector3 centre, float radius, float damage, float force);
public bool TryParry(Vector3 point, float radius); // reflects a lashing head if one is there
public int  ContactDamage(Vector3 playerPos, float playerRadius);

public float Hp { get; }  public float MaxHp { get; }  public int Phase { get; }
public int AliveWorms { get; }  public bool IsDefeated { get; }
```

---

## 8. Performance budget

| Item | Budget |
|---|---|
| Sim (120 worms × 12 beads, 2 substeps, Burst) | < 1 ms |
| Sim (300 worms) | < 2.5 ms |
| Tube mesh rebuild | < 1 ms (or on the GPU) |
| Hitscan query | < 0.05 ms per ray |
| GC allocations per frame | 0 |

The 2D JavaScript prototype ran 120 worms at about 1.2 ms per frame single-threaded, without Burst, so these targets are realistic.

---

## 9. Build order

1. Beads, verlet and constraints for a single worm wiggling on a flat floor, plus the debug bead view.
2. Spatial hash and bead–bead collision. Drop 120 worms and confirm they pile up without jitter or explosions.
3. Core pull and core pushout, so the heap forms around the eye.
4. Arena SDF collision, so worms pour around pillars and up against walls.
5. Tube renderer and flesh shader.
6. Hit queries and damage: worm death, gore events, health bar.
7. Attacks in order: Lash, Spew, Roll/Charge, Worm Rain, then Swallow if wanted.
8. Phases, tells, audio and VFX hooks, death sequence.
9. Burst/Jobs pass and profiling at 300 worms.

## 10. Done when

- [ ] 120+ worms form a stable writhing heap. No jitter at rest, no beads stuck inside geometry.
- [ ] The heap visibly thins as worms die, and gaps let shots reach the eye.
- [ ] Every attack has a readable tell of at least 0.5 s and can be dodged by a dashing player.
- [ ] Lash heads can be parried.
- [ ] Charge into a wall stuns the boss and exposes the eye.
- [ ] Hitscan, projectiles and explosions all interact correctly with worms.
- [ ] Sim stays inside the performance budget at 120 worms on target hardware, with 0 GC allocations per frame.
- [ ] All events fire, and the boss plugs into the existing player health, i-frame and blood systems without edits to those systems.
