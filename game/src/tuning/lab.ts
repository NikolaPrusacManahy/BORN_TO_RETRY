// M1 — lab-only switches: the sim rate and slow motion. Not part of the game's feel.
import { group, knob } from './schema';

export const LAB = group('lab', 'Lab', {
  simHz: knob(120, 30, 240, 10, 'Sim rate', 'Game ticks per second.'),
  maxSteps: knob(8, 1, 16, 1, 'Max ticks per frame', 'More than this in one frame and the rest is dropped.'),
  timeScale: knob(1, 0.05, 1, 0.05, 'Time scale', 'Slow motion for inspecting moves. The mouse is never slowed.'),
});
