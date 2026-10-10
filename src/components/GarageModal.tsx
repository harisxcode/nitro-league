import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { X, Check, Flame, Palette, Shield } from 'lucide-react';
import { CarCustomization, CarBodyType } from '../game/types';

interface GarageModalProps {
  customization: CarCustomization;
  onChange: (custom: CarCustomization) => void;
  onClose: () => void;
}

const CAR_BODIES: { id: CarBodyType; name: string; desc: string }[] = [
  { id: 'octane', name: 'Octane', desc: 'All-round curved powerhouse with high aerial hitbox' },
  { id: 'dominus', name: 'Dominus', desc: 'Flat elongated muscle car built for powerful ground flicks' },
  { id: 'fennec', name: 'Fennec', desc: 'Compact rally hatchback with razor-sharp corner control' },
];

const PAINT_COLORS = [
  { name: 'Sapphire Blue', hex: '#0284c7' },
  { name: 'Cobalt Cyan', hex: '#06b6d4' },
  { name: 'Inferno Orange', hex: '#f97316' },
  { name: 'Crimson Red', hex: '#ef4444' },
  { name: 'Deep Violet', hex: '#7c3aed' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Titanium White', hex: '#e2e8f0' },
  { name: 'Obsidian Black', hex: '#18181b' },
];

const BOOST_COLORS = [
  { name: 'Plasma Cyan', hex: '#00f0ff' },
  { name: 'Rocket Fire', hex: '#ff6600' },
  { name: 'Ultraviolet', hex: '#a855f7' },
  { name: 'Toxic Lime', hex: '#84cc16' },
  { name: 'Hot Magenta', hex: '#ec4899' },
  { name: 'Gold Spark', hex: '#eab308' },
];

export const GarageModal: React.FC<GarageModalProps> = ({ customization, onChange, onClose }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; carGroup: THREE.Group } | null>(null);

  // 3D Car Rotating Preview inside Garage
  useEffect(() => {
    if (!previewRef.current) return;

    const width = previewRef.current.clientWidth;
    const height = previewRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.5, 3.2, 5.5);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    previewRef.current.innerHTML = '';
    previewRef.current.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x00f0ff, 3, 20);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    // Pedestal floor
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.5, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
    );
    floor.position.y = -0.1;
    scene.add(floor);

    const carGroup = new THREE.Group();
    scene.add(carGroup);

    sceneRef.current = { scene, camera, renderer, carGroup };

    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      carGroup.rotation.y += 0.012;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      renderer.dispose();
    };
  }, []);

  // Update 3D preview model when customization changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const { carGroup } = sceneRef.current;
    carGroup.clear();

    const primaryMat = new THREE.MeshStandardMaterial({
      color: customization.color,
      metalness: 0.85,
      roughness: 0.25,
    });
    const secondaryMat = new THREE.MeshStandardMaterial({
      color: customization.accentColor || 0x18181b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.95,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
    });

    if (customization.body === 'dominus') {
      const lower = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 4.4), primaryMat);
      lower.position.y = 0.5;
      carGroup.add(lower);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.45, 2.0), glassMat);
      cabin.position.set(0, 0.9, -0.2);
      carGroup.add(cabin);
    } else if (customization.body === 'fennec') {
      const lower = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.65, 3.8), primaryMat);
      lower.position.y = 0.55;
      carGroup.add(lower);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.2), glassMat);
      cabin.position.set(0, 1.05, -0.1);
      carGroup.add(cabin);
    } else {
      const lower = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 3.8), primaryMat);
      lower.position.y = 0.55;
      carGroup.add(lower);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.65, 1.6), glassMat);
      cabin.position.set(0, 1.1, 0.1);
      carGroup.add(cabin);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.15, 0.6), secondaryMat);
      wing.position.set(0, 1.4, -1.6);
      carGroup.add(wing);
    }

    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.7 });
    const wheelPositions = [
      [-1.15, 0.55, 1.3],
      [1.15, 0.55, 1.3],
      [-1.18, 0.6, -1.3],
      [1.18, 0.6, -1.3],
    ];
    wheelPositions.forEach(([x, y, z]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 16), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      carGroup.add(w);
    });
  }, [customization]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 3D Car Rotating Stage */}
        <div className="w-full md:w-1/2 h-64 md:h-full relative bg-slate-950">
          <div ref={previewRef} className="w-full h-full" />
          <div className="absolute bottom-4 left-4 z-10 px-3 py-1 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-xs font-mono text-cyan-400">
            3D SHOWROOM PREVIEW
          </div>
        </div>

        {/* Customization Options */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto bg-slate-900/90">
          <div className="space-y-6">
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-cyan-400 mb-1">Vehicle Customization</div>
              <h2 className="text-2xl font-bold font-display tracking-tight text-white">THE GARAGE</h2>
            </div>

            {/* Car Chassis Selector */}
            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Battle-Car Chassis</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CAR_BODIES.map((body) => {
                  const active = customization.body === body.id;
                  return (
                    <button
                      key={body.id}
                      onClick={() => onChange({ ...customization, body: body.id })}
                      className={`p-3 text-left rounded-lg border transition-all cursor-pointer ${
                        active
                          ? 'border-cyan-400 bg-cyan-950/40 text-white shadow-md'
                          : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-sm">{body.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">{body.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Paint Swatches */}
            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-orange-400" />
                <span>Primary Metallic Paint</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {PAINT_COLORS.map((col) => {
                  const active = customization.color === col.hex;
                  return (
                    <button
                      key={col.hex}
                      onClick={() => onChange({ ...customization, color: col.hex })}
                      title={col.name}
                      style={{ backgroundColor: col.hex }}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md ${
                        active ? 'ring-2 ring-white scale-105' : 'border border-white/20'
                      }`}
                    >
                      {active && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rocket Boost Trail Color */}
            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-yellow-400" />
                <span>Rocket Booster Flame</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {BOOST_COLORS.map((bst) => {
                  const active = customization.boostColor === bst.hex;
                  return (
                    <button
                      key={bst.hex}
                      onClick={() => onChange({ ...customization, boostColor: bst.hex })}
                      title={bst.name}
                      style={{ backgroundColor: bst.hex }}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md ${
                        active ? 'ring-2 ring-white scale-105' : 'border border-white/20'
                      }`}
                    >
                      {active && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-lg font-bold text-sm tracking-wide uppercase bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-lg cursor-pointer"
            >
              Confirm Loadout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
