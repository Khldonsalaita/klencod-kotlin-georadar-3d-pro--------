/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { GprSurveyDataset } from '../types/gpr';
import {
  createReferenceDataset,
  createArchaeologicalDataset,
  createCivilEngineeringDataset,
  parseGprFile,
  exportToObjPointCloud,
  exportInterpretationCsv,
} from '../utils/gprParsers';
import { FolderOpen, Download, Upload, FileText, CheckCircle2, Box, Layers, AlertCircle, X } from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: GprSurveyDataset;
  onLoadDataset: (newDataset: GprSurveyDataset) => void;
  onOpenDownloadModal?: () => void;
  lang: 'ar' | 'en';
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onLoadDataset,
  onOpenDownloadModal,
  lang,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const parsed = await parseGprFile(file);
      onLoadDataset(parsed);
      setSuccessMsg(
        lang === 'ar'
          ? `تم تحميل ومعالجة الملف بنجاح: ${file.name}`
          : `Successfully loaded and processed: ${file.name}`
      );
    } catch (err: any) {
      setErrorMsg(
        lang === 'ar'
          ? `فشل قراءة الملف: ${err.message || 'تنسيق غير مدعوم'}`
          : `Failed to load file: ${err.message || 'Unsupported format'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadObj = () => {
    const objContent = exportToObjPointCloud(dataset, 450);
    const blob = new Blob([objContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GPR_3D_PointCloud_${Date.now()}.obj`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const csvContent = exportInterpretationCsv(dataset);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GPR_Interpretation_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-none p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0c1017] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <FolderOpen className="text-emerald-400" size={20} />
            <h2 className="text-sm font-bold text-slate-100">
              {lang === 'ar'
                ? 'إدارة الملفات والنماذج والتصدير (GPR File & Export Manager)'
                : 'GPR File & Export Manager (.gpr / .dzt / .dt1 / .csv)'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-lg text-rose-300 flex items-center space-x-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick App Download Banner */}
          {onOpenDownloadModal && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/50 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-emerald-300 text-xs flex items-center">
                  <Download size={15} className="mr-1.5" />
                  {lang === 'ar' ? 'تحميل البرنامج وتثبيته على جهازك' : 'Download & Install App to Device'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {lang === 'ar'
                    ? 'تثبيت كتطبيق سطح مكتب أو تحميل حزمة مستقلة للتشغيل دون إنترنت'
                    : 'Install as desktop PWA or download standalone offline runner'}
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenDownloadModal();
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md transition"
              >
                {lang === 'ar' ? 'تحميل الآن' : 'Download'}
              </button>
            </div>
          )}

          {/* 1. Presets */}
          <div>
            <h3 className="font-bold text-slate-200 mb-2 flex items-center">
              <Box size={15} className="mr-1.5 text-amber-400" />
              {lang === 'ar' ? 'المسوحات النموذجية الجاهزة (Survey Presets):' : 'Survey Presets:'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  onLoadDataset(createReferenceDataset());
                  setSuccessMsg(lang === 'ar' ? 'تم تحميل المسح المرجعي (الصورة المرفقة)' : 'Loaded reference image survey');
                }}
                className="p-3 bg-slate-900/60 border border-amber-500/40 hover:border-amber-400 rounded-lg text-start transition"
              >
                <div className="font-bold text-amber-300">
                  {lang === 'ar' ? 'المسح المرجعي للصورة' : 'Reference Image Survey'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {lang === 'ar'
                    ? 'الأنبوب المنحني والغرفة الحجرية (Z: 0-240 سم)'
                    : 'Curved conduit & vault (Z: 0-240 cm)'}
                </div>
              </button>

              <button
                onClick={() => {
                  onLoadDataset(createArchaeologicalDataset());
                  setSuccessMsg(lang === 'ar' ? 'تم تحميل مسح الآثار الرومانية' : 'Loaded Roman ruins survey');
                }}
                className="p-3 bg-slate-900/60 border border-slate-700 hover:border-emerald-400 rounded-lg text-start transition"
              >
                <div className="font-bold text-emerald-300">
                  {lang === 'ar' ? 'مسح الآثار والجدران' : 'Archaeological Citadel'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {lang === 'ar' ? 'أسس جدران قديمة وخزان صخري' : 'Ancient stone foundations & cistern'}
                </div>
              </button>

              <button
                onClick={() => {
                  onLoadDataset(createCivilEngineeringDataset());
                  setSuccessMsg(lang === 'ar' ? 'تم تحميل فحص البنية التحتية' : 'Loaded civil structure scan');
                }}
                className="p-3 bg-slate-900/60 border border-slate-700 hover:border-cyan-400 rounded-lg text-start transition"
              >
                <div className="font-bold text-cyan-300">
                  {lang === 'ar' ? 'فحص الجسور والخرسانة' : 'Civil Infrastructure'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {lang === 'ar' ? 'شبكة تسليح وفراغات تفكك' : 'Rebar grid & voids (900 MHz)'}
                </div>
              </button>
            </div>
          </div>

          {/* 2. File Upload */}
          <div className="p-4 bg-slate-900/40 border border-dashed border-slate-700 rounded-lg text-center">
            <Upload size={28} className="mx-auto text-emerald-400 mb-2 opacity-80" />
            <h4 className="font-bold text-slate-200">
              {lang === 'ar' ? 'استيراد ملف رادار حقيقي (.gpr, .dzt, .dt1, .sgy, .csv)' : 'Import Radar File (.gpr, .dzt, .dt1, .sgy, .csv)'}
            </h4>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto my-1.5">
              {lang === 'ar'
                ? 'يدعم النظام ملفات أجهزة GSSI RADAN، وSensors & Software EKKO، وملفات الجيوفيزياء SEG-Y وملفات المصفوفات الرقمية CSV.'
                : 'Supports GSSI RADAN (.dzt), Sensors & Software (.dt1), SEG-Y, and raw numerical CSV matrices.'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".gpr,.dzt,.dt1,.sgy,.segy,.csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="mt-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow"
            >
              {loading
                ? lang === 'ar' ? 'جاري التحليل...' : 'Parsing...'
                : lang === 'ar' ? 'اختر ملف من جهازك' : 'Choose Local File'}
            </button>
          </div>

          {/* 3. Export Suite */}
          <div>
            <h3 className="font-bold text-slate-200 mb-2 flex items-center">
              <Download size={15} className="mr-1.5 text-cyan-400" />
              {lang === 'ar' ? 'تصدير البيانات والمخرجات ثلاثية الأبعاد:' : 'Export Data & 3D Deliverables:'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleDownloadObj}
                className="p-3 bg-slate-900/60 border border-slate-700 hover:border-cyan-400 rounded-lg flex items-center justify-between text-start transition"
              >
                <div>
                  <div className="font-bold text-cyan-300">
                    {lang === 'ar' ? 'تصدير سحابة نقاط ثلاثية الأبعاد (Wavefront .OBJ)' : 'Export 3D Point Cloud (.OBJ)'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'متوافق مع برامج CAD وGIS وBlender' : 'Compatible with CAD, GIS & Blender'}
                  </div>
                </div>
                <Download size={16} className="text-cyan-400" />
              </button>

              <button
                onClick={handleDownloadCsv}
                className="p-3 bg-slate-900/60 border border-slate-700 hover:border-emerald-400 rounded-lg flex items-center justify-between text-start transition"
              >
                <div>
                  <div className="font-bold text-emerald-300">
                    {lang === 'ar' ? 'تقرير وتفسير الشواذ (Interpretation .CSV)' : 'Interpretation Report (.CSV)'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'إحداثيات، سعة، عمق وتصنيف المواد' : 'Coordinates, amplitudes & classifications'}
                  </div>
                </div>
                <FileText size={16} className="text-emerald-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
