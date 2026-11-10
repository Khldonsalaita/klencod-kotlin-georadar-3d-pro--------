/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GprAnomaly, SoilPermittivityPreset } from '../types/gpr';

export const C_LIGHT_M_NS = 0.29979; // Speed of light in vacuum (m/ns)
export const C_LIGHT_CM_NS = 29.979; // Speed of light in vacuum (cm/ns)

/**
 * Standard International Soil & Material Dielectric Permittivity Database
 * Sources: ASTM D6432, GSSI Handbook, Sensors & Software EKKO, Daniels (2004)
 */
export const SOIL_PERMITTIVITY_PRESETS: SoilPermittivityPreset[] = [
  {
    id: 'sandy_loam_avg',
    nameAr: 'طمي رملي / تربة متوسطة الرطوبة (المعيار الافتراضي)',
    nameEn: 'Sandy Loam / Average Moist Soil (Default)',
    epsilonR: 9.0,
    epsilonRMin: 6.5,
    epsilonRMax: 12.0,
    velocityCmNs: 10.0,
    attenuationDbM: 15,
    typicalUse: 'تربة نموذجية لمعظم المسوحات الأرضية والأثرية والمرافق',
  },
  {
    id: 'archaeological_fill',
    nameAr: 'طبقات ردم أثري وركام مختلط (Archaeological Fill)',
    nameEn: 'Archaeological Mixed Stratified Fill',
    epsilonR: 8.5,
    epsilonRMin: 7.0,
    epsilonRMax: 10.5,
    velocityCmNs: 10.3,
    attenuationDbM: 12,
    typicalUse: 'طبقات حجرية ورملية متماسكة فوق الآثار والسراديب القديمة',
  },
  {
    id: 'dry_sand',
    nameAr: 'رمال صحراوية جافة (Dry Sand)',
    nameEn: 'Dry Sand / Desert Dunes',
    epsilonR: 4.0,
    epsilonRMin: 3.0,
    epsilonRMax: 5.0,
    velocityCmNs: 15.0,
    attenuationDbM: 2,
    typicalUse: 'كثبان رملية أو بيئات صحراوية جافة ذات اختراق راداري عميق جداً',
  },
  {
    id: 'wet_sand',
    nameAr: 'رمال مشبعة بالمياه (Wet Sand)',
    nameEn: 'Wet / Saturated Sand',
    epsilonR: 20.0,
    epsilonRMin: 15.0,
    epsilonRMax: 26.0,
    velocityCmNs: 6.7,
    attenuationDbM: 25,
    typicalUse: 'قرب الشواطئ أو مسارات السيول أو الجداول المائية',
  },
  {
    id: 'dry_clay',
    nameAr: 'تربة طينية جافة (Dry Clay)',
    nameEn: 'Dry Clay Soil',
    epsilonR: 6.0,
    epsilonRMin: 4.5,
    epsilonRMax: 8.0,
    velocityCmNs: 12.2,
    attenuationDbM: 18,
    typicalUse: 'طبقات طينية غير مشبعة',
  },
  {
    id: 'wet_clay',
    nameAr: 'تربة طينية مشبعة عالية الملوحة (Wet Clay)',
    nameEn: 'Wet Conductive Clay',
    epsilonR: 30.0,
    epsilonRMin: 22.0,
    epsilonRMax: 40.0,
    velocityCmNs: 5.5,
    attenuationDbM: 45,
    typicalUse: 'تربة رطبة كثيفة ذات امتصاص شديد للموجات الرادارية',
  },
  {
    id: 'limestone',
    nameAr: 'حجر جيري / صخور كلسية صلبة (Limestone Bedrock)',
    nameEn: 'Limestone / Dolomite Bedrock',
    epsilonR: 7.5,
    epsilonRMin: 6.0,
    epsilonRMax: 9.0,
    velocityCmNs: 11.0,
    attenuationDbM: 6,
    typicalUse: 'طبقات الأساس الصخري والتجاويف والكهوف الكارستية',
  },
  {
    id: 'granite_basalt',
    nameAr: 'جرانيت / بازلت / صخور صلبة (Hard Bedrock)',
    nameEn: 'Granite / Basalt / Dense Rock',
    epsilonR: 5.5,
    epsilonRMin: 4.5,
    epsilonRMax: 7.0,
    velocityCmNs: 12.8,
    attenuationDbM: 4,
    typicalUse: 'الصخور النارية الصلبة ومسارات الأنفاق الجبلية',
  },
  {
    id: 'concrete',
    nameAr: 'خرسانة جافة مسلحة (Dry Concrete)',
    nameEn: 'Structural Concrete (Dry)',
    epsilonR: 6.5,
    epsilonRMin: 5.0,
    epsilonRMax: 8.0,
    velocityCmNs: 11.8,
    attenuationDbM: 10,
    typicalUse: 'أرضيات الجسور والخرسانات المعمارية وشبكات التسليح',
  },
  {
    id: 'asphalt',
    nameAr: 'طبقات أسفلت ورصف الطرق (Asphalt Pavement)',
    nameEn: 'Asphalt Pavement',
    epsilonR: 4.0,
    epsilonRMin: 3.5,
    epsilonRMax: 5.0,
    velocityCmNs: 15.0,
    attenuationDbM: 5,
    typicalUse: 'طبقات الطرق السريعة ومدارج المطارات',
  },
];

/**
 * Calculates velocity in m/ns from dielectric constant (epsilon_r)
 */
export function velocityFromPermittivity(epsilonR: number): number {
  return C_LIGHT_M_NS / Math.sqrt(Math.max(1, epsilonR));
}

