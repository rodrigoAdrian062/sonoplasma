import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Text, Html } from '@react-three/drei';
import { Suspense, useState } from 'react';
import { Floor } from './Floor';
import { Pillars } from './Pillars';
import { Altar } from './Altar';
import { Thrones } from './Thrones';
import { CelestialVault } from './CelestialVault';
import { Walls } from './Walls';
import { Lights } from './Lights';
import { InfoPanel } from './InfoPanel';

interface MasonicTempleProps {
  onClose?: () => void;
}

export function MasonicTemple({ onClose }: MasonicTempleProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const handleElementClick = (elementName: string) => {
    setSelectedElement(elementName === selectedElement ? null : elementName);
  };

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 8, 18], fov: 60 }}
        shadows
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          {/* Background (slightly lifted so the scene isn't "black on black") */}
          <color attach="background" args={['#070a12']} />

          {/* Lighting */}
          <ambientLight intensity={0.55} />
          <hemisphereLight intensity={0.45} groundColor="#080808" color="#ffffff" />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[0, 10, 0]} intensity={1.2} color="#ffd700" />
          {/* Fill light from the West */}
          <directionalLight position={[-10, 12, 8]} intensity={0.55} />

          {/* Temple Elements */}
          <Floor onClick={() => handleElementClick('floor')} />
          <Pillars onClick={handleElementClick} />
          <Altar onClick={() => handleElementClick('altar')} />
          <Thrones onClick={handleElementClick} />
          <CelestialVault />
          <Walls />
          <Lights onClick={handleElementClick} />

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={35}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 2, 0]}
          />

          {/* Environment for reflections */}
          <Environment preset="warehouse" />
        </Suspense>
      </Canvas>

      {/* Info Panel */}
      <InfoPanel 
        selectedElement={selectedElement} 
        onClose={() => setSelectedElement(null)} 
      />

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 text-xs text-muted-foreground max-w-xs">
        <p className="font-medium text-foreground mb-1">Navegação:</p>
        <p>• Arraste para girar</p>
        <p>• Scroll para zoom</p>
        <p>• Clique nos elementos para informações</p>
      </div>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg p-2 text-foreground hover:bg-background transition-colors"
        >
          ✕ Fechar
        </button>
      )}
    </div>
  );
}
