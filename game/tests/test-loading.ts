// Update 0.3.23 — the loader (the designer: "we need to add few loading screens and give the game some time to load
// stuff": after Lab, after Start, a new floor, the Lab's floors): a level made ready before it shows (its models in,
// then its shaders, never sooner than LOAD_MIN, LOAD_MAX at most for the models), built only once the loader's on
// screen, an older load's end ignored; and the game's every way into a level goes behind it.
import { readFileSync } from 'node:fs';
import { check, section } from './harness';
import { LevelLoader, LOAD_MIN, readyLevel, whenTrue } from '../src/engine/levelLoad';

const sleep = (secs: number) => new Promise<void>((done) => setTimeout(done, secs * 1000));
const src = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

section('Loading — a level made ready');
{
  let t = performance.now();
  let warmed = false;
  await readyLevel([sleep(0.05)], () => {
    warmed = true;
  });
  const quick = (performance.now() - t) / 1000;
  // (Lower bounds only: the whole suite runs other tests in the gaps.)
  check(`quick models still keep it up ${LOAD_MIN} s (no flash), and its shaders are warmed`, quick >= LOAD_MIN - 0.02 && warmed, quick.toFixed(2));
  t = performance.now();
  let models = false;
  await readyLevel([sleep(LOAD_MIN + 0.3).then(() => (models = true))], () => undefined, 0.1);
  check('slow models: it waits for them', models && (performance.now() - t) / 1000 >= LOAD_MIN + 0.28);
  let order = '';
  await readyLevel([sleep(0.05).then(() => (order += 'models '))], () => sleep(0.05).then(() => (order += 'shaders')), 0);
  check('the models first, then the shaders', order === 'models shaders', order);
  let through = false;
  await readyLevel([Promise.reject(new Error('a model failed')).catch(() => undefined)], () => Promise.reject(new Error('no renderer')), 0).then(() => (through = true));
  check('a failed model or a failed warm-up still lets it through', through);
  let flag = false;
  setTimeout(() => (flag = true), 80);
  await whenTrue(() => flag, 0.01);
  check('the arms looked at till they’re in', flag);
}

section('Loading — the loader');
{
  const told: boolean[] = [];
  const l = new LevelLoader((on) => told.push(on));
  let made = 0;
  l.cover(() => made++);
  l.cover(() => made++);
  check('a covered level: the loader up at once, the level not made yet (it’s heavy: the loader must be on screen first)', l.on && told.join() === 'true' && made === 0);
  l.step();
  check('one frame on, not yet', made === 0);
  l.step();
  check('two frames on, made (once)', made === 1);
  l.step();
  check('and not again', made === 1);
  l.ready([sleep(0.05)], () => undefined);
  check('made ready: up till it is', l.on && told.join() === 'true');
  await sleep(LOAD_MIN + 0.2);
  check('then down', !l.on && told.join() === 'true,false');
  const t2: boolean[] = [];
  const l2 = new LevelLoader((on) => t2.push(on));
  l2.ready([sleep(0.3)], () => undefined);
  l2.ready([sleep(0.05)], () => undefined);
  await sleep(LOAD_MIN + 0.5);
  check('an older load’s end is ignored: down once, at the newest’s', !l2.on && t2.join() === 'true,false');
  const t3: boolean[] = [];
  const l3 = new LevelLoader((on) => t3.push(on));
  l3.ready([sleep(0.05)], () => undefined);
  l3.drop();
  await sleep(LOAD_MIN + 0.2);
  check('the run gone: its load ends unheard', t3.join() === 'true');
}

section('Loading — every way into a level');
{
  const base = src('engine/gameBase.ts');
  const game = src('engine/Game.ts');
  const run = src('engine/run.ts');
  const runBase = src('engine/runBase.ts');
  check('after Lab, its floors and boss rooms, back to the Lab: behind the loader', /startLab\(\) \{\s+this\.covered/.test(base) && base.includes('this.covered(() => this.newRun(dungeonLevel(') && base.includes('this.covered(() => this.newRun(bossRoomLevel(') && base.includes('this.covered(() => this.newRun(labLevel()))'));
  check('after Start (through the gate into the lobby) and into a run: behind the loader', /throughTheGate\(\) \{[\s\S]{0,80}this\.covered/.test(game) && /startRun\([\s\S]{0,300}this\.covered/.test(game));
  check('a new floor (the way down), a Retry and a Restart: behind the loader', run.includes('this.loadCovered(() => this.levels.next(this.level), true)') && runBase.includes('this.loadCovered(() => this.levels.fresh(), false)') && runBase.includes('this.loadCovered(() => this.levels.again(this.level), false)'));
  check('every level made ready (its models, the arms, its shaders) and the world held still meanwhile', runBase.includes('this.makeReady();') && runBase.includes('compileAsync') && run.includes('this.paused || this.loading ? 0 : elapsed'));
  const app = src('App.tsx');
  check('the App: the loader on black while it’s up, clearing after', app.includes('onLoading={setLoading}') && app.includes('{loading && <RunLoader />}'));
}
