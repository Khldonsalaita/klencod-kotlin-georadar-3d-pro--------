/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { ColormapType, GprSurveyDataset } from '../types/gpr';
import { sampleColormap } from '../utils/colormaps';
import { calculateVelocity } from '../utils/gprFilters';
import { Play, Pause, ChevronLeft, ChevronRight, Activity, ZoomIn, ZoomOut, Compass } from 'lucide-react';

interface Radargram2DViewerProps {
  dataset: GprSurveyDataset;
  colormap: ColormapType;
  selectedLineIndex: number;
  onSelectLineIndex: (idx: number) => void;
  lang: 'ar' | 'en';
}

export const Radargram2DViewer: React.FC<Radargram2DViewerProps> = ({
  dataset,
  colormap,
  selectedLineIndex,
  onSelectLineIndex,
  lang,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const aScanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [displayMode, setDisplayMode] = useState<'density' | 'wiggle'>('density');
  const [selectedTraceIdx, setSelectedTraceIdx] = useState<number>(Math.floor(dataset.ny / 2));
  const [contrast, setContrast] = useState<number>(1.4);
  const [showHyperbolas, setShowHyperbolas] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hyperbolaVelocity, setHyperbolaVelocity] = useState<number>(dataset.header.velocityMeterPerNs);

  const { nx, ny, nz, processedVolume, rawVolume, header } = dataset;
  const lineIdx = Math.max(0, Math.min(nx - 1, selectedLineIndex));

  // Draw 2D B-Scan Radargram
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Get traces for the selected line
    // dataset volume format: [ (xi * ny + yi) * nz + zi ]
    if (displayMode === 'density') {
      const imgData = ctx.createImageData(width, height);
      const data = imgData.data;

      for (let py = 0; py < height; py++) {
        const zi = Math.min(nz - 1, Math.floor((py / height) * nz));
        for (let px = 0; px < width; px++) {
          const yi = Math.min(ny - 1, Math.floor((px / width) * ny));
          const traceOffset = (lineIdx * ny + yi) * nz;
          const amp = processedVolume[traceOffset + zi];

          // Normalize amplitude with contrast
          // Max amplitude range is typically ~3500
          const maxVal = 2800 / contrast;
          const norm = Math.max(0, Math.min(1, (amp + maxVal) / (2 * maxVal)));

          const rgb = sampleColormap(colormap, norm);
          const pixelIdx = (py * width + px) * 4;
          data[pixelIdx] = Math.round(rgb.r * 255);
          data[pixelIdx + 1] = Math.round(rgb.g * 255);
          data[pixelIdx + 2] = Math.round(rgb.b * 255);
          data[pixelIdx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } else {
      // Wiggle trace display with positive amplitude fill
      ctx.fillStyle = '#06080d';
      ctx.fillRect(0, 0, width, height);

      const traceSpacing = width / ny;
      for (let yi = 0; yi < ny; yi += 2) {
        const traceOffset = (lineIdx * ny + yi) * nz;
        const centerX = (yi + 0.5) * traceSpacing;

        ctx.beginPath();
        for (let zi = 0; zi < nz; zi++) {
          const py = (zi / (nz - 1)) * height;
          const amp = processedVolume[traceOffset + zi];
          const px = centerX + (amp / 2000) * traceSpacing * 2.5 * contrast;
          if (zi === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Fill positive lobes
        ctx.beginPath();
        for (let zi = 0; zi < nz; zi++) {
          const py = (zi / (nz - 1)) * height;
          const amp = processedVolume[traceOffset + zi];
          const px = centerX + Math.max(0, (amp / 2000) * traceSpacing * 2.5 * contrast);
          if (zi === 0) ctx.moveTo(centerX, py);
          else ctx.lineTo(px, py);
        }
        ctx.lineTo(centerX, height);
        ctx.fillStyle = 'rgba(0, 210, 255, 0.35)';
        ctx.fill();
      }
    }

    // Overlay Hyperbolic Diffraction curves (Hyperbolic Fitting tool)
    if (showHyperbolas) {
      ctx.save();
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      // Draw hyperbola for target at selected trace
      const apexTrace = selectedTraceIdx;
      const apexSample = Math.floor(nz * 0.35); // sample ~ depth 70cm
      const apexX = (apexTrace / ny) * width;
      const apexY = (apexSample / nz) * height;

      ctx.beginPath();
      const dt = header.sampleIntervalNs;
      const dy = header.traceSpacingM;
      const vel = hyperbolaVelocity;

      for (let px = 0; px < width; px += 2) {
        const curTrace = (px / width) * ny;
        const distM = (curTrace - apexTrace) * dy;
        const t0 = apexSample * dt;
        const t = Math.sqrt(t0 * t0 + (4 * distM * distM) / (vel * vel));
        const py = (t / (nz * dt)) * height;

        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Draw apex point
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(apexX, apexY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Selected Trace Indicator line
    const selX = (selectedTraceIdx / ny) * width;
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(selX, 0);
    ctx.lineTo(selX, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [
    dataset,
    lineIdx,
    displayMode,
    colormap,
    contrast,
    showHyperbolas,
    selectedTraceIdx,
    hyperbolaVelocity,
  ]);

  // Draw A-Scan Waveform (Trace Profile vs Depth)
  useEffect(() => {
    const canvas = aScanCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background and center zero line
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#223046';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Horizontal depth grid lines
    const depthSteps = [0, 50, 100, 150, 200, 240];
    ctx.fillStyle = '#475569';
    ctx.font = '9px monospace';
    depthSteps.forEach((d) => {
      const y = (d / 240) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.strokeStyle = '#1e293b';
      ctx.stroke();
      ctx.fillText(`${d}cm`, 4, y - 2);
    });

    // Plot raw trace (gray)
    const traceOffset = (lineIdx * ny + selectedTraceIdx) * nz;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let zi = 0; zi < nz; zi++) {
      const y = (zi / (nz - 1)) * h;
      const amp = rawVolume[traceOffset + zi];
      const x = w / 2 + (amp / 3500) * (w / 2) * 0.9;
      if (zi === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Plot processed trace (green/cyan)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let zi = 0; zi < nz; zi++) {
      const y = (zi / (nz - 1)) * h;
      const amp = processedVolume[traceOffset + zi];
      const x = w / 2 + (amp / 3500) * (w / 2) * 0.9 * contrast;
      if (zi === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [dataset, lineIdx, selectedTraceIdx, contrast, rawVolume, processedVolume]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const trace = Math.max(0, Math.min(ny - 1, Math.floor(ratio * ny)));
    setSelectedTraceIdx(trace);
  };

  return (
    <div className="flex flex-col h-full bg-[#07090e] text-slate-200 select-none">
      {/* Top B-Scan Controls Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="flex items-center bg-slate-800/80 rounded-md p-1 border border-slate-700">
            <button
              onClick={() => onSelectLineIndex(Math.max(0, lineIdx - 1))}
              className="p-1 hover:text-emerald-400"
              title="Previous Profile Line"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 font-mono text-emerald-400 font-bold">
              {lang === 'ar' ? 'المسار' : 'Line'} {lineIdx + 1} / {nx}
            </span>
            <button
              onClick={() => onSelectLineIndex(Math.min(nx - 1, lineIdx + 1))}
              className="p-1 hover:text-emerald-400"
              title="Next Profile Line"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center bg-slate-800/80 rounded-md p-0.5 border border-slate-700">
            <button
              onClick={() => setDisplayMode('density')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${
                displayMode === 'density' ? 'bg-emerald-600 text-white' : 'text-slate-400'
              }`}
            >
              {lang === 'ar' ? 'تدرج لوني (Density)' : 'Density'}
            </button>
            <button
              onClick={() => setDisplayMode('wiggle')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${
                displayMode === 'wiggle' ? 'bg-emerald-600 text-white' : 'text-slate-400'
              }`}
            >
              {lang === 'ar' ? 'موجات (Wiggle)' : 'Wiggle'}
            </button>
          </div>

          <button
            onClick={() => setShowHyperbolas(!showHyperbolas)}
            className={`px-2.5 py-1 rounded border text-xs font-medium flex items-center space-x-1 ${
              showHyperbolas
                ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Activity size={13} className="mr-1" />
            <span>{lang === 'ar' ? 'مواءمة القطع الزائد (Hyperbola)' : 'Hyperbola Fitting'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-4 rtl:space-x-reverse mt-2 sm:mt-0">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">{lang === 'ar' ? 'التباين:' : 'Contrast:'}</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={contrast}
              onChange={(e) => setContrast(parseFloat(e.target.value))}
              className="w-20 accent-emerald-500"
            />
          </div>

          {showHyperbolas && (
            <div className="flex items-center space-x-2">
              <span className="text-rose-400 font-mono text-[11px]">
                v: {(hyperbolaVelocity * 100).toFixed(1)} cm/ns
              </span>
              <input
                type="range"
                min="0.06"
                max="0.18"
                step="0.005"
                value={hyperbolaVelocity}
                onChange={(e) => setHyperbolaVelocity(parseFloat(e.target.value))}
                className="w-20 accent-rose-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Radargram + A-Scan Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* B-Scan 2D Canvas */}
        <div className="flex-1 relative flex flex-col p-3 overflow-hidden">
          {/* Axis Labels */}
          <div className="flex justify-between text-[11px] font-mono text-slate-400 px-6 pb-1">
            <span>Inline Y: 0 cm</span>
            <span className="text-emerald-400 font-bold">Trace: #{selectedTraceIdx + 1}</span>
            <span>250 cm</span>
          </div>

          <div className="flex-1 flex relative border border-slate-800 rounded bg-[#040609]">
            {/* Left Depth Axis Scale */}
            <div className="w-12 border-r border-slate-800 flex flex-col justify-between py-2 text-[10px] font-mono text-slate-400 items-end pr-2">
              <span>0 ns</span>
              <span>10 ns</span>
              <span>20 ns</span>
              <span>30 ns</span>
              <span>40 ns</span>
              <span className="text-cyan-400 font-bold">240 cm</span>
            </div>

            {/* Radargram Canvas */}
            <div className="flex-1 relative cursor-crosshair">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                onClick={handleCanvasClick}
                className="w-full h-full object-fill block"
              />
            </div>
          </div>
        </div>

        {/* Right Panel: A-Scan Single Trace Waveform Inspector */}
        <div className="w-64 border-l border-slate-800 bg-slate-900/50 p-3 flex flex-col">
          <div className="text-xs font-bold text-slate-300 pb-2 border-b border-slate-800 flex items-center justify-between">
            <span className="flex items-center">
              <Activity size={14} className="text-cyan-400 mr-1.5" />
              {lang === 'ar' ? 'إشارة الموجة (A-Scan)' : 'A-Scan Waveform'}
            </span>
            <span className="font-mono text-[10px] text-cyan-400">
              T#{selectedTraceIdx + 1}
            </span>
          </div>

          <div className="text-[10px] text-slate-400 py-1.5 flex justify-between">
            <span className="text-slate-500">── Raw Signal</span>
            <span className="text-cyan-400">── Filtered</span>
          </div>

          <div className="flex-1 border border-slate-800 rounded overflow-hidden my-1">
            <canvas
              ref={aScanCanvasRef}
              width={240}
              height={450}
              className="w-full h-full block"
            />
          </div>

          <div className="text-[10px] font-mono text-slate-400 space-y-1 bg-slate-950/60 p-2 rounded border border-slate-800/80 mt-1">
            <div className="flex justify-between">
              <span>Time-Zero:</span>
              <span className="text-slate-200">2.25 ns</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated &epsilon;r:</span>
              <span className="text-slate-200">
                {(Math.pow(0.3 / hyperbolaVelocity, 2)).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Velocity (v):</span>
              <span className="text-slate-200">
                {(hyperbolaVelocity * 100).toFixed(1)} cm/ns
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
