/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useTransition } from 'react';
import { ColormapType, GprAnomaly, GprSurveyDataset, ViewMode, FilterSettings } from './types/gpr';
import { createReferenceDataset } from './utils/gprParsers';
import { runProcessingPipeline } from './utils/gprFilters';
import { Gpr3DViewer } from './components/Gpr3DViewer';
import { Radargram2DViewer } from './components/Radargram2DViewer';
import { TopHeader } from './components/TopHeader';
import { BottomToolbar } from './components/BottomToolbar';
import { FilterPipelineModal } from './components/FilterPipelineModal';
import { AnomalyInspectorModal } from './components/AnomalyInspectorModal';
import { ImportExportModal } from './components/ImportExportModal';
import { PermittivityDiagnosticModal } from './components/PermittivityDiagnosticModal';
import { AppDownloadModal } from './components/AppDownloadModal';
import { velocityFromPermittivity } from './utils/permittivityDiagnostics';

export default function App() {
  const [dataset, setDataset] = useState<GprSurveyDataset>(() => createReferenceDataset());
  const [colormap, setColormap] = useState<ColormapType>('jet');
  const [currentMode, setCurrentMode] = useState<ViewMode>('volume');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [diagnosticNotification, setDiagnosticNotification] = useState<string | null>(null);

  // Visualization settings
  const [threshold, setThreshold] = useState<number>(0.45);
  const [soilOpacity, setSoilOpacity] = useState<number>(0.12);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showIsosurface, setShowIsosurface] = useState<boolean>(true);
  const [showSlices, setShowSlices] = useState<boolean>(false);
  const [showTags, setShowTags] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Slices
  const [sliceX, setSliceX] = useState<number>(50);
  const [sliceY, setSliceY] = useState<number>(50);
  const [sliceZ, setSliceZ] = useState<number>(45);

  // Navigation
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front' | 'side'>('iso');
  const [selectedAnomaly, setSelectedAnomaly] = useState<GprAnomaly | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(15);
  const [isProcessing, startTransition] = useTransition();

  // Mode change handler
  const handleModeChange = (mode: ViewMode) => {
    setCurrentMode(mode);
    if (mode === 'slices') {
      setShowSlices(true);
      setShowVolume(true);
    } else if (mode === 'volume') {
      setShowSlices(false);
      setShowVolume(true);
      setShowIsosurface(true);
    }
  };

  // Filter application pipeline
  const handleApplyFilters = (newFilters: FilterSettings) => {
    startTransition(() => {
      const { processed, envelope, minVal, maxVal } = runProcessingPipeline(
        dataset.rawVolume,
        dataset.nx,
        dataset.ny,
        dataset.nz,
        dataset.header,
        newFilters
      );

      setDataset({
        ...dataset,
        filters: newFilters,
        processedVolume: processed,
        envelopeVolume: envelope,
        minVal,
        maxVal,
      });
    });
  };

  // Apply soil permittivity calibration and depth accuracy updates
  const handleApplyCalibration = (calibratedEpsilonR: number, updatedAnomalies: GprAnomaly[]) => {
    startTransition(() => {
      const newVelocity = velocityFromPermittivity(calibratedEpsilonR);
      const updatedHeader = {
        ...dataset.header,
        dielectricConstant: Number(calibratedEpsilonR.toFixed(2)),
        velocityMeterPerNs: Number(newVelocity.toFixed(4)),
        maxDepthCm: Math.round((newVelocity * dataset.header.timeWindowNs * 0.5) * 100),
      };

      const { processed, envelope, minVal, maxVal } = runProcessingPipeline(
        dataset.rawVolume,
        dataset.nx,
        dataset.ny,
        dataset.nz,
        updatedHeader,
        dataset.filters
      );

      setDataset({
        ...dataset,
        header: updatedHeader,
        anomalies: updatedAnomalies,
        processedVolume: processed,
        envelopeVolume: envelope,
        minVal,
        maxVal,
      });

      const msg =
        lang === 'ar'
          ? `تمت معايرة ثابت العزل إلى ${calibratedEpsilonR.toFixed(1)} وسرعة الرادار ${(newVelocity * 100).toFixed(1)} cm/ns وتحديث أعماق الشواذ بنجاح!`
          : `Calibrated permittivity to ${calibratedEpsilonR.toFixed(1)} and velocity to ${(newVelocity * 100).toFixed(1)} cm/ns. Depths updated!`;
      setDiagnosticNotification(msg);
      setTimeout(() => setDiagnosticNotification(null), 5000);
    });
  };

  // Add new anomaly pick
  const handleAddAnomaly = (anomaly: GprAnomaly) => {
    setDataset({
      ...dataset,
      anomalies: [...dataset.anomalies, anomaly],
    });
  };

  // Delete anomaly
  const handleDeleteAnomaly = (id: string) => {
    setDataset({
      ...dataset,
      anomalies: dataset.anomalies.filter((a) => a.id !== id),
    });
    if (selectedAnomaly?.id === id) {
      setSelectedAnomaly(null);
    }
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="flex flex-col w-screen h-screen bg-[#06080d] text-slate-100 overflow-hidden font-sans select-none"
    >
      {/* Top Header & Amplitude Bar */}
      <TopHeader
        dataset={dataset}
        colormap={colormap}
        onChangeColormap={setColormap}
        lang={lang}
        onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        onResetCamera={() => setCameraPreset('iso')}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        showTags={showTags}
        onToggleTags={() => setShowTags(!showTags)}
        onOpenDiagnostic={() => setIsDiagnosticOpen(true)}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {currentMode === 'radargram' ? (
          <Radargram2DViewer
            dataset={dataset}
            colormap={colormap}
            selectedLineIndex={selectedLineIndex}
            onSelectLineIndex={setSelectedLineIndex}
            lang={lang}
          />
        ) : (
          <Gpr3DViewer
            dataset={dataset}
            colormap={colormap}
            threshold={threshold}
            selectedAnomalyId={selectedAnomaly?.id || null}
            onSelectAnomaly={setSelectedAnomaly}
            showVolume={showVolume}
            showIsosurface={showIsosurface}
            showSlices={showSlices || currentMode === 'slices'}
            showTags={showTags}
            showGrid={showGrid}
            sliceX={sliceX}
            sliceY={sliceY}
            sliceZ={sliceZ}
            soilOpacity={soilOpacity}
            cameraPreset={cameraPreset}
          />
        )}

        {/* Selected Anomaly Quick Details Card (Floats if an anomaly is clicked) */}
        {selectedAnomaly && currentMode !== 'radargram' && (
          <div className="absolute top-4 right-4 z-30 max-w-xs bg-slate-900/95 border border-amber-500/60 rounded-xl p-3.5 shadow-2xl text-xs space-y-2 backdrop-blur-none text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-amber-400">{selectedAnomaly.name}</span>
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                &times;
              </button>
            </div>
            <div className="text-[11px] text-slate-300">
              <div className="text-emerald-400 font-semibold mb-1">
                {selectedAnomaly.materialEstimate}
              </div>
              <div className="grid grid-cols-2 gap-1 font-mono text-[10px] bg-slate-950/70 p-2 rounded border border-slate-800">
                <span>X: {selectedAnomaly.x} cm</span>
                <span>Y: {selectedAnomaly.y} cm</span>
                <span className="text-amber-300 font-bold">
                  {lang === 'ar' ? 'العمق:' : 'Depth:'} {typeof selectedAnomaly.z === 'number' ? selectedAnomaly.z.toFixed(1) : selectedAnomaly.z} cm
                </span>
                <span
                  className={selectedAnomaly.amplitude >= 0 ? 'text-amber-400' : 'text-cyan-400'}
                >
                  {selectedAnomaly.amplitude >= 0 ? '+' : ''}
                  {selectedAnomaly.amplitude.toFixed(1)}
                </span>
                {selectedAnomaly.depthErrorCm ? (
                  <div className="col-span-2 text-emerald-400 font-bold pt-1 border-t border-slate-800 flex justify-between">
                    <span>{lang === 'ar' ? 'هامش الدقة:' : 'Accuracy Margin:'}</span>
                    <span>
                      &plusmn;{selectedAnomaly.depthErrorCm} cm ({selectedAnomaly.accuracyPercentage || 95}%)
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="text-slate-400 mt-2 text-[10px]">
                {selectedAnomaly.notes}
              </div>
              <button
                onClick={() => setIsDiagnosticOpen(true)}
                className="w-full mt-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 rounded text-emerald-300 text-[10px] font-bold flex items-center justify-center space-x-1"
              >
                <span>{lang === 'ar' ? 'معايرة دقة عمق هذا الهدف' : 'Calibrate Target Depth'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Diagnostic Notification Toast */}
        {diagnosticNotification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-emerald-950/90 border border-emerald-500 px-4 py-2 rounded-lg text-emerald-300 text-xs font-mono shadow-2xl flex items-center space-x-2">
            <span>&bull;</span>
            <span>{diagnosticNotification}</span>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-900/95 border border-emerald-500 px-6 py-3 rounded-xl shadow-2xl text-emerald-400 text-xs font-bold flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>
              {lang === 'ar'
                ? 'جاري تطبيق الفلاتر وإعادة حساب التشكيل ثلاثي الأبعاد...'
                : 'Applying filters & recomputing 3D volume...'}
            </span>
          </div>
        )}

        {/* Circular Bottom Toolbar */}
        <BottomToolbar
          currentMode={currentMode}
          onChangeMode={handleModeChange}
          soilOpacity={soilOpacity}
          onChangeSoilOpacity={setSoilOpacity}
          threshold={threshold}
          onChangeThreshold={setThreshold}
          sliceX={sliceX}
          onChangeSliceX={setSliceX}
          sliceY={sliceY}
          onChangeSliceY={setSliceY}
          sliceZ={sliceZ}
          onChangeSliceZ={setSliceZ}
          showIsosurface={showIsosurface}
          onToggleIsosurface={() => setShowIsosurface(!showIsosurface)}
          showSlices={showSlices}
          onToggleSlices={() => setShowSlices(!showSlices)}
          onChangeCameraPreset={setCameraPreset}
          onOpenDiagnostic={() => setIsDiagnosticOpen(true)}
          lang={lang}
        />
      </main>

      {/* Filter Pipeline Modal */}
      <FilterPipelineModal
        isOpen={currentMode === 'filters'}
        onClose={() => setCurrentMode('volume')}
        filters={dataset.filters}
        onApplyFilters={handleApplyFilters}
        lang={lang}
      />

      {/* Anomaly Inspector Modal */}
      <AnomalyInspectorModal
        isOpen={currentMode === 'anomalies'}
        onClose={() => setCurrentMode('volume')}
        anomalies={dataset.anomalies}
        selectedAnomalyId={selectedAnomaly?.id || null}
        onSelectAnomaly={setSelectedAnomaly}
        onAddAnomaly={handleAddAnomaly}
        onDeleteAnomaly={handleDeleteAnomaly}
        lang={lang}
      />

      {/* Import / Export & File Manager Modal */}
      <ImportExportModal
        isOpen={currentMode === 'settings'}
        onClose={() => setCurrentMode('volume')}
        dataset={dataset}
        onLoadDataset={(newD) => {
          setDataset(newD);
          setCurrentMode('volume');
        }}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        lang={lang}
      />

      {/* Soil Permittivity Calibration & Depth Accuracy Diagnostic Modal */}
      <PermittivityDiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        dataset={dataset}
        onApplyCalibration={handleApplyCalibration}
        lang={lang}
      />

      {/* Standalone App Download & Installation Modal */}
      <AppDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        dataset={dataset}
        lang={lang}
      />
    </div>
  );
}
