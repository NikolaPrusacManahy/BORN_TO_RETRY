// From Last Ward (Update 0.9.9): a mouse move no hand makes. Chrome on Windows now and then reports one move
// hundreds or thousands of pixels too big; it is thrown away. It's one when it's over `min` px and `ratio`
// times the biggest move in the last `window` s (`floor` px at least, from rest). A real flick builds up over
// a few frames, so it never looks like one.

export const MOUSE_SPIKE = { min: 350, ratio: 6, floor: 20, window: 0.1 };

/** `size`: this move (px); `recentMax`: the biggest kept move in the last `MOUSE_SPIKE.window` s. */
export function isMouseSpike(size: number, recentMax: number): boolean {
  return size > MOUSE_SPIKE.min && size > MOUSE_SPIKE.ratio * Math.max(recentMax, MOUSE_SPIKE.floor);
}
