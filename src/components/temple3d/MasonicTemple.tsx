import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Suspense, useState } from 'react';
import * as THREE from 'three';
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
import { WorkingTools } from './WorkingTools';
import { StainedGlassWindows } from './StainedGlassWindows';
import { AmbientSoundPanel } from './AmbientSoundPanel';

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
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <Suspense fallback={null}>
          {/* Deep blue/dark background for atmosphere */}
          <color attach="background" args={['#1a2a4a']} />
          
          {/* Atmospheric fog for depth */}
          <fog attach="fog" args={['#1a2a4a', 25, 50]} />

          {/* Lighting - Warm and dramatic */}
          <ambientLight intensity={0.3} color="#ffeedd" />
          <hemisphereLight intensity={0.4} groundColor="#2a1810" color="#87CEEB" />
          
          {/* Main overhead light */}
          <directionalLight
            position={[0, 15, 5]}
            intensity={1.0}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-far={50}
            shadow-camera-left={-15}
            shadow-camera-right={15}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
            color="#fff8e7"
          />
          
          {/* Side fill lights - warm */}
          <directionalLight position={[-8, 12, 0]} intensity={0.3} color="#ffd4a0" />
          <directionalLight position={[8, 12, 0]} intensity={0.3} color="#ffd4a0" />
          
          {/* East wall accent light (golden from Delta) */}
          <spotLight 
            position={[0, 9, -12]} 
            intensity={2} 
            color="#ffd700" 
            angle={0.5}
            penumbra={0.8}
            distance={20}
            castShadow
          />
          
          {/* Subtle rim light from entrance */}
          <directionalLight position={[0, 6, 15]} intensity={0.2} color="#aaccff" />

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
          <WorkingTools onClick={handleElementClick} />
          <StainedGlassWindows />

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={4}
            maxDistance={35}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 2, 0]}
            enableDamping={true}
            dampingFactor={0.05}
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
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs text-muted-foreground max-w-xs shadow-lg border border-primary/20">
        <p className="font-medium text-foreground mb-1">🏛️ Templo REAA - Navegação:</p>
        <p>• Arraste para girar a câmera</p>
        <p>• Scroll para zoom</p>
        <p>• Clique nos elementos para informações</p>
        <p className="mt-1 text-primary">81 Nós • 12 Colunas Zodiacais • Ferramentas de Trabalho</p>
      </div>

      {/* Ambient Sound Panel */}
      <AmbientSoundPanel />

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 text-foreground hover:bg-background transition-colors shadow-lg border border-primary/20"
        >
          ✕ Fechar
        </button>
      )}
    </div>
  );
}
