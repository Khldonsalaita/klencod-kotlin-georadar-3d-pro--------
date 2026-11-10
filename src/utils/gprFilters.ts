/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilterSettings, GprHeader } from '../types/gpr';

/**
 * Calculates radar wave propagation velocity from relative dielectric permittivity (epsilon_r)
 * c = 0.29979 m/ns (speed of light in vacuum)
 * returns velocity in m/ns (and cm/ns)
 */
export function calculateVelocity(epsilonR: number): number {
  const c = 0.2998; // m/ns
  return c / Math.sqrt(Math.max(1, epsilonR));
}

/**
 * Converts two-way travel time (ns) to depth in centimeters
 * depth = (v * t / 2) * 100 cm/m
 */
export function timeToDepthCm(timeNs: number, velocityMeterPerNs: number): number {
  return (velocityMeterPerNs * timeNs * 0.5) * 100;
}

/**
 * Converts depth in cm to two-way travel time in nanoseconds
 */
export function depthCmToTime(depthCm: number, velocityMeterPerNs: number): number {
  const depthM = depthCm / 100;
  return (2 * depthM) / velocityMeterPerNs;
}

/**
 * Clones a 3D Float32Array volume
 */
export function cloneVolume(vol: Float32Array): Float32Array {
  const copy = new Float32Array(vol.length);
  copy.set(vol);
  return copy;
}

/**
 * Time Zero Correction (Static Shift along Z/time axis)
 */
export function applyTimeZero(
  input: Float32Array,
  nx: number,
  ny: number,
  nz: number,
  shiftSamples: number
): Float32Array {
  if (shiftSamples === 0) return cloneVolume(input);
  const output = new Float32Array(input.length);

  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      const traceOffset = (x * ny + y) * nz;
      for (let z = 0; z < nz; z++) {
        const srcZ = z + shiftSamples;
        if (srcZ >= 0 && srcZ < nz) {
          output[traceOffset + z] = input[traceOffset + srcZ];
        } else {
          output[traceOffset + z] = 0;
        }
      }
    }
  }
  return output;
}

/**
 * Dewow Filter (Low-pass running mean subtraction along each trace)
 * Eliminates low-frequency instrument drift and inductive coupling.
 */
export function applyDewow(
  input: Float32Array,
  nx: number,
  ny: number,
  nz: number,
  windowSize: number = 32
): Float32Array {
  const output = new Float32Array(input.length);
  const halfWin = Math.max(2, Math.floor(windowSize / 2));

  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      const traceOffset = (x * ny + y) * nz;

      for (let z = 0; z < nz; z++) {
        const start = Math.max(0, z - halfWin);
        const end = Math.min(nz - 1, z + halfWin);
        let sum = 0;
        let count = 0;
        for (let k = start; k <= end; k++) {
          sum += input[traceOffset + k];
          count++;
        }
        const mean = count > 0 ? sum / count : 0;
        output[traceOffset + z] = input[traceOffset + z] - mean;
      }
    }
  }
  return output;
}

/**
 * Background Removal (Subtracts average trace across the survey grid)
 * Strips continuous horizontal banding / direct air & ground waves to expose hyperbolas
 */
export function applyBackgroundRemoval(
  input: Float32Array,
  nx: number,
  ny: number,
  nz: number
): Float32Array {
  const output = new Float32Array(input.length);
  const totalTraces = nx * ny;
  const avgTrace = new Float32Array(nz);

  // Compute average trace across entire volume
  for (let z = 0; z < nz; z++) {
    let sum = 0;
    for (let x = 0; x < nx; x++) {
      for (let y = 0; y < ny; y++) {
        sum += input[(x * ny + y) * nz + z];
      }
    }
    avgTrace[z] = sum / totalTraces;
  }

  // Subtract average trace
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      const traceOffset = (x * ny + y) * nz;
      for (let z = 0; z < nz; z++) {
        output[traceOffset + z] = input[traceOffset + z] - avgTrace[z];
      }
    }
  }
  return output;
}

