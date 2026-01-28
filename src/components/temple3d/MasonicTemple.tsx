import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Suspense, useState } from 'react';
import { Floor } from './Floor';
import { Pillars } from './Pillars';
import { Altar } from './Altar';
import { Thrones } from './Thrones';
import { CelestialVault } from './CelestialVault';
import { Walls } from './Walls';
import { Lights } from './Lights';
import { Benches } from './Benches';
import { InfoPanel } from './InfoPanel';
import { RopeOfNodes } from './RopeOfNodes';
import { ZodiacColumns } from './ZodiacColumns';
import { AltarOfOaths } from './AltarOfOaths';
import { SeaOfBronze } from './SeaOfBronze';
import { GradePanel } from './GradePanel';
import { OfficerDesks } from './OfficerDesks';

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
        camera={{ position: [0, 8, 20], fov: 55 }}
        shadows
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          {/* Light blue/white background - sky effect */}
          <color attach="background" args={['#e8f4fc']} />

          {/* Lighting - Bright and warm */}
          <ambientLight intensity={0.6} />
          <hemisphereLight intensity={0.5} groundColor="#f5f5f5" color="#ffffff" />
          <directionalLight
            position={[0, 15, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight position={[-8, 12, 0]} intensity={0.5} />
          <directionalLight position={[8, 12, 0]} intensity={0.5} />
          <directionalLight position={[0, 10, 10]} intensity={0.4} />
          <pointLight position={[0, 9, -12]} intensity={1} color="#fffacd" />

          {/* Temple Elements */}
          <Floor onClick={() => handleElementClick('floor')} />
          <Pillars onClick={handleElementClick} />
          <Altar onClick={() => handleElementClick('altar')} />
          <AltarOfOaths onClick={() => handleElementClick('altar-juramentos')} />
          <Thrones onClick={handleElementClick} />
          <Benches onClick={handleElementClick} />
          <OfficerDesks onClick={handleElementClick} />
          <CelestialVault />
          <Walls />
          <Lights onClick={handleElementClick} />
          <RopeOfNodes onClick={() => handleElementClick('rope-81')} />
          <ZodiacColumns onClick={handleElementClick} />
          <SeaOfBronze onClick={() => handleElementClick('sea-bronze')} />
          <GradePanel onClick={() => handleElementClick('grade-panel')} />

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={4}
            maxDistance={35}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 2, 0]}
          />

          {/* Environment for reflections */}
          <Environment preset="apartment" />
        </Suspense>
      </Canvas>

      {/* Info Panel */}
      <InfoPanel 
        selectedElement={selectedElement} 
        onClose={() => setSelectedElement(null)} 
      />

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs text-muted-foreground max-w-xs shadow-lg">
        <p className="font-medium text-foreground mb-1">Templo REAA - Navegação:</p>
        <p>• Arraste para girar a câmera</p>
        <p>• Scroll para zoom</p>
        <p>• Clique nos elementos para informações</p>
        <p className="mt-1 text-primary">81 Nós • 12 Colunas Zodiacais</p>
      </div>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 text-foreground hover:bg-background transition-colors shadow-lg"
        >
          ✕ Fechar
        </button>
      )}
    </div>
  );
}
