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
  const [showSouthWall, setShowSouthWall] = useState(true);

  const handleElementClick = (elementName: string) => {
    setSelectedElement(elementName === selectedElement ? null : elementName);
  };

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 12, 25], fov: 45 }}
        shadows="soft"
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.8,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          {/* Deep warm background */}
          <color attach="background" args={['#080c14']} />
          
          {/* Volumetric fog for depth */}
          <fog attach="fog" args={['#080c14', 18, 50]} />

          {/* === CINEMATIC LIGHTING === */}
          
          {/* Very subtle ambient - deep shadows */}
          <ambientLight intensity={0.08} color="#ffeedd" />
          
          {/* Warm ground, cool sky hemisphere */}
          <hemisphereLight intensity={0.15} groundColor="#3a2010" color="#1a2a4a" />
          
          {/* Main key light - warm golden, from above East */}
          <directionalLight
            position={[0, 20, -10]}
            intensity={0.6}
            castShadow
            shadow-mapSize={[4096, 4096]}
            shadow-camera-far={60}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={25}
            shadow-camera-bottom={-25}
            shadow-bias={-0.0001}
            shadow-normalBias={0.02}
            color="#fff0d0"
          />
          
          {/* Rim light from south - golden warmth */}
          <directionalLight position={[12, 6, 0]} intensity={0.08} color="#ffd080" />
          
          {/* Cool fill from north */}
          <directionalLight position={[-12, 6, 0]} intensity={0.06} color="#8090c0" />
          
          {/* Delta Luminoso golden glow - dramatic spotlight */}
          <spotLight 
            position={[0, 12, -14]} 
            intensity={4}
            color="#ffd700" 
            angle={0.35}
            penumbra={1}
            distance={30}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />

          {/* Secondary Delta glow - warm wash on east wall */}
          <spotLight 
            position={[0, 8, -12]} 
            intensity={1.5}
            color="#ff9900" 
            angle={0.5}
            penumbra={0.9}
            distance={15}
          />
          
          {/* Entrance moonlight - cool blue backlight */}
          <spotLight 
            position={[0, 8, 18]} 
            intensity={0.4}
            color="#6688bb"
            angle={0.5}
            penumbra={0.95}
            distance={25}
          />

          {/* Floor accent lights along sides */}
          <pointLight position={[-7, 1, 0]} intensity={0.1} color="#ff8855" distance={8} />
          <pointLight position={[7, 1, 0]} intensity={0.1} color="#ff8855" distance={8} />

          {/* Contact shadows */}
          <ContactShadows 
            position={[0, 0.01, 0]}
            opacity={0.5}
            scale={50}
            blur={2.5}
            far={12}
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
          <Walls showSouthWall={showSouthWall} />
          <Lights onClick={handleElementClick} />
          <RopeOfNodes onClick={() => handleElementClick('rope-81')} />
          <ZodiacColumns onClick={handleElementClick} />
          <SeaOfBronze onClick={() => handleElementClick('sea-bronze')} />
          <GradePanel onClick={() => handleElementClick('grade-panel')} />
          <WorkingTools onClick={handleElementClick} />
          {/* StainedGlassWindows removed - walls are plain blue */}

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={40}
            maxPolarAngle={Math.PI / 2.05}
            target={[0, 2, 0]}
            enableDamping={true}
            dampingFactor={0.05}
          />

          {/* HDR Environment for reflections */}
          <Environment preset="apartment" environmentIntensity={0.2} />

          {/* === POST-PROCESSING === */}
          <EffectComposer>
            <N8AO 
              aoRadius={1}
              intensity={3}
              distanceFalloff={1.2}
              quality="medium"
            />
            <Bloom 
              luminanceThreshold={0.7}
              luminanceSmoothing={0.4}
              intensity={0.5}
              mipmapBlur
            />
            <Vignette 
              offset={0.25}
              darkness={0.7}
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
        <p className="mt-1 text-primary">Átrio • Sala dos PP∴PP∴ • 81 Nós • 12 Colunas Zodiacais</p>
      </div>

      {/* Ambient Sound Panel */}
      <AmbientSoundPanel />

      {/* Toggle South Wall button */}
      <button
        onClick={() => setShowSouthWall(prev => !prev)}
        className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-foreground hover:bg-background transition-colors shadow-lg border border-primary/20 flex items-center gap-2"
      >
        {showSouthWall ? '👁️ Ver Lateral' : '🧱 Fechar Lateral'}
      </button>

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
