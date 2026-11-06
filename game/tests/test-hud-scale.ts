// Update 0.2.21 — a tester's HUD looked big in a small window (it was drawn in fixed pixels; the designer: "next test
// build will have an adaptative UI scalling"). The HUD is the same share of the screen at any size, as at 1080p,
// times the UI size setting (Options).
import { readFileSync } from 'node:fs';
import { check, near, section } from './harness';
import { hudScale, HUD_BASE, uiScale } from '../src/ui/uiScale';
import { DEFAULT_SETTINGS, hydrateSave, UI_SIZE_MAX, UI_SIZE_MIN } from '../src/state/settings';

section('HUD scale — the same share of the screen');
{
  check('1080p: as it was drawn', hudScale(1080, 1, 1) === 1);
  check('a 720p window: two thirds the size', near(hudScale(720, 1, 1), 2 / 3, 1e-9));
  check('1440p: a third bigger', near(hudScale(1440, 1, 1), 4 / 3, 1e-9));
  check('1080p with Windows at 125% (864 px of 1.25): as it was', near(hudScale(864, 1.25, 1), 1, 1e-9));
  check('never under half, never over three times', hudScale(200, 1, 1) === 0.5 && hudScale(5000, 2, 1) === 3);
  check('the UI size setting on top', near(hudScale(HUD_BASE, 1, 1.2), 1.2, 1e-9) && near(hudScale(720, 1, 0.8), 0.8 * (2 / 3), 1e-9));
  check('the menus keep their own fit (panels never scroll)', uiScale(1920, 1080) === 2 && uiScale(900, 540) === 1);
}

section('HUD scale — the setting');
{
  check('UI size: 100% at first', DEFAULT_SETTINGS.uiSize === 1 && hydrateSave({}).settings.uiSize === 1);
  check('an old save without it: 100%', hydrateSave({ settings: { fov: 90 } }).settings.uiSize === 1);
  check(`kept within ${UI_SIZE_MIN * 100}% – ${UI_SIZE_MAX * 100}%`, hydrateSave({ settings: { uiSize: 9 } }).settings.uiSize === UI_SIZE_MAX && hydrateSave({ settings: { uiSize: 0.1 } }).settings.uiSize === UI_SIZE_MIN);
  const fields = readFileSync('src/screens/SettingsFields.tsx', 'utf8');
  // (Update 0.3.0 — on the General page, as Interface size.)
  check('a UI size slider in the settings', fields.includes('label="Interface size"') && fields.includes('uiSize'));
}

section('HUD scale — the HUD is drawn at it');
{
  const hud = readFileSync('src/ui/theme/theme-03-hud.css', 'utf8');
  check('the HUD is laid out at its size and scaled to fill the window', hud.includes('transform: scale(var(--rb-hud, 1))') && hud.includes('width: calc(100% / var(--rb-hud, 1))'));
  const inside = ['48-demon', '03-hud', '05-hits', '07-health', '11-weapon', '12-money', '13-minimap', '14-items', '15-boss', '16-keys', '17-slots', '18-poison', '20-count', '21-exec', '22-exec-ready', '27-grab', '28-gun', '29-raptor', '31-drowned'];
  const off = inside.filter((f) => /\d(vw|vh|vmin|vmax)\b|var\(--rb-ui\)/.test(readFileSync(`src/ui/theme/theme-${f}.css`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')));
  check('nothing in it sized by the window again (no vw, no panel zoom)', off.length === 0, off.join(' '));
}
