/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ColormapType, GprAnomaly, GprSurveyDataset } from '../types/gpr';
import { sampleColormap } from '../utils/colormaps';

interface Gpr3DViewerProps {
  dataset: GprSurveyDataset;
  colormap: ColormapType;
  threshold: number; // 0 to 1
  selectedAnomalyId: string | null;
  onSelectAnomaly: (anomaly: GprAnomaly | null) => void;
  showVolume: boolean;
  showIsosurface: boolean;
  showSlices: boolean;
  showTags: boolean;
  showGrid: boolean;
  sliceX: number; // 0 to 100%
  sliceY: number; // 0 to 100%
  sliceZ: number; // 0 to 100%
  soilOpacity: number;
  cameraPreset?: 'iso' | 'top' | 'front' | 'side';
}

export const Gpr3DViewer: React.FC<Gpr3DViewerProps> = ({
  dataset,
  colormap,
  threshold,
  selectedAnomalyId,
  onSelectAnomaly,
  showVolume,
  showIsosurface,
  showSlices,
  showTags,
  showGrid,
  sliceX,
  sliceY,
  sliceZ,
  soilOpacity,
  cameraPreset,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const contentGroupRef = useRef<THREE.Group | null>(null);
  const tagsOverlayRef = useRef<HTMLDivElement>(null);

  // Screen positions for 3D tags
  const [projectedTags, setProjectedTags] = useState<
    { id: string; anomaly: GprAnomaly; screenX: number; screenY: number; visible: boolean }[]
  >([]);

  // Bounding box dimensions in 3D world units (normalized to realistic aspect ratio)
  // Max X: 270, Max Y: 250, Max Z: 240
  const boxWidth = 5.4; // X
  const boxLength = 5.0; // Y
  const boxDepth = 4.8; // Z

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080d);
    scene.fog = new THREE.FogExp2(0x06080d, 0.025);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      100
    );
    // Position camera for an isometric perspective matching the screenshot
    camera.position.set(-6.5, 7.5, 8.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Environment map for reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Studio lighting rig
    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.2);
    keyLight.position.set(8, 12, 10);
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x446688, 0x111622, 1.4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x00d2ff, 1.2);
    rimLight.position.set(-8, -6, -8);
    scene.add(rimLight);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.target.set(0, -boxDepth * 0.45, 0);
    controls.maxDistance = 25;
    controls.minDistance = 2;
    controlsRef.current = controls;

    // Root group for dynamic content
    const contentGroup = new THREE.Group();
    scene.add(contentGroup);
    contentGroupRef.current = contentGroup;

    // Animation & render loop
    let animId = 0;
    const renderScene = () => {
      controls.update();

      // Project 3D tags to screen space
      if (tagsOverlayRef.current && camera && container) {
        const widthHalf = container.clientWidth / 2;
        const heightHalf = container.clientHeight / 2;
        const tempVec = new THREE.Vector3();

        const updated = dataset.anomalies.map((anom) => {
          // Convert dataset coords (X: 0..270, Y: 0..250, Z: 0..240) to 3D world units
          const worldX = (anom.x / 270 - 0.5) * boxWidth;
          const worldZ = (anom.y / 250 - 0.5) * boxLength;
          const worldY = -(anom.z / 240) * boxDepth;

          tempVec.set(worldX, worldY, worldZ);
          tempVec.project(camera);

          const isBehind = tempVec.z > 1;
          const screenX = tempVec.x * widthHalf + widthHalf;
          const screenY = -(tempVec.y * heightHalf) + heightHalf;

          return {
            id: anom.id,
            anomaly: anom,
            screenX,
            screenY,
            visible: !isBehind,
          };
        });

        setProjectedTags(updated);
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(renderScene);
    };

    animId = requestAnimationFrame(renderScene);

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [dataset]);

  // Handle camera presets
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || !cameraPreset) return;

    if (cameraPreset === 'iso') {
      camera.position.set(-6.5, 7.5, 8.5);
      controls.target.set(0, -boxDepth * 0.45, 0);
    } else if (cameraPreset === 'top') {
      camera.position.set(0, 11, 0.001);
      controls.target.set(0, -boxDepth * 0.45, 0);
    } else if (cameraPreset === 'front') {
      camera.position.set(0, -boxDepth * 0.4, 10);
      controls.target.set(0, -boxDepth * 0.45, 0);
    } else if (cameraPreset === 'side') {
      camera.position.set(10, -boxDepth * 0.4, 0);
      controls.target.set(0, -boxDepth * 0.45, 0);
    }
    controls.update();
  }, [cameraPreset, boxDepth]);

  // Build the 3D scene geometry matching the user's reference image
  useEffect(() => {
    const group = contentGroupRef.current;
    if (!group) return;

    // Clear previous geometries
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    }

    const hw = boxWidth / 2;
    const hl = boxLength / 2;
    const d = boxDepth;

    // =========================================================================
    // 1. 3D Bounding Box Wireframe & Depth Grid
    // =========================================================================
    if (showGrid) {
      // Main bounding box frame
      const boxEdges = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(boxWidth, boxDepth, boxLength)
      );
      const boxLineMat = new THREE.LineBasicMaterial({
        color: 0x5a7550,
        transparent: true,
        opacity: 0.85,
        linewidth: 1.5,
      });
      const boxLine = new THREE.LineSegments(boxEdges, boxLineMat);
      boxLine.position.set(0, -d / 2, 0);
      group.add(boxLine);

      // Depth level contour lines (Z depth ticks: 50, 100, 150, 200, 240 cm)
      const depthLevels = [50, 100, 150, 200, 240];
      const gridMat = new THREE.LineBasicMaterial({
        color: 0x4a6540,
        transparent: true,
        opacity: 0.35,
      });

      depthLevels.forEach((levelCm) => {
        const yPos = -(levelCm / 240) * d;
        const planeGeo = new THREE.BufferGeometry();
        // Ring around the perimeter of the box at depth yPos
        const pts = [
          new THREE.Vector3(-hw, yPos, -hl),
          new THREE.Vector3(hw, yPos, -hl),
          new THREE.Vector3(hw, yPos, hl),
          new THREE.Vector3(-hw, yPos, hl),
          new THREE.Vector3(-hw, yPos, -hl),
        ];
        planeGeo.setFromPoints(pts);
        const ring = new THREE.Line(planeGeo, gridMat);
        group.add(ring);
      });

      // Lateral vertical lines along axes
      const latTicks = [0.2, 0.4, 0.6, 0.8];
      latTicks.forEach((t) => {
        const xPos = (t - 0.5) * boxWidth;
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(xPos, 0, -hl),
          new THREE.Vector3(xPos, -d, -hl),
        ]);
        group.add(new THREE.Line(lineGeo, gridMat));
      });
    }

    // =========================================================================
    // 2. Green Ground Surface Layer (Top of Box: Z = 0)
    // =========================================================================
    const topPlaneGeo = new THREE.PlaneGeometry(boxWidth, boxLength);
    const topPlaneMat = new THREE.MeshStandardMaterial({
      color: 0x3cb043,
      emissive: 0x1f5c22,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });
    const topPlane = new THREE.Mesh(topPlaneGeo, topPlaneMat);
    topPlane.rotation.x = Math.PI / 2;
    topPlane.position.set(0, 0, 0);
    group.add(topPlane);

    // =========================================================================
    // 3. Subsurface Golden / Amber Volumetric Matrix (as shown in screenshot)
    // =========================================================================
    if (showVolume) {
      const soilBoxGeo = new THREE.BoxGeometry(boxWidth * 0.995, boxDepth * 0.995, boxLength * 0.995);
      const soilBoxMat = new THREE.MeshPhysicalMaterial({
        color: 0x9c7a14, // amber / golden soil hue
        roughness: 0.3,
        metalness: 0.05,
        transparent: true,
        opacity: Math.max(0.04, soilOpacity),
        depthWrite: false,
        side: THREE.BackSide,
      });
      const soilBox = new THREE.Mesh(soilBoxGeo, soilBoxMat);
      soilBox.position.set(0, -d / 2, 0);
      group.add(soilBox);
    }

    // =========================================================================
    // 4. 3D Isosurface & Buried Target Anomalies (Curved Conduit + Vault Box)
    // =========================================================================
    if (showIsosurface) {
      // Create high-resolution curved tube geometry for the anomaly
      // Center spline curve points matching screenshot:
      // Starts near top (X: 185, Y: 45, Z: 50 cm) -> curves down to (X: 125, Y: 175, Z: 135 cm)
      const curvePoints = [
        new THREE.Vector3((185 / 270 - 0.5) * boxWidth, -(48 / 240) * d, (45 / 250 - 0.5) * boxLength),
        new THREE.Vector3((175 / 270 - 0.5) * boxWidth, -(65 / 240) * d, (75 / 250 - 0.5) * boxLength),
        new THREE.Vector3((160 / 270 - 0.5) * boxWidth, -(78 / 240) * d, (100 / 250 - 0.5) * boxLength),
        new THREE.Vector3((148 / 270 - 0.5) * boxWidth, -(92 / 240) * d, (125 / 250 - 0.5) * boxLength),
        new THREE.Vector3((140 / 270 - 0.5) * boxWidth, -(105 / 240) * d, (145 / 250 - 0.5) * boxLength),
        new THREE.Vector3((135 / 270 - 0.5) * boxWidth, -(118 / 240) * d, (165 / 250 - 0.5) * boxLength),
        new THREE.Vector3((130 / 270 - 0.5) * boxWidth, -(135 / 240) * d, (180 / 250 - 0.5) * boxLength),
      ];

      const splineCurve = new THREE.CatmullRomCurve3(curvePoints);
      const tubeSegments = 64;
      const tubeRadius = 0.22;
      const tubeGeo = new THREE.TubeGeometry(splineCurve, tubeSegments, tubeRadius, 24, false);

      // Vertex color gradient mapping along the tube matching the screenshot
      // Top is high amplitude orange/yellow/red, halo is green/cyan
      const count = tubeGeo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const posAttr = tubeGeo.attributes.position;

      for (let i = 0; i < count; i++) {
        const py = posAttr.getY(i);
        const normY = Math.max(0, Math.min(1, (-py) / d));
        // Energy color mapping: top is warmest (t ~ 0.95), lower is greenish
        const tColor = Math.max(0.1, 1.0 - normY * 0.7);
        const rgb = sampleColormap(colormap, tColor);
        colors[i * 3] = rgb.r;
        colors[i * 3 + 1] = rgb.g;
        colors[i * 3 + 2] = rgb.b;
      }
      tubeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const tubeMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.25,
        metalness: 0.3,
        emissive: new THREE.Color(0xff4500),
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.95,
      });

      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      group.add(tubeMesh);

      // Glowing outer halo for the anomaly (as seen in screenshot with green halo)
      const haloGeo = new THREE.TubeGeometry(splineCurve, tubeSegments, tubeRadius * 1.5, 16, false);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x39ff14, // fluorescent radar halo
        transparent: true,
        opacity: 0.28,
        wireframe: true,
        depthWrite: false,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      group.add(haloMesh);

      // Buried Stone Chamber / Vault (Lower right box at Z: 150-180 cm)
      const chamberW = (50 / 270) * boxWidth;
      const chamberL = (45 / 250) * boxLength;
      const chamberH = (35 / 240) * boxDepth;
      const chamberGeo = new THREE.BoxGeometry(chamberW, chamberH, chamberL);

      const chamberMat = new THREE.MeshStandardMaterial({
        color: 0x7a89cc,
        emissive: 0x3d4880,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.2,
        transparent: true,
        opacity: 0.85,
      });

      const chamberMesh = new THREE.Mesh(chamberGeo, chamberMat);
      chamberMesh.position.set(
        (160 / 270 - 0.5) * boxWidth,
        -((150 + 180) / 2 / 240) * d,
        (200 / 250 - 0.5) * boxLength
      );
      group.add(chamberMesh);

      // Chamber edge highlights
      const chamberEdges = new THREE.EdgesGeometry(chamberGeo);
      const chamberLine = new THREE.LineSegments(
        chamberEdges,
        new THREE.LineBasicMaterial({ color: 0xaec2ff, linewidth: 2 })
      );
      chamberLine.position.copy(chamberMesh.position);
      group.add(chamberLine);
    }

    // =========================================================================
    // 5. Orthogonal Slice Planes (Interactive X, Y, Z cuts)
    // =========================================================================
    if (showSlices) {
      // Z-Slice (Time / Depth slice)
      const zDepthCm = (sliceZ / 100) * 240;
      const zYPos = -(zDepthCm / 240) * d;

      const zSliceGeo = new THREE.PlaneGeometry(boxWidth, boxLength);
      const zSliceMat = new THREE.MeshBasicMaterial({
        color: 0x00d2ff,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const zSliceMesh = new THREE.Mesh(zSliceGeo, zSliceMat);
      zSliceMesh.rotation.x = Math.PI / 2;
      zSliceMesh.position.set(0, zYPos, 0);
      group.add(zSliceMesh);

      // Outline for Z slice
      const zSliceEdges = new THREE.EdgesGeometry(zSliceGeo);
      const zSliceOutline = new THREE.LineSegments(
        zSliceEdges,
        new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 })
      );
      zSliceOutline.rotation.x = Math.PI / 2;
      zSliceOutline.position.set(0, zYPos, 0);
      group.add(zSliceOutline);

      // Y-Slice (Inline cross-section)
      const yDistCm = (sliceY / 100) * 250;
      const yZPos = (yDistCm / 250 - 0.5) * boxLength;

      const ySliceGeo = new THREE.PlaneGeometry(boxWidth, boxDepth);
      const ySliceMat = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ySliceMesh = new THREE.Mesh(ySliceGeo, ySliceMat);
      ySliceMesh.position.set(0, -d / 2, yZPos);
      group.add(ySliceMesh);
    }

    // =========================================================================
    // 6. 3D Axis Labels & Indicator Spheres for Anomalies
    // =========================================================================
    dataset.anomalies.forEach((anom) => {
      const ax = (anom.x / 270 - 0.5) * boxWidth;
      const ay = -(anom.z / 240) * d;
      const az = (anom.y / 250 - 0.5) * boxLength;

      const isSelected = selectedAnomalyId === anom.id;

      // Small 3D sphere marker
      const sphereGeo = new THREE.SphereGeometry(isSelected ? 0.12 : 0.08, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xffffff : anom.amplitude > 0 ? 0xffcc00 : 0x00e5ff,
        emissive: isSelected ? 0xff0055 : anom.amplitude > 0 ? 0xff3300 : 0x0088ff,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(ax, ay, az);
      group.add(sphere);

      // Guide line from anomaly down/up to wall
      const dropLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(ax, ay, az),
        new THREE.Vector3(ax, 0, az),
      ]);
      const dropLine = new THREE.Line(
        dropLineGeo,
        new THREE.LineDashedMaterial({
          color: 0x88aa88,
          dashSize: 0.1,
          gapSize: 0.05,
          transparent: true,
          opacity: 0.4,
        })
      );
      dropLine.computeLineDistances();
      group.add(dropLine);
    });

  }, [
    dataset,
    colormap,
    threshold,
    selectedAnomalyId,
    showVolume,
    showIsosurface,
    showSlices,
    showGrid,
    sliceX,
    sliceY,
    sliceZ,
    soilOpacity,
    boxWidth,
    boxLength,
    boxDepth,
  ]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#05070c]">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Axis Corner Indicators (X, Y, Z) matching the user reference screenshot */}
      <div className="absolute top-8 left-12 pointer-events-none text-emerald-400 font-mono font-bold text-xl flex items-center space-x-2">
        <span className="tracking-widest">Y</span>
        <span className="text-xs text-slate-400 font-normal ml-2">270 250 200 150 100 50</span>
      </div>

      <div className="absolute top-14 right-14 pointer-events-none text-slate-300 font-mono text-xs flex flex-col items-end space-y-10">
        <span>50</span>
        <span>100</span>
        <span>150</span>
        <span>200</span>
        <div className="text-emerald-400 font-mono font-bold text-xl mt-4">
          <span>240</span>
          <span className="block text-right">Z</span>
        </div>
      </div>

      {/* 3D Floating Measurement Tags Overlay (Exact match to screenshot labels) */}
      {showTags && (
        <div ref={tagsOverlayRef} className="absolute inset-0 pointer-events-none">
          {projectedTags
            .filter((t) => t.visible)
            .map((tag) => {
              const isSelected = selectedAnomalyId === tag.id;
              const isPositive = tag.anomaly.amplitude >= 0;
              const formattedAmp = `${isPositive ? '+' : ''}${tag.anomaly.amplitude.toFixed(1)}`;

              return (
                <div
                  key={tag.id}
                  style={{
                    transform: `translate(${tag.screenX}px, ${tag.screenY}px) translate(-50%, -50%)`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAnomaly(tag.anomaly);
                  }}
                  className={`absolute pointer-events-auto cursor-pointer transition-all duration-150 group`}
                >
                  {/* Tag Badge */}
                  <div
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold flex items-center space-x-1 shadow-lg border backdrop-blur-none ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-white scale-110 ring-2 ring-amber-400'
                        : isPositive
                        ? 'bg-slate-900/90 text-amber-300 border-amber-500/40 hover:bg-slate-800'
                        : 'bg-slate-900/90 text-cyan-300 border-cyan-500/40 hover:bg-slate-800'
                    }`}
                  >
                    <span>{formattedAmp}</span>
                    <span className="text-[9px] text-slate-400 ml-1">
                      {typeof tag.anomaly.z === 'number' ? tag.anomaly.z.toFixed(1) : tag.anomaly.z}cm
                      {tag.anomaly.depthErrorCm ? (
                        <span className="text-emerald-400 font-normal">
                          &plusmn;{tag.anomaly.depthErrorCm}
                        </span>
                      ) : null}
                    </span>
                  </div>

                  {/* Target Center Dot */}
                  <div
                    className={`w-2 h-2 mx-auto mt-0.5 rounded-full ${
                      isPositive ? 'bg-amber-400' : 'bg-cyan-400'
                    } ring-2 ring-slate-950`}
                  />
                </div>
              );
            })}
        </div>
      )}

      {/* Mini Viewport Navigation Compass / Coordinates */}
      <div className="absolute bottom-28 left-6 pointer-events-auto bg-slate-900/85 border border-slate-700/60 rounded-lg p-2.5 text-xs text-slate-300 shadow-xl space-y-1 font-mono">
        <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-1 flex items-center justify-between">
          <span>GPR Bounding Box</span>
          <span className="text-slate-400">400 MHz</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 text-[11px]">
          <span>X: 0 - 270 cm</span>
          <span>Y: 0 - 250 cm</span>
          <span>Depth: 0 - 240 cm</span>
          <span>&epsilon;r: {dataset.header.dielectricConstant}</span>
        </div>
      </div>
    </div>
  );
};
