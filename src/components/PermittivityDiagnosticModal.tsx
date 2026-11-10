/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { GprAnomaly, GprSurveyDataset, SoilPermittivityPreset } from '../types/gpr';
import {
  SOIL_PERMITTIVITY_PRESETS,
  calculateAnomalyDepthDiagnostic,
  calibratePermittivityFromKnownDepth,
  velocityFromPermittivity,
  AnomalyDepthDiagnostic,
} from '../utils/permittivityDiagnostics';
import {
  Gauge,
  Sliders,
  Check,
  RotateCcw,
  X,
  Target,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
  Download,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface PermittivityDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: GprSurveyDataset;
  onApplyCalibration: (calibratedEpsilonR: number, updatedAnomalies: GprAnomaly[]) => void;
  lang: 'ar' | 'en';
}

export const PermittivityDiagnosticModal: React.FC<PermittivityDiagnosticModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onApplyCalibration,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'groundtruth' | 'slider'>('presets');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('sandy_loam_avg');
  const [customEpsilonR, setCustomEpsilonR] = useState<number>(dataset.header.dielectricConstant || 9.0);
  const [epsilonUncertainty, setEpsilonUncertainty] = useState<number>(1.0); // +/- delta eps
  
  // Ground truth calibration states
  const [groundTruthAnomalyId, setGroundTruthAnomalyId] = useState<string>(
    dataset.anomalies[0]?.id || ''
  );
  const [groundTruthDepthCm, setGroundTruthDepthCm] = useState<number>(
    dataset.anomalies[0]?.z || 50
  );

  if (!isOpen) return null;

  // Selected ground truth anomaly
  const gtAnomaly = dataset.anomalies.find((a) => a.id === groundTruthAnomalyId) || dataset.anomalies[0];

  // Calculate back-calculated ground truth permittivity
  const gtCalculated = useMemo(() => {
    if (!gtAnomaly) return { calibratedEpsilonR: 9.0, calibratedVelocityCmNs: 10.0 };
    const twt = gtAnomaly.twtNs ?? (2 * gtAnomaly.z) / (dataset.header.velocityMeterPerNs * 100);
    return calibratePermittivityFromKnownDepth(twt, groundTruthDepthCm);
  }, [gtAnomaly, groundTruthDepthCm, dataset.header.velocityMeterPerNs]);

  // Active permittivity being evaluated
  const currentEpsilonR = activeTab === 'groundtruth' ? gtCalculated.calibratedEpsilonR : customEpsilonR;
  const currentVelocityMPerNs = velocityFromPermittivity(currentEpsilonR);
  const currentVelocityCmNs = currentVelocityMPerNs * 100;

  // Diagnostics for all anomalies in the survey
  const diagnosticsList: AnomalyDepthDiagnostic[] = useMemo(() => {
    return dataset.anomalies.map((anom) =>
      calculateAnomalyDepthDiagnostic(
        anom,
        currentEpsilonR,
        epsilonUncertainty,
        dataset.header.antennaFreqMHz,
        dataset.header.sampleIntervalNs,
        dataset.header.velocityMeterPerNs
      )
    );
  }, [
    dataset.anomalies,
    currentEpsilonR,
    epsilonUncertainty,
    dataset.header.antennaFreqMHz,
    dataset.header.sampleIntervalNs,
    dataset.header.velocityMeterPerNs,
  ]);

  // Average survey depth accuracy
  const averageAccuracy = useMemo(() => {
    if (diagnosticsList.length === 0) return 95;
    const sum = diagnosticsList.reduce((acc, d) => acc + d.accuracyPercentage, 0);
    return (sum / diagnosticsList.length).toFixed(1);
  }, [diagnosticsList]);

  // Handle preset selection
  const handleSelectPreset = (preset: SoilPermittivityPreset) => {
    setSelectedPresetId(preset.id);
    setCustomEpsilonR(preset.epsilonR);
    setEpsilonUncertainty(Number(((preset.epsilonRMax - preset.epsilonRMin) / 2).toFixed(1)));
  };

  // Apply calibration to dataset
  const handleApply = () => {
    // Build updated anomalies with new calibrated depths and accuracy metrics
    const updatedAnomalies: GprAnomaly[] = dataset.anomalies.map((anom) => {
      const diag = diagnosticsList.find((d) => d.anomalyId === anom.id);
      if (!diag) return anom;
      return {
        ...anom,
        z: diag.calibratedDepthCm,
        twtNs: diag.twtNs,
        depthErrorCm: diag.depthErrorMarginCm,
        accuracyPercentage: diag.accuracyPercentage,
      };
    });

    onApplyCalibration(currentEpsilonR, updatedAnomalies);
    onClose();
  };

  // Export diagnostic report
  const handleExportDiagnosticCsv = () => {
    let csv = `Target ID,Target Name,Two-Way Travel Time (ns),Nominal Depth (cm),Calibrated Depth (cm),Accuracy Margin (+/- cm),Min Probable Depth (cm),Max Probable Depth (cm),Accuracy (%),Confidence Rating,Vertical Resolution (cm),Sensitivity (cm/eps)\n`;
    diagnosticsList.forEach((d) => {
      csv += `"${d.anomalyId}","${d.anomalyName}",${d.twtNs},${d.nominalDepthCm},${d.calibratedDepthCm},${d.depthErrorMarginCm},${d.minProbableDepthCm},${d.maxProbableDepthCm},${d.accuracyPercentage},"${d.confidenceRating}",${d.verticalResolutionCm},${d.permittivitySensitivityCm}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GPR_Permittivity_Calibration_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none">
      <div className="w-full max-w-4xl bg-[#0b0e15] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <Gauge className="text-emerald-400" size={22} />
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <span>
                  {lang === 'ar'
                    ? 'أداة المعايرة والتشخيص الجيوفيزيائي لثابت العزل ودقة الأعماق'
                    : 'Soil Permittivity Calibration & Depth Accuracy Diagnostic Tool'}
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono">
                  ASTM D6432
                </span>
              </h2>
              <div className="text-[11px] text-slate-400">
                {lang === 'ar'
                  ? 'معايرة سرعة انتشار الموجة الرادارية وحساب هوامش الخطأ ودقة القياس لكل هدف مرصود'
                  : 'Radar velocity calibration & rigorous depth error propagation for marked anomalies'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Top Summary KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-900/60 border-b border-slate-800/80 text-xs">
          {/* Active Dielectric Constant */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              {lang === 'ar' ? 'ثابت العزل الكهربائي (&epsilon;r)' : 'Relative Permittivity (&epsilon;r)'}
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5 font-mono">
              <span className="text-lg font-bold text-emerald-400">{currentEpsilonR.toFixed(1)}</span>
              <span className="text-[11px] text-slate-400">&plusmn; {epsilonUncertainty.toFixed(1)}</span>
            </div>
          </div>

          {/* Calibrated Velocity */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              {lang === 'ar' ? 'سرعة الانتشار (Velocity)' : 'Propagation Velocity (v)'}
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5 font-mono">
              <span className="text-lg font-bold text-cyan-400">{currentVelocityCmNs.toFixed(1)}</span>
              <span className="text-[11px] text-slate-400">cm/ns</span>
            </div>
          </div>

          {/* Average Accuracy Rating */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              {lang === 'ar' ? 'متوسط دقة الأعماق' : 'Mean Depth Accuracy'}
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5 font-mono">
              <span className="text-lg font-bold text-amber-400">{averageAccuracy}%</span>
              <ShieldCheck size={14} className="text-emerald-400" />
            </div>
          </div>

          {/* Quarter Wavelength Resolution limit */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              {lang === 'ar' ? 'حد التمييز الرأسي (&lambda;/4)' : 'Vertical Resolution (&lambda;/4)'}
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5 font-mono">
              <span className="text-lg font-bold text-rose-400">
                {(currentVelocityCmNs / (4 * (dataset.header.antennaFreqMHz / 1000))).toFixed(1)}
              </span>
              <span className="text-[11px] text-slate-400">cm</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-5 pt-3 bg-slate-900/40 border-b border-slate-800 space-x-3 rtl:space-x-reverse text-xs">
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-2.5 font-bold transition border-b-2 ${
              activeTab === 'presets'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'ar' ? '1. مكتبة أنواع التربة القياسية (Soil Library)' : '1. Standard Soil Library'}
          </button>
          <button
            onClick={() => setActiveTab('groundtruth')}
            className={`pb-2.5 font-bold transition border-b-2 ${
              activeTab === 'groundtruth'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'ar' ? '2. معايرة حقيقية بهدف معلوم (Ground-Truth)' : '2. Known Depth Calibration'}
          </button>
          <button
            onClick={() => setActiveTab('slider')}
            className={`pb-2.5 font-bold transition border-b-2 ${
              activeTab === 'slider'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'ar' ? '3. المعايرة اليدوية الدقيقة (Fine-Tune)' : '3. Manual Slider Tuning'}
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* TAB 1: Soil Library Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="text-slate-400">
                {lang === 'ar'
                  ? 'اختر نوع التربة أو الوسط الجيولوجي المطابق لموقع المسح لتعديل سرعة انتشار الموجة فورياً:'
                  : 'Select standard soil or rock medium matching your survey site to calibrate propagation velocity:'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SOIL_PERMITTIVITY_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                          : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-100">
                            {lang === 'ar' ? preset.nameAr : preset.nameEn}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {preset.typicalUse}
                          </div>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold ml-2">
                          &epsilon;r: {preset.epsilonR}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400">
                        <span>v = {preset.velocityCmNs} cm/ns</span>
                        <span>النطاق: {preset.epsilonRMin} - {preset.epsilonRMax}</span>
                        <span>وهن: {preset.attenuationDbM} dB/m</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Ground-Truth Known Depth Back-Calculation */}
          {activeTab === 'groundtruth' && (
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
              <div className="flex items-start space-x-2 rtl:space-x-reverse text-amber-300">
                <Info size={16} className="mt-0.5 shrink-0" />
                <p>
                  {lang === 'ar'
                    ? 'إذا كان لديك عمق فيزيائي مؤكد لأحد الأهداف المرصودة (مثل أنبوب تم كشفه بالحفر أو غرفة أثرية معروفة العمق)، أدخل العمق الحقيقي ليقوم النظام بحساب ثابت العزل الفعلي بالموقع فورياً وتعديل باقي الأهداف!'
                    : 'If you have an excavated or verified physical depth for any marked target, enter it below to back-calculate the exact in-situ permittivity and recalibrate all anomalies.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {lang === 'ar' ? 'الهدف المرجعي المعلوم العمق:' : 'Reference Target:'}
                  </label>
                  <select
                    value={groundTruthAnomalyId}
                    onChange={(e) => {
                      setGroundTruthAnomalyId(e.target.value);
                      const an = dataset.anomalies.find((a) => a.id === e.target.value);
                      if (an) setGroundTruthDepthCm(an.z);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
                  >
                    {dataset.anomalies.map((an) => (
                      <option key={an.id} value={an.id}>
                        {an.name} (مقاس مبدئياً: {an.z} cm / سعة: {an.amplitude})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {lang === 'ar' ? 'العمق الفيزيائي الحقيقي المؤكد (سم):' : 'Confirmed Ground-Truth Depth (cm):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="0.5"
                    value={groundTruthDepthCm}
                    onChange={(e) => setGroundTruthDepthCm(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-emerald-400 font-bold"
                  />
                </div>
              </div>

              {/* Calculated In-Situ Permittivity Result */}
              <div className="p-3 bg-slate-950 rounded-lg border border-emerald-500/50 flex items-center justify-between font-mono">
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {lang === 'ar' ? 'ثابت العزل الكهربائي المحسوب من الموقع:' : 'Back-Calculated In-Situ Permittivity:'}
                  </span>
                  <span className="text-base font-bold text-emerald-400">
                    &epsilon;r(calibrated) = {gtCalculated.calibratedEpsilonR.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">
                    {lang === 'ar' ? 'السرعة الفعلية المعايرة:' : 'Calibrated Velocity:'}
                  </span>
                  <span className="text-base font-bold text-cyan-400">
                    {gtCalculated.calibratedVelocityCmNs.toFixed(2)} cm/ns
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Manual Slider Tuning */}
          {activeTab === 'slider' && (
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
              <div>
                <div className="flex justify-between font-mono mb-1">
                  <span>{lang === 'ar' ? 'قيمة ثابت العزل (&epsilon;r):' : 'Permittivity Value (&epsilon;r):'}</span>
                  <span className="text-emerald-400 font-bold">{customEpsilonR.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="35.0"
                  step="0.1"
                  value={customEpsilonR}
                  onChange={(e) => setCustomEpsilonR(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono mb-1">
                  <span>
                    {lang === 'ar' ? 'هامش عدم التيقن في رطوبة التربة (&plusmn;&Delta;&epsilon;r):' : 'Soil Moisture Uncertainty Margin (&plusmn;&Delta;&epsilon;r):'}
                  </span>
                  <span className="text-amber-400 font-bold">&plusmn; {epsilonUncertainty.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.1"
                  value={epsilonUncertainty}
                  onChange={(e) => setEpsilonUncertainty(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          )}

          {/* Detailed Accuracy Table for all Marked Anomalies */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-200 flex items-center">
                <Target size={15} className="mr-1.5 text-amber-400" />
                {lang === 'ar'
                  ? 'جدول تقدير دقة وهوامش الأعماق للشواذ المرصودة (Depth Accuracy Matrix):'
                  : 'Depth Accuracy & Error Margins for Marked Anomalies:'}
              </h3>
              <button
                onClick={handleExportDiagnosticCsv}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold flex items-center space-x-1"
              >
                <Download size={13} className="mr-1" />
                <span>{lang === 'ar' ? 'تصدير التقرير (.CSV)' : 'Export CSV'}</span>
              </button>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-950/80">
              <table className="w-full text-start text-xs font-mono">
                <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                  <tr>
                    <th className="p-2.5 text-start">{lang === 'ar' ? 'الشاذة' : 'Target'}</th>
                    <th className="p-2.5 text-center">{lang === 'ar' ? 'الزمن TWT' : 'TWT (ns)'}</th>
                    <th className="p-2.5 text-center">{lang === 'ar' ? 'العمق المبدئي' : 'Nominal'}</th>
                    <th className="p-2.5 text-center text-emerald-400">{lang === 'ar' ? 'العمق المعاير' : 'Calibrated Depth'}</th>
                    <th className="p-2.5 text-center text-amber-300">{lang === 'ar' ? 'هامش الخطأ' : 'Error (&plusmn;cm)'}</th>
                    <th className="p-2.5 text-center">{lang === 'ar' ? 'النطاق المحتمل' : 'Probable Range'}</th>
                    <th className="p-2.5 text-center">{lang === 'ar' ? 'نسبة الدقة' : 'Accuracy'}</th>
                    <th className="p-2.5 text-center">{lang === 'ar' ? 'التمييز &lambda;/4' : '&lambda;/4'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-[11px]">
                  {diagnosticsList.map((diag) => (
                    <tr key={diag.anomalyId} className="hover:bg-slate-900/60 transition">
                      <td className="p-2.5 font-sans font-semibold text-slate-200">
                        {diag.anomalyName}
                      </td>
                      <td className="p-2.5 text-center text-slate-400">
                        {diag.twtNs} ns
                      </td>
                      <td className="p-2.5 text-center text-slate-400">
                        {diag.nominalDepthCm} cm
                      </td>
                      <td className="p-2.5 text-center font-bold text-emerald-400">
                        {diag.calibratedDepthCm} cm
                      </td>
                      <td className="p-2.5 text-center font-bold text-amber-400">
                        &plusmn; {diag.depthErrorMarginCm} cm
                      </td>
                      <td className="p-2.5 text-center text-slate-300">
                        [{diag.minProbableDepthCm} - {diag.maxProbableDepthCm}]
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            diag.accuracyPercentage >= 95
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : diag.accuracyPercentage >= 88
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {diag.accuracyPercentage}%
                        </span>
                      </td>
                      <td className="p-2.5 text-center text-slate-400">
                        {diag.verticalResolutionCm} cm
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-t border-slate-800">
          <div className="text-xs text-slate-400 font-mono">
            {lang === 'ar'
              ? `السرعة الناتجة: ${currentVelocityCmNs.toFixed(2)} cm/ns`
              : `Resulting Velocity: ${currentVelocityCmNs.toFixed(2)} cm/ns`}
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold flex items-center shadow-lg shadow-emerald-950/40"
            >
              <Check size={15} className="mr-1.5" />
              {lang === 'ar' ? 'تطبيق المعايرة وتحديث الأعماق ثلاثية الأبعاد' : 'Apply Calibration & Update 3D Depths'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
