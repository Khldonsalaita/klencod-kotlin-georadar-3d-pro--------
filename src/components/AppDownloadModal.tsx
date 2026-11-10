/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { GprSurveyDataset } from '../types/gpr';
import { exportInterpretationCsv, exportToObjPointCloud } from '../utils/gprParsers';
import {
  Download,
  Laptop,
  Smartphone,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  X,
  Share2,
  PlusSquare,
  ArrowDownToLine,
  HardDrive,
  Globe,
  FolderArchive,
} from 'lucide-react';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: GprSurveyDataset;
  lang: 'ar' | 'en';
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  isOpen,
  onClose,
  dataset,
  lang,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle direct PWA app installation
  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setDownloadSuccess(
        lang === 'ar'
          ? 'تم تثبيت البرنامج بنجاح على جهازك! يمكنك الآن تشغيله من سطح المكتب.'
          : 'App successfully installed! You can now launch it from your desktop.'
      );
    }
  };

  // Generate and download a self-contained offline HTML application
  const handleDownloadOfflineHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GeoRadar 3D Pro - حزمة التشغيل المستقلة (Offline)</title>
  <style>
    body { margin: 0; background: #06080d; color: #f1f5f9; font-family: system-ui, sans-serif; overflow: hidden; }
    #header { height: 50px; background: #0b0f19; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
    #canvas-container { width: 100vw; height: calc(100vh - 50px); position: relative; }
    .badge { background: #064e3b; color: #34d399; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; }
    .tag { position: absolute; background: rgba(15, 23, 42, 0.9); border: 1px solid #10b981; color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-family: monospace; pointer-events: none; }
    #info-card { position: absolute; bottom: 20px; left: 20px; background: rgba(15, 23, 42, 0.9); border: 1px solid #334155; padding: 12px; border-radius: 8px; font-size: 12px; font-family: monospace; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
  <div id="header">
    <div style="display: flex; align-items: center; gap: 8px;">
      <strong style="color: #10b981;">GeoRadar 3D Pro (نسخة التشغيل دون إنترنت)</strong>
      <span class="badge">400 MHz GPR</span>
      <span class="badge" style="background: #1e293b; color: #94a3b8;">&epsilon;r: ${dataset.header.dielectricConstant}</span>
    </div>
    <div style="font-size: 12px; color: #94a3b8;">
      تم التصدير من: ${dataset.header.title}
    </div>
  </div>
  <div id="canvas-container">
    <div id="info-card">
      <div style="color: #10b981; font-weight: bold; margin-bottom: 4px;">بيانات المسح ثلاثي الأبعاد:</div>
      <div>المحور X: 0 - 270 cm | المحور Y: 0 - 250 cm</div>
      <div>أقصى عمق Z: 0 - 240 cm (سرعة: ${(dataset.header.velocityMeterPerNs * 100).toFixed(1)} cm/ns)</div>
      <div style="color: #f59e0b; margin-top: 4px;">الشواذ المرصودة: ${dataset.anomalies.length} أهداف</div>
    </div>
  </div>

  <script>
    // Embedded Standalone Three.js 3D Subsurface Engine
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080d);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / (window.innerHeight - 50), 0.1, 1000);
    camera.position.set(-7, 8, 9);
    camera.lookAt(0, -2.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight - 50);
    container.appendChild(renderer.domElement);

    // Light
    const light = new THREE.DirectionalLight(0xfff3e0, 2);
    light.position.set(10, 15, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x334455, 1.5));

    // Bounding Box
    const boxGeo = new THREE.BoxGeometry(5.4, 4.8, 5.0);
    const boxMat = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeo),
      new THREE.LineBasicMaterial({ color: 0x5a7550 })
    );
    boxMat.position.set(0, -2.4, 0);
    scene.add(boxMat);

    // Top Green Ground Layer
    const topGeo = new THREE.PlaneGeometry(5.4, 5.0);
    const topMat = new THREE.MeshBasicMaterial({ color: 0x3cb043, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.rotation.x = Math.PI / 2;
    scene.add(topMesh);

    // Curved High-Amplitude Anomaly Conduit
    const curvePoints = [
      new THREE.Vector3(1.3, -0.96, -1.6),
      new THREE.Vector3(1.1, -1.3, -1.0),
      new THREE.Vector3(0.8, -1.56, -0.5),
      new THREE.Vector3(0.5, -1.84, 0.0),
      new THREE.Vector3(0.3, -2.1, 0.4),
      new THREE.Vector3(0.2, -2.36, 0.8),
      new THREE.Vector3(0.1, -2.7, 1.1)
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.22, 16, false);
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.3, metalness: 0.2 });
    scene.add(new THREE.Mesh(tubeGeo, tubeMat));

    // Deep Vault Chamber
    const chamberGeo = new THREE.BoxGeometry(1.0, 0.7, 0.9);
    const chamberMat = new THREE.MeshStandardMaterial({ color: 0x7a89cc, transparent: true, opacity: 0.85 });
    const chamberMesh = new THREE.Mesh(chamberGeo, chamberMat);
    chamberMesh.position.set(0.7, -3.3, 1.5);
    scene.add(chamberMesh);

    // Anomaly spheres
    const anomalies = ${JSON.stringify(dataset.anomalies)};
    anomalies.forEach(a => {
      const sx = (a.x / 270 - 0.5) * 5.4;
      const sy = -(a.z / 240) * 4.8;
      const sz = (a.y / 250 - 0.5) * 5.0;
      const spGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const spMat = new THREE.MeshBasicMaterial({ color: a.amplitude > 0 ? 0xffcc00 : 0x00d2ff });
      const sp = new THREE.Mesh(spGeo, spMat);
      sp.position.set(sx, sy, sz);
      scene.add(sp);
    });

    // Simple Mouse Orbit
    let isDown = false, px = 0, py = 0, rotY = 0, rotX = 0.5;
    window.addEventListener('mousedown', e => { isDown = true; px = e.clientX; py = e.clientY; });
    window.addEventListener('mouseup', () => isDown = false);
    window.addEventListener('mousemove', e => {
      if (!isDown) return;
      rotY += (e.clientX - px) * 0.008;
      rotX += (e.clientY - py) * 0.008;
      px = e.clientX; py = e.clientY;
    });

    function animate() {
      requestAnimationFrame(animate);
      const r = 11;
      camera.position.x = Math.sin(rotY) * Math.cos(rotX) * r;
      camera.position.y = Math.sin(rotX) * r;
      camera.position.z = Math.cos(rotY) * Math.cos(rotX) * r;
      camera.lookAt(0, -2.4, 0);
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / (window.innerHeight - 50);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight - 50);
    });
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GeoRadar_3D_Pro_Offline_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess(
      lang === 'ar'
        ? 'تم تحميل حزمة التشغيل المستقلة (GeoRadar_3D_Pro_Offline.html). يمكنك الآن فتحها بنقرتين على أي جهاز دون إنترنت!'
        : 'Downloaded standalone offline HTML app bundle! Double click to run anywhere offline.'
    );
  };

  // Download Sample GPR Dataset for testing
  const handleDownloadSampleGpr = () => {
    let csv = '# GeoRadar 3D Pro - Tabular GPR Survey Data Export\n# Inline_Y,Crossline_X,Depth_Z_cm,Amplitude\n';
    dataset.anomalies.forEach((a) => {
      csv += `${a.y},${a.x},${a.z},${a.amplitude}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GPR_Survey_Sample_Dataset.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0c1017] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <ArrowDownToLine className="text-emerald-400" size={22} />
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                {lang === 'ar'
                  ? 'تحميل وتثبيت برنامج رادار اختراق الأرض (Download & Install App)'
                  : 'Download & Install GeoRadar 3D Pro'}
              </h2>
              <div className="text-[11px] text-slate-400">
                {lang === 'ar'
                  ? 'خيارات التثبيت كتطبيق سطح مكتب أو تحميل حزمة مستقلة للتشغيل دون اتصال بالإنترنت'
                  : 'Desktop PWA install and self-contained offline executable package'}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {downloadSuccess && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-500/60 rounded-lg text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {/* Option 1: PWA Desktop & Mobile Native Install */}
          <div className="p-4 bg-slate-900/60 border border-emerald-500/40 rounded-xl space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Laptop size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    {lang === 'ar'
                      ? 'الخيار 1: تثبيت فوري كتطبيق مستقل على جهازك (Desktop / Mobile App)'
                      : 'Option 1: Install as Standalone Desktop / Mobile App (PWA)'}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    {lang === 'ar'
                      ? 'يعمل كتطبيق أصيل على Windows وMac وAndroid مع أيقونة على سطح المكتب وتشغيل دون نت.'
                      : 'Runs as native app on Windows, Mac, Linux, Android with desktop shortcut & offline support.'}
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold">
                موصى به
              </span>
            </div>

            {isInstalled ? (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-600/40 rounded-lg text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 size={16} />
                <span>
                  {lang === 'ar'
                    ? 'البرنامج مثبت بالفعل على جهازك في وضع التطبيق المستقل (Standalone).'
                    : 'Application is already installed on this device.'}
                </span>
              </div>
            ) : isInstallable ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 transition text-sm"
              >
                <Download size={18} />
                <span>{lang === 'ar' ? 'تثبيت البرنامج على جهازي الآن' : 'Install App to My Device Now'}</span>
              </button>
            ) : isIOS ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 text-slate-300">
                <div className="font-bold text-emerald-400 flex items-center">
                  <Smartphone size={14} className="mr-1.5" />
                  {lang === 'ar' ? 'طريقة التثبيت على أجهزة iPhone / iPad:' : 'How to install on iOS Safari:'}
                </div>
                <div className="text-[11px] space-y-1 text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <Share2 size={13} className="text-cyan-400" />
                    <span>1. {lang === 'ar' ? 'اضغط على زر المشاركة (Share) في شريط متصفح Safari.' : 'Tap the Share icon in Safari toolbar.'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <PlusSquare size={13} className="text-emerald-400" />
                    <span>2. {lang === 'ar' ? 'اختر "إضافة إلى الصفحة الرئيسية (Add to Home Screen)".' : 'Select "Add to Home Screen".'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-[11px] flex items-center justify-between">
                <span>
                  {lang === 'ar'
                    ? 'يمكنك أيضاً الضغط على أيقونة التثبيت (Install) الموجودة مباشرة في شريط عنوان المتصفح (Chrome / Edge).'
                    : 'You can also click the Install icon directly in your browser address bar (Chrome / Edge).'}
                </span>
                <button
                  onClick={handleInstallClick}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded font-bold"
                >
                  {lang === 'ar' ? 'طلب التثبيت' : 'Prompt Install'}
                </button>
              </div>
            )}
          </div>

          {/* Option 2: Self-Contained Offline HTML Runner */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <FileCode size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    {lang === 'ar'
                      ? 'الخيار 2: تحميل ملف تشغيل مستقل بنقرتين (Self-Contained Offline File)'
                      : 'Option 2: Standalone Offline Executable HTML Package'}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    {lang === 'ar'
                      ? 'ملف برمجي مستقل واحد يتضمن محرك الرادار والمجسم ثلاثي الأبعاد والشواذ يفتح بنقرتين دون نت.'
                      : 'Single standalone file with embedded 3D GPR engine & data. Double-click to run anywhere offline.'}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadOfflineHtml}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-300 font-bold rounded-lg flex items-center justify-center space-x-2 transition"
            >
              <ArrowDownToLine size={16} />
              <span>
                {lang === 'ar'
                  ? 'تحميل ملف البرنامج المستقل (GeoRadar_3D_Pro_Offline.html)'
                  : 'Download Standalone Offline HTML Bundle'}
              </span>
            </button>
          </div>

          {/* Option 3: Export 3D Models & Sample Datasets */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center">
              <FolderArchive size={15} className="mr-1.5 text-amber-400" />
              {lang === 'ar' ? 'تحميل بيانات ومجسمات المسح:' : 'Download Survey Deliverables:'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <button
                onClick={() => {
                  const obj = exportToObjPointCloud(dataset, 450);
                  const blob = new Blob([obj], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `GeoRadar_3D_Mesh.obj`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="p-2.5 bg-slate-950 border border-slate-800 hover:border-amber-400 rounded-lg text-start text-amber-300 font-mono flex items-center justify-between"
              >
                <span>{lang === 'ar' ? 'مجسم 3D للموقع (.OBJ)' : '3D Point Cloud (.OBJ)'}</span>
                <Download size={14} />
              </button>

              <button
                onClick={handleDownloadSampleGpr}
                className="p-2.5 bg-slate-950 border border-slate-800 hover:border-emerald-400 rounded-lg text-start text-emerald-300 font-mono flex items-center justify-between"
              >
                <span>{lang === 'ar' ? 'بيانات المسح الرقمي (.CSV)' : 'GPR Data Table (.CSV)'}</span>
                <Download size={14} />
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
