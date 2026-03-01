// Shared color interpolation utilities for schedule grids

// Schedule color scheme (busy -> neutral -> free)
export const COLOR_BUSY = "#ffb4ab";
export const COLOR_NEUTRAL = "#ffdea3";
export const COLOR_FREE = "#82d3a2";

export const SCHEDULE_SLOTS = 63;

/**
 * Linearly interpolate between two hex colors.
 */
export function lerpRGB(a, b, amount) {
  const ar = parseInt(a.substring(1, 3), 16);
  const ag = parseInt(a.substring(3, 5), 16);
  const ab = parseInt(a.substring(5, 7), 16);
  const br = parseInt(b.substring(1, 3), 16);
  const bg = parseInt(b.substring(3, 5), 16);
  const bb = parseInt(b.substring(5, 7), 16);
  const rr = Math.floor(ar * (1 - amount) + br * amount);
  const rg = Math.floor(ag * (1 - amount) + bg * amount);
  const rb = Math.floor(ab * (1 - amount) + bb * amount);
  return `rgb(${rr}, ${rg}, ${rb})`;
}

/**
 * Three-way color interpolation: a -> b -> c based on amount (0 to 1).
 */
export function lerpColor(amount) {
  if (amount < 0.5) {
    return lerpRGB(COLOR_BUSY, COLOR_NEUTRAL, amount * 2);
  } else {
    return lerpRGB(COLOR_NEUTRAL, COLOR_FREE, (amount - 0.5) * 2);
  }
}