/**
 * Back-calculates calibrated soil permittivity from a known target depth (ground-truth bore/pipe depth)
 * epsilon_r = (c * t / 2d)^2
 */
export function calibratePermittivityFromKnownDepth(
  twoWayTimeNs: number,
  knownDepthCm: number
): { calibratedEpsilonR: number; calibratedVelocityCmNs: number } {
  if (twoWayTimeNs <= 0 || knownDepthCm <= 0) {
    return { calibratedEpsilonR: 9.0, calibratedVelocityCmNs: 10.0 };
  }
  // v = (2 * d_cm) / t_ns in cm/ns
  const vCmNs = (2 * knownDepthCm) / twoWayTimeNs;
  const eps = Math.pow(C_LIGHT_CM_NS / vCmNs, 2);
  return {
    calibratedEpsilonR: Math.max(1, Math.min(81, eps)),
    calibratedVelocityCmNs: vCmNs,
  };
}

export interface AnomalyDepthDiagnostic {
  anomalyId: string;
  anomalyName: string;
  nominalDepthCm: number;
  calibratedDepthCm: number;
  twtNs: number;
  depthErrorMarginCm: number; // +/- cm
  minProbableDepthCm: number;
  maxProbableDepthCm: number;
  accuracyPercentage: number; // e.g. 96.5%
  verticalResolutionCm: number; // lambda / 4
  permittivitySensitivityCm: number; // Delta d per 1.0 unit change in epsilon_r
  confidenceRating: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
}

/**
 * Performs rigorous geophysical error propagation and depth accuracy estimation
 * for a marked anomaly based on soil permittivity uncertainty and antenna resolution.
 */
export function calculateAnomalyDepthDiagnostic(
  anomaly: GprAnomaly,
  nominalEpsilonR: number,
  epsilonRUncertaintyDelta: number = 1.0,
  antennaFreqMHz: number = 400,
  sampleIntervalNs: number = 0.75,
  initialVelocityMeterPerNs: number = 0.10
): AnomalyDepthDiagnostic {
  // Compute two-way travel time:
  // twt = 2 * d / v
  const vInitialMPerNs = initialVelocityMeterPerNs > 0 ? initialVelocityMeterPerNs : 0.10;
  const vInitialCmNs = vInitialMPerNs * 100;
  const twtNs = anomaly.twtNs ?? (2 * anomaly.z) / vInitialCmNs;

  // Current calibrated velocity with nominalEpsilonR
  const vCalibratedMPerNs = velocityFromPermittivity(nominalEpsilonR);
  const vCalibratedCmNs = vCalibratedMPerNs * 100;

  // Calibrated depth: d = (v * twt) / 2
  const calibratedDepthCm = (vCalibratedCmNs * twtNs) / 2;

  // 1. Permittivity error component:
  // dd / d = 0.5 * (dEps / Eps) => dd = d * 0.5 * (dEps / Eps)
  const dEps = Math.max(0.1, epsilonRUncertaintyDelta);
  const errorPermittivityCm = calibratedDepthCm * 0.5 * (dEps / nominalEpsilonR);

  // 2. Wavelet vertical resolution limit (Rayleigh criterion / quarter-wavelength lambda / 4):
  // lambda = v / f => lambda / 4 = (v_m_per_ns * 1e9 / (f_mhz * 1e6)) / 4
  const freqHz = antennaFreqMHz * 1e6;
  const vMPerSec = vCalibratedMPerNs * 1e9;
  const wavelengthM = vMPerSec / freqHz;
  const verticalResolutionCm = (wavelengthM / 4) * 100;

  // 3. Time sampling digitization quantization error:
  const errorSamplingCm = (sampleIntervalNs * vCalibratedCmNs) / 2;

  // Total Root-Sum-Square (RSS) uncertainty:
  const totalErrorCm = Math.sqrt(
    Math.pow(errorPermittivityCm, 2) +
    Math.pow(verticalResolutionCm * 0.4, 2) +
    Math.pow(errorSamplingCm * 0.5, 2)
  );

  const minProbableDepthCm = Math.max(0, calibratedDepthCm - totalErrorCm);
  const maxProbableDepthCm = calibratedDepthCm + totalErrorCm;

  // Accuracy percentage:
  const errorRatio = totalErrorCm / Math.max(1, calibratedDepthCm);
  const accuracyPercentage = Math.max(70, Math.min(99.4, 100 * (1 - errorRatio * 0.8)));

  // Sensitivity to 1.0 unit variation in epsilon_r:
  const sensitivity = calibratedDepthCm * (0.5 / nominalEpsilonR);

  let confidenceRating: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' = 'HIGH';
  if (accuracyPercentage >= 95) confidenceRating = 'VERY_HIGH';
  else if (accuracyPercentage >= 88) confidenceRating = 'HIGH';
  else if (accuracyPercentage >= 78) confidenceRating = 'MODERATE';
  else confidenceRating = 'LOW';

  return {
    anomalyId: anomaly.id,
    anomalyName: anomaly.name,
    nominalDepthCm: anomaly.z,
    calibratedDepthCm: Number(calibratedDepthCm.toFixed(1)),
    twtNs: Number(twtNs.toFixed(2)),
    depthErrorMarginCm: Number(totalErrorCm.toFixed(1)),
    minProbableDepthCm: Number(minProbableDepthCm.toFixed(1)),
    maxProbableDepthCm: Number(maxProbableDepthCm.toFixed(1)),
    accuracyPercentage: Number(accuracyPercentage.toFixed(1)),
    verticalResolutionCm: Number(verticalResolutionCm.toFixed(1)),
    permittivitySensitivityCm: Number(sensitivity.toFixed(2)),
    confidenceRating,
  };
}
