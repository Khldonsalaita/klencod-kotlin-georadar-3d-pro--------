/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColormapType } from '../types/gpr';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

// Normalized color stops for colormaps
const COLOR_STOPS: Record<ColormapType, [number, number, number, number][]> = {
  // Rainbow / Jet matching the user's attached screenshot:
  // Deep blue -> Cyan -> Green -> Yellow -> Orange -> Red -> Bright White/Red
  jet: [
    [0.0, 0.0, 0.1, 0.4],
    [0.15, 0.0, 0.4, 0.9],
    [0.35, 0.0, 0.85, 0.7],
    [0.5, 0.15, 0.85, 0.2],
    [0.65, 0.95, 0.9, 0.0],
    [0.8, 1.0, 0.45, 0.0],
    [0.95, 0.95, 0.05, 0.1],
    [1.0, 1.0, 0.9, 0.9],
  ],
  turbo: [
    [0.0, 0.19, 0.07, 0.23],
    [0.2, 0.12, 0.53, 0.9],
    [0.4, 0.16, 0.85, 0.61],
    [0.6, 0.72, 0.93, 0.22],
    [0.8, 0.98, 0.55, 0.14],
    [1.0, 0.58, 0.04, 0.02],
  ],
  seismic: [
    [0.0, 0.05, 0.2, 0.7],
    [0.25, 0.3, 0.6, 0.95],
    [0.5, 0.95, 0.95, 0.95],
    [0.75, 0.95, 0.4, 0.3],
    [1.0, 0.7, 0.05, 0.05],
  ],
  viridis: [
    [0.0, 0.27, 0.0, 0.33],
    [0.25, 0.28, 0.28, 0.53],
    [0.5, 0.13, 0.57, 0.55],
    [0.75, 0.45, 0.81, 0.33],
    [1.0, 0.99, 0.91, 0.14],
  ],
  copper: [
    [0.0, 0.0, 0.0, 0.0],
    [0.4, 0.35, 0.18, 0.1],
    [0.75, 0.8, 0.45, 0.25],
    [1.0, 1.0, 0.85, 0.65],
  ],
};

/**
 * Returns interpolated RGB values for a normalized value t in [0, 1]
 */
export function sampleColormap(cmap: ColormapType, t: number): RGB {
  const clamped = Math.max(0, Math.min(1, t));
  const stops = COLOR_STOPS[cmap] || COLOR_STOPS.jet;

  if (clamped <= stops[0][0]) {
    return { r: stops[0][1], g: stops[0][2], b: stops[0][3] };
  }
  if (clamped >= stops[stops.length - 1][0]) {
    const last = stops[stops.length - 1];
    return { r: last[1], g: last[2], b: last[3] };
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const s0 = stops[i];
    const s1 = stops[i + 1];
    if (clamped >= s0[0] && clamped <= s1[0]) {
      const span = s1[0] - s0[0];
      const factor = span === 0 ? 0 : (clamped - s0[0]) / span;
      return {
        r: s0[1] + factor * (s1[1] - s0[1]),
        g: s0[2] + factor * (s1[2] - s0[2]),
        b: s0[3] + factor * (s1[3] - s0[3]),
      };
    }
  }

  return { r: 1, g: 1, b: 1 };
}

/**
 * Generates a CSS linear-gradient string for colorbars
 */
export function getColormapCssGradient(cmap: ColormapType): string {
  const stops = COLOR_STOPS[cmap] || COLOR_STOPS.jet;
  const parts = stops.map(
    ([pos, r, g, b]) =>
      `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}) ${Math.round(pos * 100)}%`
  );
  return `linear-gradient(to right, ${parts.join(', ')})`;
}

/**
 * Creates an RGBA typed array of length 256*4 for Three.js 1D DataTexture
 */
export function createColormapTextureBuffer(cmap: ColormapType): Uint8Array {
  const buffer = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const { r, g, b } = sampleColormap(cmap, t);
    const offset = i * 4;
    buffer[offset] = Math.round(r * 255);
    buffer[offset + 1] = Math.round(g * 255);
    buffer[offset + 2] = Math.round(b * 255);
    buffer[offset + 3] = 255;
  }
  return buffer;
}
