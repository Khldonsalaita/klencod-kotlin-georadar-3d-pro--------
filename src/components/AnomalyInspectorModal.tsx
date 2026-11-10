/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GprAnomaly } from '../types/gpr';
import { Target, Plus, Trash2, X, MapPin, Eye, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AnomalyInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomalies: GprAnomaly[];
  selectedAnomalyId: string | null;
  onSelectAnomaly: (anomaly: GprAnomaly | null) => void;
  onAddAnomaly: (newAnomaly: GprAnomaly) => void;
  onDeleteAnomaly: (id: string) => void;
  lang: 'ar' | 'en';
}

export const AnomalyInspectorModal: React.FC<AnomalyInspectorModalProps> = ({
  isOpen,
  onClose,
  anomalies,
  selectedAnomalyId,
  onSelectAnomaly,
  onAddAnomaly,
  onDeleteAnomaly,
  lang,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<GprAnomaly['type']>('pipe');
  const [newX, setNewX] = useState(150);
  const [newY, setNewY] = useState(120);
  const [newZ, setNewZ] = useState(80);
  const [newAmp, setNewAmp] = useState(2500);
  const [newMat, setNewMat] = useState('Metallic Pipe (أنبوب معدني)');
  const [newNotes, setNewNotes] = useState('');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `anom-${Date.now()}`;
    const anomaly: GprAnomaly = {
      id,
      name: newName || (lang === 'ar' ? 'هدف جديد' : 'New Target'),
      type: newType,
      x: Number(newX),
      y: Number(newY),
      z: Number(newZ),
      amplitude: Number(newAmp),
      polarity: Number(newAmp) >= 0 ? 'positive' : 'negative',
      materialEstimate: newMat,
      confidence: 0.9,
      notes: newNotes,
    };
    onAddAnomaly(anomaly);
    onSelectAnomaly(anomaly);
    setIsAdding(false);
    setNewName('');
    setNewNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-none p-4 select-none">
      <div className="w-full max-w-3xl bg-[#0c1017] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <Target className="text-amber-400" size={20} />
            <h2 className="text-sm font-bold text-slate-100">
              {lang === 'ar'
                ? 'سجل وتصنيف الشواذ والأهداف الرادارية (GPR Targets & Anomalies)'
                : 'GPR Detected Anomalies & Spatial Picks'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {lang === 'ar'
                ? `إجمالي الأهداف المرصودة: ${anomalies.length}`
                : `Total Picked Targets: ${anomalies.length}`}
            </span>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center shadow"
            >
              <Plus size={14} className="mr-1" />
              {lang === 'ar' ? 'إضافة علامة شاذة جديدة' : 'Add New Pick'}
            </button>
          </div>

          {/* Add Form */}
          {isAdding && (
            <form
              onSubmit={handleCreate}
              className="p-4 bg-slate-900/90 border border-emerald-500/40 rounded-lg space-y-3 text-xs"
            >
              <div className="font-bold text-emerald-400">
                {lang === 'ar' ? 'معايير النقطة الرادارية الجديدة' : 'New Radar Point Parameters'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الاسم:' : 'Name:'}</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: قناة مدفونة' : 'e.g. Buried Duct'}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'النوع:' : 'Type:'}</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100"
                  >
                    <option value="pipe">{lang === 'ar' ? 'أنبوب / كابل (Pipe)' : 'Pipe / Cable'}</option>
                    <option value="chamber">{lang === 'ar' ? 'غرفة / سرداب (Chamber)' : 'Chamber'}</option>
                    <option value="void">{lang === 'ar' ? 'فراغ / كهف (Void)' : 'Void / Cavity'}</option>
                    <option value="foundation">{lang === 'ar' ? 'أساس حجري (Foundation)' : 'Stone Foundation'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">X (0 - 270 cm):</label>
                  <input
                    type="number"
                    value={newX}
                    onChange={(e) => setNewX(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Y (0 - 250 cm):</label>
                  <input
                    type="number"
                    value={newY}
                    onChange={(e) => setNewY(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'العمق Z (سم):' : 'Depth Z (cm):'}</label>
                  <input
                    type="number"
                    value={newZ}
                    onChange={(e) => setNewZ(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'السعة (Amplitude):' : 'Amplitude:'}</label>
                  <input
                    type="number"
                    value={newAmp}
                    onChange={(e) => setNewAmp(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {lang === 'ar' ? 'حفظ النقطة' : 'Save Pick'}
                </button>
              </div>
            </form>
          )}

          {/* List of Anomalies */}
          <div className="grid grid-cols-1 gap-2.5">
            {anomalies.map((anom) => {
              const isSelected = selectedAnomalyId === anom.id;
              const isPositive = anom.amplitude >= 0;

              return (
                <div
                  key={anom.id}
                  onClick={() => onSelectAnomaly(anom)}
                  className={`p-3 rounded-lg border transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start space-x-3 rtl:space-x-reverse">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        isPositive ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                      }`}
                    >
                      {anom.z}c
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className="font-bold text-slate-100 text-xs">{anom.name}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                            isPositive ? 'bg-amber-950 text-amber-300' : 'bg-cyan-950 text-cyan-300'
                          }`}
                        >
                          {isPositive ? '+' : ''}{anom.amplitude.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {anom.materialEstimate} &bull; {anom.notes}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 rtl:space-x-reverse self-end sm:self-center font-mono text-[11px]">
                    <div className="text-slate-400">
                      <span>X:{anom.x.toFixed(0)}</span>
                      <span className="mx-1.5">Y:{anom.y.toFixed(0)}</span>
                      <span className="text-emerald-400 font-bold">Z:{anom.z}cm</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAnomaly(anom.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded"
                      title="Delete Anomaly"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
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
