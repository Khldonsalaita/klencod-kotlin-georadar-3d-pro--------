/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ColormapType = 'jet' | 'seismic' | 'viridis' | 'turbo' | 'copper';

export interface GprHeader {
  title: string;
  surveyType: string;
  antennaFreqMHz: number; // e.g. 400 MHz, 800 MHz
  dielectricConstant: number; // epsilon_r (e.g. 4 for dry sand, 9 for average soil, 16 for wet)
  velocityMeterPerNs: number; // v = c / sqrt(epsilon_r) e.g. ~0.10 m/ns
  samplesPerTrace: number; // nz
  tracesPerLine: number; // nx or ny
  numberOfLines: number;
  timeWindowNs: number; // e.g. 40 ns
  maxDepthCm: number; // calculated depth in cm
  sampleIntervalNs: number; // dt
  lineSpacingM: number; // dx
  traceSpacingM: number; // dy
  dateCreated: string;
  operator: string;
  location: string;
}

export interface GprAnomaly {
  id: string;
  name: string;
  type: 'pipe' | 'chamber' | 'void' | 'foundation' | 'rebar' | 'layer' | 'unknown';
  x: number; // in cm
  y: number; // in cm
  z: number; // depth in cm
  twtNs?: number; // two-way travel time in ns
  depthErrorCm?: number; // estimated accuracy margin (+/- cm)
  accuracyPercentage?: number; // accuracy percentage (e.g. 96.2%)
  amplitude: number;
  polarity: 'positive' | 'negative' | 'mixed';
  dimensions?: { width: number; height: number; length?: number };
  materialEstimate: string; // e.g. 'Metallic Pipe (معدن عاكس)', 'Stone Vault (حجر صلب)', 'Air Cavity (فراغ هوائي)'
  confidence: number; // 0 to 1
  notes: string;
}

export interface SoilPermittivityPreset {
  id: string;
  nameAr: string;
  nameEn: string;
  epsilonR: number; // nominal relative permittivity
  epsilonRMin: number;
  epsilonRMax: number;
  velocityCmNs: number; // v in cm/ns
  attenuationDbM: number;
  typicalUse: string;
}

export interface FilterSettings {
  timeZeroCorrection: boolean;
  timeZeroSamples: number;
  
  dewow: boolean;
  dewowWindow: number; // samples
  
  gainType: 'none' | 'linear' | 'exponential' | 'agc';
  gainValue: number; // multiplier / curve
  agcWindow: number; // samples
  
  backgroundRemoval: boolean;
  backgroundWindow: number; // traces
  
  bandpass: boolean;
  fLowCut: number; // MHz
  fHighCut: number; // MHz
  
  kirchhoffMigration: boolean;
  migrationAperture: number;
  
  envelope: boolean; // Hilbert transform / Instantaneous Amplitude
}

export interface GprSurveyDataset {
  header: GprHeader;
  nx: number; // X axis grid points (crossline, e.g. 0 to 250 cm)
  ny: number; // Y axis grid points (inline, e.g. 0 to 270 cm)
  nz: number; // Z axis depth samples (0 to 240 cm)
  
  xCoords: Float32Array; // cm coordinates
  yCoords: Float32Array; // cm coordinates
  zCoords: Float32Array; // depth in cm
  
  rawVolume: Float32Array; // 3D volume [nx * ny * nz]
  processedVolume: Float32Array; // filtered 3D volume
  envelopeVolume: Float32Array; // amplitude magnitude for 3D isosurfacing
  
  minRawVal: number;
  maxRawVal: number;
  minVal: number;
  maxVal: number;
  
  anomalies: GprAnomaly[];
  filters: FilterSettings;
}

export type ViewMode = 'volume' | 'slices' | 'radargram' | 'filters' | 'anomalies' | 'settings';
