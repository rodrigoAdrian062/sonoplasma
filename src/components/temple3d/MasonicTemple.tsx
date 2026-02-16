import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, N8AO } from '@react-three/postprocessing';
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
        camera={{ position: [0, 8, 20], fov: 50 }}
        shadows="soft"
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.95,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          {/* Deep atmospheric background */}
          <color attach="background" args={['#0d1520']} />
          
          {/* Atmospheric fog - closer for more depth */}
          <fog attach="fog" args={['#0d1520', 20, 45]} />

          {/* === REALISTIC LIGHTING SETUP === */}
          
          {/* Very dim ambient for deep shadows */}
          <ambientLight intensity={0.15} color="#ffeedd" />
          
          {/* Sky hemisphere - warm ground, cool sky */}
          <hemisphereLight intensity={0.25} groundColor="#3a2515" color="#4a6a8a" />
          
          {/* Main key light - warm overhead sun through skylight */}
          <directionalLight
            position={[2, 18, -5]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[4096, 4096]}
            shadow-camera-far={60}
            shadow-camera-left={-18}
            shadow-camera-right={18}
            shadow-camera-top={22}
            shadow-camera-bottom={-22}
            shadow-bias={-0.0001}
            shadow-normalBias={0.02}
            color="#fff5e0"
          />
          
          {/* Fill light from south - very subtle */}
          <directionalLight position={[10, 8, 0]} intensity={0.12} color="#ffd4a0" />
          
          {/* Fill light from north */}
          <directionalLight position={[-10, 8, 0]} intensity={0.12} color="#d4d4ff" />
          
          {/* East wall golden accent - Delta glow */}
          <spotLight 
            position={[0, 10, -13]} 
            intensity={3}
            color="#ffd700" 
            angle={0.4}
            penumbra={1}
            distance={25}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          
          {/* Entrance backlight - moonlight feel */}
          <spotLight 
            position={[0, 7, 16]} 
            intensity={0.5}
            color="#8899cc"
            angle={0.6}
            penumbra={0.9}
            distance={20}
          />

          {/* Contact shadows for ground realism */}
          <ContactShadows 
            position={[0, 0.01, 0]}
            opacity={0.4}
            scale={40}
            blur={2}
            far={10}
            color="#000000"
          />

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
            minDistance={3}
            maxDistance={35}
            maxPolarAngle={Math.PI / 2.05}
            target={[0, 2, 0]}
            enableDamping={true}
            dampingFactor={0.05}
          />

          {/* HDR Environment for realistic reflections */}
          <Environment preset="apartment" environmentIntensity={0.3} />

          {/* === POST-PROCESSING === */}
          <EffectComposer>
            {/* Ambient Occlusion - depth and realism in corners */}
            <N8AO 
              aoRadius={0.8}
              intensity={2.5}
              distanceFalloff={1}
              quality="medium"
            />
            {/* Bloom - candle glow, gold shimmer, Delta radiance */}
            <Bloom 
              luminanceThreshold={0.8}
              luminanceSmoothing={0.5}
              intensity={0.4}
              mipmapBlur
            />
            {/* Vignette - cinematic framing */}
            <Vignette 
              offset={0.3}
              darkness={0.6}
            />
          </EffectComposer>
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