/**
 * Gain Functions: Linear, Exponential SEC (Spreading & Exponential Compensation), or AGC
 */
export function applyGain(
  input: Float32Array,
  nx: number,
  ny: number,
  nz: number,
  type: 'none' | 'linear' | 'exponential' | 'agc',
  gainFactor: number = 1.8,
  agcWindow: number = 24
): Float32Array {
  if (type === 'none') return cloneVolume(input);
  const output = new Float32Array(input.length);

  if (type === 'linear' || type === 'exponential') {
    for (let x = 0; x < nx; x++) {
      for (let y = 0; y < ny; y++) {
        const traceOffset = (x * ny + y) * nz;
        for (let z = 0; z < nz; z++) {
          const depthRatio = z / (nz - 1);
          let multiplier = 1.0;
          if (type === 'linear') {
            multiplier = 1.0 + depthRatio * gainFactor * 3.0;
          } else {
            multiplier = Math.exp(depthRatio * gainFactor * 2.2);
          }
          output[traceOffset + z] = input[traceOffset + z] * multiplier;
        }
      }
    }
    return output;
  }

  // AGC (Automatic Gain Control)
  const halfWin = Math.max(3, Math.floor(agcWindow / 2));
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      const traceOffset = (x * ny + y) * nz;
      for (let z = 0; z < nz; z++) {
        const start = Math.max(0, z - halfWin);
        const end = Math.min(nz - 1, z + halfWin);
        let sumSq = 0;
        let count = 0;
        for (let k = start; k <= end; k++) {
          const val = input[traceOffset + k];
          sumSq += val * val;
          count++;
        }
        const rms = Math.sqrt(sumSq / Math.max(1, count));
        const gainVal = rms > 0.001 ? 1.0 / rms : 1.0;
        output[traceOffset + z] = input[traceOffset + z] * Math.min(gainVal * gainFactor * 15.0, 50.0);
      }
    }
  }
  return output;
}

/**
 * Bandpass Filter (Smoothing + high frequency cutoff)
 */
export function applyBandpass(
  input: Float32Array,
  nx: number,
  ny: number,
  nz: number
): Float32Array {
  const output = new Float32Array(input.length);
  // 5-point Gaussian smoothing along time/Z axis
  const kernel = [0.061, 0.242, 0.383, 0.242, 0.061];

  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      const traceOffset = (x * ny + y) * nz;
      for (let z = 0; z < nz; z++) {
        let val = 0;
        let weightSum = 0;
        for (let k = -2; k <= 2; k++) {
          const idx = z + k;
          if (idx >= 0 && idx < nz) {
            const w = kernel[k + 2];
            val += input[traceOffset + idx] * w;
            weightSum += w;
          }
        }
        output[traceOffset + z] = weightSum > 0 ? val / weightSum : input[traceOffset + z];
      }
    }
  }
  return output;
}

/**
 * 2D/3D Kirchhoff Migration approximation
 * Collapses hyperbolic diffractions by summing along theoretical diffraction curves
 */
