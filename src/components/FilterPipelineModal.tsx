/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FilterSettings } from '../types/gpr';
import { Sliders, RotateCcw, Check, Sparkles, X, HelpCircle, Layers, Zap } from 'lucide-react';

interface FilterPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterSettings;
  onApplyFilters: (newFilters: FilterSettings) => void;
  lang: 'ar' | 'en';
}

export const FilterPipelineModal: React.FC<FilterPipelineModalProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  lang,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterSettings>({ ...filters });

  if (!isOpen) return null;

  const handleApplyPreset = (presetKey: 'archaeo' | 'pipes' | 'voids' | 'concrete') => {
    if (presetKey === 'archaeo') {
      setLocalFilters({
        timeZeroCorrection: true,
        timeZeroSamples: 3,
        dewow: true,
        dewowWindow: 24,
        backgroundRemoval: true,
        backgroundWindow: 12,
        gainType: 'exponential',
        gainValue: 1.8,
        agcWindow: 32,
        bandpass: true,
        fLowCut: 120,
        fHighCut: 650,
        kirchhoffMigration: true,
        migrationAperture: 4,
        envelope: true,
      });
    } else if (presetKey === 'pipes') {
      setLocalFilters({
        timeZeroCorrection: true,
        timeZeroSamples: 2,
        dewow: true,
        dewowWindow: 20,
        backgroundRemoval: true,
        backgroundWindow: 8,
        gainType: 'agc',
        gainValue: 2.2,
        agcWindow: 20,
        bandpass: true,
        fLowCut: 150,
        fHighCut: 800,
        kirchhoffMigration: true,
        migrationAperture: 5,
        envelope: true,
      });
    } else if (presetKey === 'voids') {
      setLocalFilters({
        timeZeroCorrection: true,
        timeZeroSamples: 4,
        dewow: true,
        dewowWindow: 32,
        backgroundRemoval: true,
        backgroundWindow: 16,
        gainType: 'exponential',
        gainValue: 2.4,
        agcWindow: 36,
        bandpass: true,
        fLowCut: 80,
        fHighCut: 500,
        kirchhoffMigration: true,
        migrationAperture: 6,
        envelope: true,
      });
    } else {
      setLocalFilters({
        timeZeroCorrection: true,
        timeZeroSamples: 1,
        dewow: true,
        dewowWindow: 16,
        backgroundRemoval: true,
        backgroundWindow: 6,
        gainType: 'linear',
        gainValue: 1.5,
        agcWindow: 20,
        bandpass: true,
        fLowCut: 400,
        fHighCut: 1200,
        kirchhoffMigration: true,
        migrationAperture: 3,
        envelope: true,
      });
    }
  };

  const handleSave = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-none p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0c1017] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <Sliders className="text-emerald-400" size={20} />
            <h2 className="text-sm font-bold text-slate-100">
              {lang === 'ar'
                ? 'سلسلة المعالجة الجيوفيزيائية والفلاتر القياسية (GPR Processing Pipeline)'
                : 'Geophysical Processing & Filter Pipeline (ReflexW / RADAN Standard)'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs overflow-x-auto">
          <span className="text-slate-400 font-medium whitespace-nowrap">
            {lang === 'ar' ? 'نماذج جاهزة سريعة:' : 'Quick Presets:'}
          </span>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => handleApplyPreset('archaeo')}
              className="px-2.5 py-1 bg-amber-950/60 border border-amber-600/50 hover:bg-amber-900 text-amber-300 rounded font-medium transition"
            >
              {lang === 'ar' ? 'معالجة الآثار والسراديب' : 'Archaeology & Vaults'}
            </button>
            <button
              onClick={() => handleApplyPreset('pipes')}
              className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-600/50 hover:bg-emerald-900 text-emerald-300 rounded font-medium transition"
            >
              {lang === 'ar' ? 'كشف الأنابيب والمرافق' : 'Utility & Pipes'}
            </button>
            <button
              onClick={() => handleApplyPreset('voids')}
              className="px-2.5 py-1 bg-cyan-950/60 border border-cyan-600/50 hover:bg-cyan-900 text-cyan-300 rounded font-medium transition"
            >
              {lang === 'ar' ? 'الفراغات والكهوف' : 'Deep Voids & Karst'}
            </button>
          </div>
        </div>

        {/* Filter List Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* 1. Time-Zero Correction */}
          <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.timeZeroCorrection}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, timeZeroCorrection: e.target.checked })
                  }
                  className="rounded accent-emerald-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-200">
                  1. {lang === 'ar' ? 'تصحيح زمن الصفر (Time-Zero Correction)' : 'Time-Zero Static Shift'}
                </span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {localFilters.timeZeroSamples} samples
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              {lang === 'ar'
                ? 'محاذاة وصول الموجة المباشرة الأولى مع السطح الحقيقي للأرض وتصحيح انزياح الهوائي.'
                : 'Aligns the first direct wave arrival peak to true ground zero surface.'}
            </p>
            {localFilters.timeZeroCorrection && (
              <input
                type="range"
                min="0"
                max="8"
                value={localFilters.timeZeroSamples}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, timeZeroSamples: parseInt(e.target.value) })
                }
                className="w-full accent-emerald-500"
              />
            )}
          </div>

          {/* 2. Dewow Filter */}
          <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.dewow}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, dewow: e.target.checked })
                  }
                  className="rounded accent-emerald-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-200">
                  2. {lang === 'ar' ? 'فلتر إزالة الانجراف والترددات المنخفضة (Dewow Filter)' : 'Dewow (High-Pass Drift Filter)'}
                </span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Win: {localFilters.dewowWindow}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              {lang === 'ar'
                ? 'طرح المتوسط المتحرك الزمني لإزالة التشويش الحثي للهوائي وانجراف التيار الكهربائي المستمر.'
                : 'Subtracts running mean to remove low-frequency instrument wow and antenna inductive coupling.'}
            </p>
            {localFilters.dewow && (
              <input
                type="range"
                min="8"
                max="64"
                step="4"
                value={localFilters.dewowWindow}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, dewowWindow: parseInt(e.target.value) })
                }
                className="w-full accent-emerald-500"
              />
            )}
          </div>

          {/* 3. Background Removal */}
          <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.backgroundRemoval}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, backgroundRemoval: e.target.checked })
                  }
                  className="rounded accent-emerald-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-200">
                  3. {lang === 'ar' ? 'إزالة الخلفية والخطوط الأفقية (Background Removal)' : 'Background Removal (Horizontal Banding)'}
                </span>
              </label>
            </div>
            <p className="text-[11px] text-slate-400">
              {lang === 'ar'
                ? 'طرح الإشارة الأفقية الموحدة لعزل انعكاسات القطع الزائد والأهداف المدفونة بدقة.'
                : 'Subtracts horizontal average profile to eliminate ringing and expose buried hyperbolas.'}
            </p>
          </div>

          {/* 4. Gain Function (AGC & Exponential) */}
          <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">
                4. {lang === 'ar' ? 'دالة التعويض والتكبير (Gain Function)' : 'Signal Gain Compensation'}
              </span>
              <div className="flex items-center space-x-2">
                {(['none', 'linear', 'exponential', 'agc'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setLocalFilters({ ...localFilters, gainType: g })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                      localFilters.gainType === g
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              {lang === 'ar'
                ? 'تعويض التشتت الهندسي وامتصاص طاقة الرادار مع زيادة العمق (SEC / AGC).'
                : 'Compensates for wave spherical spreading and dielectric absorption with depth.'}
            </p>
            {localFilters.gainType !== 'none' && (
              <div className="flex items-center space-x-3">
                <span className="text-slate-400 text-[11px]">
                  {lang === 'ar' ? 'معامل التكبير:' : 'Factor:'} {localFilters.gainValue.toFixed(1)}x
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={localFilters.gainValue}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, gainValue: parseFloat(e.target.value) })
                  }
                  className="flex-1 accent-emerald-500"
                />
              </div>
            )}
          </div>

          {/* 5. Kirchhoff Migration */}
          <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.kirchhoffMigration}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, kirchhoffMigration: e.target.checked })
                  }
                  className="rounded accent-emerald-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-200">
                  5. {lang === 'ar' ? 'الهجرة الكيرشوفية 2D/3D (Kirchhoff Migration)' : '2D/3D Kirchhoff Migration'}
                </span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Aperture: {localFilters.migrationAperture} traces
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              {lang === 'ar'
                ? 'تجميع أقواس القطع الزائد وإعادة تركيز الطاقة في الموقع المكاني والعمق الهندسي الدقيق للهدف.'
                : 'Collapses hyperbolic diffractions and repositions reflected energy to true 3D spatial points.'}
            </p>
            {localFilters.kirchhoffMigration && (
              <input
                type="range"
                min="2"
                max="8"
                value={localFilters.migrationAperture}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, migrationAperture: parseInt(e.target.value) })
                }
                className="w-full accent-emerald-500"
              />
            )}
          </div>

          {/* 6. Hilbert Transform Envelope */}
          <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.envelope}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, envelope: e.target.checked })
                  }
                  className="rounded accent-emerald-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-200">
                  6. {lang === 'ar' ? 'تحويل هيلبرت / السعة اللحظية (Hilbert Envelope)' : 'Hilbert Transform (Instantaneous Amplitude)'}
                </span>
              </label>
            </div>
            <p className="text-[11px] text-slate-400">
              {lang === 'ar'
                ? 'حساب غلاف الطاقة اللحظية لاستخراج الأشكال الحجمية ثلاثية الأبعاد وعزل الأهداف المعاكسة.'
                : 'Computes analytic signal energy envelope for 3D isosurfacing and time-slice contouring.'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-t border-slate-800">
          <button
            onClick={() => handleApplyPreset('archaeo')}
            className="flex items-center text-xs text-slate-400 hover:text-slate-200"
          >
            <RotateCcw size={14} className="mr-1.5" />
            {lang === 'ar' ? 'استعادة الافتراضي' : 'Reset to Default'}
          </button>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold flex items-center shadow-lg shadow-emerald-950/40"
            >
              <Check size={15} className="mr-1.5" />
              {lang === 'ar' ? 'تطبيق الفلاتر وإعادة المعالجة' : 'Apply Pipeline & Recompute'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
