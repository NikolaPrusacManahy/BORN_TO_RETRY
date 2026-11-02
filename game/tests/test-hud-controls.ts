// Update 0.3.20 — the controls bottom right (the designer: "display the controls like in the game Blood rush … display
// jab control, parry and it's cooldown like a filling effect … Ground pound is now Control key by default and display it
// to bottom right"; "weapons slots and all that can just be the level above"): the parry's fill, the ground pound ready,
// the badges and their keys, the slots above them.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { check, near, section } from './harness';
import { FlatWorld } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { controlsHud, createControlsHud, createParryClock, parryFill } from '../src/engine/controlsHud';
import { createHudStore } from '../src/engine/hudStore';
import { DEFAULT_BINDINGS } from '../src/input/bindings';
import { keyLabel } from '../src/input/keyLabel';
import { createCombat } from '../src/sim/combat/state';
import { canSlam, slamFloor, tryStartSlam } from '../src/sim/player/slam';
import { createPlayer } from '../src/sim/player/state';
import { holding } from '../src/sim/weapons/weapons';
import { Controls } from '../src/screens/HudControls';
import { FISTS } from '../src/tuning/combat';

section('HUD controls — the parry filling back');
{
  const clock = createParryClock();
  check('no wait: full (ready)', parryFill(0, clock) === 1);
  const cool = FISTS.v.parryCooldown;
  const start = parryFill(cool, clock);
  const half = parryFill(cool / 2, clock);
  const late = parryFill(cool * 0.1, clock);
  check(`a parry landed (${cool} s): empty, then filling round (half way at half the wait), full once it's over`, start === 0 && near(half, 0.5, 0.03) && late > 0.85 && late < 1 && parryFill(0, clock) === 1);
  const retry = FISTS.v.parryRetry;
  parryFill(retry, clock);
  check(`a press that caught nothing: its short wait (${retry} s) fills against itself`, near(parryFill(retry / 2, clock), 0.5, 0.03));
  parryFill(retry * 0.4, clock);
  check('a parry landing mid-way starts it over, against the long wait', parryFill(cool, clock) === 0 && near(parryFill(cool * 0.75, clock), 0.25, 0.03));
  const c = createCombat(OPEN_ARENA);
  const out = controlsHud(c, 'RMB', 'Ctrl', true, createParryClock(), createControlsHud());
  check('barehanded: the parry is there; its key and the ground pound’s as given', !out.parryOff && out.parryFill === 1 && out.heavyKey === 'RMB' && out.slamKey === 'Ctrl' && out.slamReady);
  c.weapon = holding('sword', 5);
  check('a weapon in hand: no parry (dimmed)', controlsHud(c, 'RMB', 'Ctrl', false, createParryClock(), createControlsHud()).parryOff);
  check('the ground pound is Ctrl by default (its cap says so)', keyLabel(DEFAULT_BINDINGS.slam) === 'Ctrl' && keyLabel(DEFAULT_BINDINGS.attack) === 'LMB' && keyLabel(DEFAULT_BINDINGS.heavy) === 'RMB');
}

section('HUD controls — the ground pound lit when you can');
{
  const w = new FlatWorld();
  const ground = createPlayer(0, 0, 0, 0);
  ground.grounded = true;
  const hop = createPlayer(0, slamFloor(ground) * 0.5, 0, 0);
  const high = createPlayer(0, slamFloor(ground) + 1, 0, 0);
  check('not on the ground, nor in a low hop; high enough, yes', !canSlam(ground, w) && !canSlam(hop, w) && canSlam(high, w));
  const dashing = createPlayer(0, slamFloor(ground) + 1, 0, 0);
  dashing.dashTime = 0.1;
  check('not mid-dash', !canSlam(dashing, w));
  check('lit exactly when a press would pound', tryStartSlam(high, true, w) && !canSlam(high, w) && !tryStartSlam(hop, true, w));
}

section('HUD controls — the badges and their keys');
{
  const base = { ...createHudStore().get(), attackKey: 'LMB', heavyKey: 'RMB', slamKey: 'Ctrl' };
  const ready = renderToStaticMarkup(createElement(Controls, { s: { ...base, parryFill: 1 } }));
  check('three badges, the jab, the parry, the ground pound, each with its key on a cap', (ready.match(/class="rb-ctl /g) ?? []).length === 3 && ready.includes('>LMB<') && ready.includes('>RMB<') && ready.includes('>Ctrl<'));
  check('ready: the parry lit, its flash', ready.includes('rb-ctl is-parry is-ready') && ready.includes('rb-ctl-flash') && ready.includes('--ctl:1'));
  const wait = renderToStaticMarkup(createElement(Controls, { s: { ...base, parryFill: 0.4 } }));
  check('waiting: drained, filling round (its share on the badge), no flash', wait.includes('is-parry is-wait') && wait.includes('--ctl:0.4') && !wait.includes('rb-ctl-flash') && wait.includes('rb-ctl-icon is-dim') && wait.includes('rb-ctl-icon is-lit'));
  const armed = renderToStaticMarkup(createElement(Controls, { s: { ...base, slots: [{ kind: 'pistol', uses: 6 }], slot: 1, parryOff: true } }));
  check('a weapon in hand: the jab badge shows it; the parry dimmed', armed.includes('is-parry is-off') && armed.includes('--ctl:0') && !armed.includes('rb-ctl-flash') && armed.split('rb-ctl-badge')[1].includes('<path d="M4 9h23'));
  check('the ground pound lit when you could pound', renderToStaticMarkup(createElement(Controls, { s: { ...base, slamReady: true } })).includes('is-pound is-ready') && !ready.includes('is-pound is-ready'));
  const hud = readFileSync(new URL('../src/screens/Hud.tsx', import.meta.url), 'utf8');
  check('on the HUD, with the weapon slots', hud.includes('<Controls s={s} />') && hud.includes('<WeaponSlots '));
  const css = (f: string) => readFileSync(new URL(`../src/ui/theme/${f}`, import.meta.url), 'utf8');
  const bottom = (f: string, sel: string) => Number(new RegExp(`\\${sel} \\{[^}]*bottom: (\\d+)px`).exec(css(f))?.[1] ?? -1);
  const ctls = bottom('theme-43-hud-controls.css', '.rb-ctls');
  const slots = bottom('theme-17-slots.css', '.rb-slots');
  const ammo = bottom('theme-28-gun.css', '.rb-ammo');
  check('bottom right: the controls, the weapon slots a row above (their keys clear of them), the bullets above those', ctls >= 0 && slots >= ctls + 58 + 40 && ammo >= slots + 64 + 40, `${ctls} / ${slots} / ${ammo}`);
}