export function applyKirchhoffMigration(
  input: Float32Array,
  nx: number,
  ny: number,
  nz: number,
  dxM: number,
  dyM: number,
  dtNs: number,
  velocityMPerNs: number,
  apertureRadius: number = 4
): Float32Array {
  const output = new Float32Array(input.length);
  const vel = Math.max(0.05, velocityMPerNs);

  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      const outTrace = (x * ny + y) * nz;

      for (let z0 = 0; z0 < nz; z0++) {
        const t0 = z0 * dtNs; // apex two-way travel time
        let sum = 0;
        let count = 0;

        // Sum along inline Y and crossline X aperture
        const minX = Math.max(0, x - apertureRadius);
        const maxX = Math.min(nx - 1, x + apertureRadius);
        const minY = Math.max(0, y - apertureRadius);
        const maxY = Math.min(ny - 1, y + apertureRadius);

        for (let xi = minX; xi <= maxX; xi++) {
          const distX = (xi - x) * dxM;
          for (let yi = minY; yi <= maxY; yi++) {
            const distY = (yi - y) * dyM;
            const distSq = distX * distX + distY * distY;

            // Hyperbolic two-way travel time: t^2 = t0^2 + 4 * distSq / vel^2
            const tSq = t0 * t0 + (4 * distSq) / (vel * vel);
            const t = Math.sqrt(tSq);
            const zSample = Math.round(t / dtNs);

            if (zSample >= 0 && zSample < nz) {
              const inTrace = (xi * ny + yi) * nz;
              // Cosine obliquity factor: t0 / t
              const obliquity = t > 0 ? t0 / t : 1.0;
              sum += input[inTrace + zSample] * obliquity;
              count++;
            }
          }
        }

        output[outTrace + z0] = count > 0 ? sum / Math.sqrt(count) : input[outTrace + z0];
      }
    }
  }
  return output;
}

/**
 * Hilbert Transform / Envelope (Instantaneous Amplitude)
 * Computes E(t) = sqrt( s(t)^2 + H(s(t))^2 )
 * Essential for 3D isosurfaces, C-scan depth slice energy mapping!
 */
export function computeEnvelope(
  input: Float32Array,
  nx: number,
  ny: number,
  nz: number
): Float32Array {
  const output = new Float32Array(input.length);

  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      const traceOffset = (x * ny + y) * nz;

      for (let z = 0; z < nz; z++) {
        const s = input[traceOffset + z];

        // Discrete Hilbert transform approximation via finite FIR filter:
        // H(k) = 2 / (pi * k) for odd k
        let h = 0;
        const maxK = 15;
        for (let k = 1; k <= maxK; k += 2) {
          const weight = 2.0 / (Math.PI * k);
          const idxPlus = z + k;
          const idxMinus = z - k;
          const valPlus = idxPlus < nz ? input[traceOffset + idxPlus] : 0;
          const valMinus = idxMinus >= 0 ? input[traceOffset + idxMinus] : 0;
          h += weight * (valPlus - valMinus);
        }

        output[traceOffset + z] = Math.sqrt(s * s + h * h);
      }
    }
  }
  return output;
}

/**
 * Master Pipeline: executes all enabled filters in proper geophysical sequence:
 * Raw -> Time Zero -> Dewow -> Background Removal -> Gain -> Bandpass -> Migration -> Envelope
 */
export function runProcessingPipeline(
  rawVolume: Float32Array,
  nx: number,
  ny: number,
  nz: number,
  header: GprHeader,
  filters: FilterSettings
): { processed: Float32Array; envelope: Float32Array; minVal: number; maxVal: number } {
  let cur = cloneVolume(rawVolume);

  if (filters.timeZeroCorrection) {
    cur = applyTimeZero(cur, nx, ny, nz, filters.timeZeroSamples);
  }

  if (filters.dewow) {
    cur = applyDewow(cur, nx, ny, nz, filters.dewowWindow);
  }

  if (filters.backgroundRemoval) {
    cur = applyBackgroundRemoval(cur, nx, ny, nz);
  }

  if (filters.gainType !== 'none') {
    cur = applyGain(cur, nx, ny, nz, filters.gainType, filters.gainValue, filters.agcWindow);
  }

  if (filters.bandpass) {
    cur = applyBandpass(cur, nx, ny, nz);
  }

  if (filters.kirchhoffMigration) {
    cur = applyKirchhoffMigration(
      cur,
      nx,
      ny,
      nz,
      header.lineSpacingM,
      header.traceSpacingM,
      header.sampleIntervalNs,
      header.velocityMeterPerNs,
      filters.migrationAperture
    );
  }

  const envelope = computeEnvelope(cur, nx, ny, nz);

  // Compute min and max values of the processed volume
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < cur.length; i++) {
    const val = cur[i];
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  }

  return { processed: cur, envelope, minVal, maxVal };
}
