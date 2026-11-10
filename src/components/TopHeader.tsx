/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ColormapType, GprSurveyDataset } from '../types/gpr';
import { getColormapCssGradient } from '../utils/colormaps';
import { Radio, Eye, Layers, Compass, RotateCcw, Globe, Sliders, ArrowDownToLine } from 'lucide-react';

interface TopHeaderProps {
  dataset: GprSurveyDataset;
  colormap: ColormapType;
  onChangeColormap: (cmap: ColormapType) => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  onResetCamera: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showTags: boolean;
  onToggleTags: () => void;
  onOpenDiagnostic: () => void;
  onOpenDownloadModal: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  dataset,
  colormap,
  onChangeColormap,
  lang,
  onToggleLang,
  onResetCamera,
  showGrid,
  onToggleGrid,
  showTags,
  onToggleTags,
  onOpenDiagnostic,
  onOpenDownloadModal,
}) => {
  const gradientCss = getColormapCssGradient(colormap);
  const maxAmp = 3466.2; // Matching the screenshot's exact top-right amplitude!

  return (
    <header className="relative z-30 flex flex-col bg-slate-950/90 border-b border-slate-800/80 px-4 py-2 select-none">
      {/* Top row: Brand & Survey Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Radio size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <h1 className="font-bold text-slate-100 text-sm tracking-wide">
                GeoRadar 3D Pro
              </h1>
              <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                {dataset.header.antennaFreqMHz} MHz GPR
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md">
              {dataset.header.title}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs">
          {/* Main Download App Button */}
          <button
            onClick={onOpenDownloadModal}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center shadow-lg shadow-emerald-950/50 transition cursor-pointer"
            title={lang === 'ar' ? 'تحميل وتثبيت البرنامج' : 'Download / Install App'}
          >
            <ArrowDownToLine size={14} className="mr-1.5" />
            <span>{lang === 'ar' ? 'تحميل البرنامج' : 'Download App'}</span>
          </button>

          {/* Diagnostic Tool Button */}
          <button
            onClick={onOpenDiagnostic}
            className="px-2.5 py-1 rounded border border-emerald-500/60 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 font-mono font-semibold flex items-center space-x-1 shadow-sm transition"
            title="Soil Permittivity Calibration & Depth Accuracy Diagnostic"
          >
            <Sliders size={13} className="text-emerald-400 mr-1" />
            <span>{lang === 'ar' ? 'تشخيص ومعايرة العزل' : 'Permittivity Diagnostic'}</span>
          </button>

          {/* Tags toggle */}
          <button
            onClick={onToggleTags}
            className={`px-2.5 py-1 rounded border font-mono transition flex items-center space-x-1 ${
              showTags
                ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="Toggle 3D Tags"
          >
            <Eye size={13} className="mr-1" />
            <span>{lang === 'ar' ? 'العلامات' : 'Tags'}</span>
          </button>

          {/* Grid toggle */}
          <button
            onClick={onToggleGrid}
            className={`px-2.5 py-1 rounded border font-mono transition ${
              showGrid
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="Toggle 3D Box Grid"
          >
            <span>{lang === 'ar' ? 'الشبكة' : 'Grid'}</span>
          </button>

          {/* Reset Camera */}
          <button
            onClick={onResetCamera}
            className="p-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
            title="Reset 3D Camera"
          >
            <RotateCcw size={14} />
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="px-2.5 py-1 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold flex items-center space-x-1"
          >
            <Globe size={13} className="mr-1" />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>
        </div>
      </div>

      {/* Geophysical Colorbar Legend (Replicating the top colorbar in user's image) */}
      <div className="mt-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
        {/* Colormap switch */}
        <div className="flex items-center space-x-1 rtl:space-x-reverse text-[11px]">
          <span className="text-slate-400 mr-1">{lang === 'ar' ? 'المقياس:' : 'Palette:'}</span>
          {(['jet', 'turbo', 'seismic', 'viridis', 'copper'] as ColormapType[]).map((c) => (
            <button
              key={c}
              onClick={() => onChangeColormap(c)}
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                colormap === c
                  ? 'bg-slate-800 text-emerald-400 font-bold ring-1 ring-emerald-500'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* The Color Gradient Bar matching the screenshot */}
        <div className="flex-1 max-w-md mx-4 flex items-center space-x-2">
          <span className="text-[10px] text-slate-400 font-bold">0</span>
          <div
            className="flex-1 h-2.5 rounded-sm shadow-inner border border-slate-700"
            style={{ background: gradientCss }}
          />
          <span className="text-[10px] text-emerald-400 font-bold tracking-tight">
            +{maxAmp.toFixed(1)}
          </span>
        </div>

        {/* Dielectric info (clickable trigger) */}
        <button
          onClick={onOpenDiagnostic}
          className="hidden sm:flex items-center space-x-2 text-[10px] text-slate-300 font-mono hover:text-emerald-300 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 transition"
          title="Click to calibrate soil permittivity"
        >
          <span className="text-emerald-400 font-bold">&epsilon;r = {dataset.header.dielectricConstant.toFixed(1)}</span>
          <span className="text-slate-600">|</span>
          <span>v = {(dataset.header.velocityMeterPerNs * 100).toFixed(1)} cm/ns</span>
        </button>
      </div>
    </header>
  );
};
