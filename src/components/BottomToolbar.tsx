/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ViewMode } from '../types/gpr';
import {
  Layers,
  Grid,
  Activity,
  Sliders,
  Target,
  FolderOpen,
  ChevronUp,
  ChevronDown,
  Camera,
  Eye,
} from 'lucide-react';

interface BottomToolbarProps {
  currentMode: ViewMode;
  onChangeMode: (mode: ViewMode) => void;
  soilOpacity: number;
  onChangeSoilOpacity: (val: number) => void;
  threshold: number;
  onChangeThreshold: (val: number) => void;
  sliceX: number;
  onChangeSliceX: (val: number) => void;
  sliceY: number;
  onChangeSliceY: (val: number) => void;
  sliceZ: number;
  onChangeSliceZ: (val: number) => void;
  showIsosurface: boolean;
  onToggleIsosurface: () => void;
  showSlices: boolean;
  onToggleSlices: () => void;
  onChangeCameraPreset: (preset: 'iso' | 'top' | 'front' | 'side') => void;
  onOpenDiagnostic?: () => void;
  lang: 'ar' | 'en';
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  currentMode,
  onChangeMode,
  soilOpacity,
  onChangeSoilOpacity,
  threshold,
  onChangeThreshold,
  sliceX,
  onChangeSliceX,
  sliceY,
  onChangeSliceY,
  sliceZ,
  onChangeSliceZ,
  showIsosurface,
  onToggleIsosurface,
  showSlices,
  onToggleSlices,
  onChangeCameraPreset,
  onOpenDiagnostic,
  lang,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center select-none w-full max-w-xl px-4 pointer-events-auto">
      {/* Collapsible Sliders Drawer */}
      {isDrawerOpen && (
        <div className="w-full mb-3 p-4 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl text-xs space-y-3.5 backdrop-blur-none text-slate-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="font-bold text-emerald-400">
                {lang === 'ar' ? 'معايير الرؤية والتشريح الحجمي' : '3D Volume & Slice Parameters'}
              </span>
              {onOpenDiagnostic && (
                <button
                  onClick={onOpenDiagnostic}
                  className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/50 hover:bg-emerald-900 text-emerald-300 text-[10px] font-bold transition flex items-center space-x-1"
                >
                  <Sliders size={11} className="mr-1" />
                  <span>{lang === 'ar' ? 'أداة المعايرة' : 'Diagnostic'}</span>
                </button>
              )}
            </div>
            {/* Camera View Presets */}
            <div className="flex items-center space-x-1 rtl:space-x-reverse">
              <span className="text-[11px] text-slate-400 mr-1">
                {lang === 'ar' ? 'الزاوية:' : 'View:'}
              </span>
              {(['iso', 'top', 'front', 'side'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => onChangeCameraPreset(p)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono uppercase text-slate-300"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Soil Matrix Opacity */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>{lang === 'ar' ? 'شفافية التربة المحيطة:' : 'Soil Opacity:'}</span>
                <span className="font-mono text-emerald-400">{Math.round(soilOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.45"
                step="0.01"
                value={soilOpacity}
                onChange={(e) => onChangeSoilOpacity(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Depth Z Slice (0 to 240 cm) */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>{lang === 'ar' ? 'شريحة العمق Z (Time Slice):' : 'Depth Z Slice:'}</span>
                <span className="font-mono text-cyan-400">
                  {Math.round((sliceZ / 100) * 240)} cm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliceZ}
                onChange={(e) => onChangeSliceZ(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Inline Y Slice */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>{lang === 'ar' ? 'المسار الطولي Inline Y:' : 'Inline Y Slice:'}</span>
                <span className="font-mono text-amber-400">
                  {Math.round((sliceY / 100) * 250)} cm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliceY}
                onChange={(e) => onChangeSliceY(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Anomaly Isolation Threshold */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>{lang === 'ar' ? 'عتبة عزل الشواذ (Threshold):' : 'Anomaly Threshold:'}</span>
                <span className="font-mono text-rose-400">{Math.round(threshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.02"
                value={threshold}
                onChange={(e) => onChangeThreshold(parseFloat(e.target.value))}
                className="w-full accent-rose-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Drawer Toggle Tab */}
      <button
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
        className="mb-1.5 px-3 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] text-slate-300 hover:text-white flex items-center space-x-1 shadow-md transition"
      >
        {isDrawerOpen ? (
          <>
            <ChevronDown size={14} />
            <span>{lang === 'ar' ? 'إخفاء شريط المعايرة' : 'Hide Controls'}</span>
          </>
        ) : (
          <>
            <ChevronUp size={14} />
            <span>{lang === 'ar' ? 'معايرة الأبعاد والشرائح' : 'Slice & Depth Controls'}</span>
          </>
        )}
      </button>

      {/* Circular Bottom Dock matching the user's reference image exactly */}
      <div className="flex items-center space-x-3 bg-slate-950/90 border border-slate-800/90 p-2 rounded-full shadow-2xl">
        {/* Button 1: 3D Volumetric / Isosurface */}
        <button
          onClick={() => onChangeMode('volume')}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            currentMode === 'volume'
              ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/30 scale-105'
              : 'border border-emerald-500/40 bg-slate-900/80 text-emerald-400/80 hover:bg-slate-800 hover:text-emerald-300'
          }`}
          title={lang === 'ar' ? 'تشكيل حجمي ثلاثي الأبعاد' : '3D Volumetric View'}
        >
          {/* Circular ellipse icon as in screenshot */}
          <div className="w-6 h-3 rounded-full border-2 border-current transform rotate-[-15deg]" />
        </button>

        {/* Button 2: Orthogonal Slices / C-Scan */}
        <button
          onClick={() => onChangeMode('slices')}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            currentMode === 'slices'
              ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/30 scale-105'
              : 'border border-emerald-500/40 bg-slate-900/80 text-emerald-400/80 hover:bg-slate-800 hover:text-emerald-300'
          }`}
          title={lang === 'ar' ? 'الشرائح المتعامدة C-Scan' : 'Orthogonal Slices'}
        >
          <Grid size={20} />
        </button>

        {/* Button 3: 2D Radargram B-Scan */}
        <button
          onClick={() => onChangeMode('radargram')}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            currentMode === 'radargram'
              ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/30 scale-105'
              : 'border border-emerald-500/40 bg-slate-900/80 text-emerald-400/80 hover:bg-slate-800 hover:text-emerald-300'
          }`}
          title={lang === 'ar' ? 'مقطع راديوغرام ثنائي الأبعاد B-Scan' : '2D Radargram B-Scan'}
        >
          <Activity size={20} />
        </button>

        {/* Button 4: Geophysical Processing & Filters */}
        <button
          onClick={() => onChangeMode('filters')}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            currentMode === 'filters'
              ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/30 scale-105'
              : 'border border-emerald-500/40 bg-slate-900/80 text-emerald-400/80 hover:bg-slate-800 hover:text-emerald-300'
          }`}
          title={lang === 'ar' ? 'الفلاتر وسلسلة المعالجة الجيوفيزيائية' : 'Geophysical Filter Pipeline'}
        >
          <Sliders size={20} />
        </button>

        {/* Button 5: Target Anomaly Picking & Geo-markers */}
        <button
          onClick={() => onChangeMode('anomalies')}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            currentMode === 'anomalies'
              ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/30 scale-105'
              : 'border border-emerald-500/40 bg-slate-900/80 text-emerald-400/80 hover:bg-slate-800 hover:text-emerald-300'
          }`}
          title={lang === 'ar' ? 'سجل الشواذ والعلامات' : 'Target Picks & Annotations'}
        >
          <Target size={20} />
        </button>

        {/* Button 6: File Management & Export */}
        <button
          onClick={() => onChangeMode('settings')}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            currentMode === 'settings'
              ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/30 scale-105'
              : 'border border-emerald-500/40 bg-slate-900/80 text-emerald-400/80 hover:bg-slate-800 hover:text-emerald-300'
          }`}
          title={lang === 'ar' ? 'استيراد وتصدير الملفات' : 'Import / Export / Files'}
        >
          <FolderOpen size={20} />
        </button>
      </div>
    </div>
  );
};
