import { Text } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

interface BenchesProps {
  onClick?: (name: string) => void;
}

function createFabricTexture(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  ctx.globalAlpha = 0.05;
  for (let y = 0; y < 128; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? '#fff' : '#000';
    ctx.fillRect(0, y, 128, 1);
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createWoodTex() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3a2515';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#251508';
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 20; i++) {
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    let y = Math.random() * 128;
    ctx.moveTo(0, y);
    for (let x = 0; x < 128; x += 10) { y += (Math.random() - 0.5) * 3; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(canvas);
}

export function Benches({ onClick }: BenchesProps) {
  const grayFabric = useMemo(() => createFabricTexture('#4a5568'), []);
  const redFabric = useMemo(() => createFabricTexture('#6B0000'), []);
  const blueFabric = useMemo(() => createFabricTexture('#1a365d'), []);
  const woodTex = useMemo(() => createWoodTex(), []);

  const BenchRow = ({ 
    position, side, label, fabricTex,
  }: { 
    position: [number, number, number]; 
    side: 'north' | 'south';
    label?: string;
    fabricTex: THREE.Texture;
  }) => {
    const rotation = side === 'north' ? Math.PI / 2 : -Math.PI / 2;
    
    return (
      <group position={position} rotation={[0, rotation, 0]}>
        {/* Desk/Table */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.08, 0.5]} />
          <meshStandardMaterial map={woodTex} roughness={0.7} />
        </mesh>
        {/* Desk legs */}
        <mesh position={[-1.1, 0.22, 0]} castShadow>
          <boxGeometry args={[0.08, 0.44, 0.4]} />
          <meshStandardMaterial map={woodTex} roughness={0.8} />
        </mesh>
        <mesh position={[1.1, 0.22, 0]} castShadow>
          <boxGeometry args={[0.08, 0.44, 0.4]} />
          <meshStandardMaterial map={woodTex} roughness={0.8} />
        </mesh>
        
        {/* Chair seat with fabric */}
        <mesh position={[0, 0.35, -0.5]} castShadow>
          <boxGeometry args={[2.5, 0.07, 0.4]} />
          <meshStandardMaterial map={fabricTex} roughness={0.9} />
        </mesh>
        
        {/* Chair back */}
        <mesh position={[0, 0.65, -0.68]} castShadow>
          <boxGeometry args={[2.5, 0.55, 0.06]} />
          <meshStandardMaterial map={fabricTex} roughness={0.9} />
        </mesh>
        
        {/* Chair frame */}
        <mesh position={[-1.2, 0.5, -0.5]} castShadow>
          <boxGeometry args={[0.06, 0.7, 0.4]} />
          <meshStandardMaterial map={woodTex} roughness={0.8} />
        </mesh>
        <mesh position={[1.2, 0.5, -0.5]} castShadow>
          <boxGeometry args={[0.06, 0.7, 0.4]} />
          <meshStandardMaterial map={woodTex} roughness={0.8} />
        </mesh>

        {label && (
          <Text
            position={[0, 0.52, 0.1]}
            fontSize={0.12}
            color="#d4af37"
            anchorX="center"
            anchorY="middle"
            rotation={[0, -rotation, 0]}
          >
            {label}
          </Text>
        )}
      </group>
    );
  };

  return (
    <group onClick={() => onClick?.('benches')}>
      {/* North - Apprentices */}
      <BenchRow position={[-4.5, 0, -8]} side="north" label="Aprendizes" fabricTex={grayFabric} />
      <BenchRow position={[-4.5, 0, -5]} side="north" fabricTex={grayFabric} />
      <BenchRow position={[-4.5, 0, -2]} side="north" fabricTex={grayFabric} />
      <BenchRow position={[-4.5, 0, 1]} side="north" fabricTex={grayFabric} />
      <BenchRow position={[-4.5, 0, 4]} side="north" fabricTex={grayFabric} />
      <BenchRow position={[-4.5, 0, 7]} side="north" fabricTex={grayFabric} />

      {/* South - Companions */}
      <BenchRow position={[4.5, 0, -8]} side="south" label="Companheiros" fabricTex={redFabric} />
      <BenchRow position={[4.5, 0, -5]} side="south" fabricTex={redFabric} />
      <BenchRow position={[4.5, 0, -2]} side="south" fabricTex={redFabric} />
      <BenchRow position={[4.5, 0, 1]} side="south" fabricTex={redFabric} />
      <BenchRow position={[4.5, 0, 4]} side="south" fabricTex={redFabric} />
      
      {/* Masters - North Row 1 */}
      <group position={[-3.5, 0, -13]} rotation={[0, Math.PI / 2, 0]}>
        {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
          <group key={`mn1-${i}`} position={[x, 0, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.6, 0.06, 0.5]} />
              <meshStandardMaterial map={blueFabric} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.65, -0.22]} castShadow>
              <boxGeometry args={[0.6, 0.55, 0.06]} />
              <meshStandardMaterial map={blueFabric} roughness={0.9} />
            </mesh>
            {[-0.25, 0.25].map((lx, j) => (
              <mesh key={j} position={[lx, 0.17, 0]} castShadow>
                <boxGeometry args={[0.04, 0.34, 0.04]} />
                <meshStandardMaterial map={woodTex} roughness={0.8} />
              </mesh>
            ))}
          </group>
        ))}
        <Text position={[0, 1.1, 0]} fontSize={0.1} color="#d4af37" anchorX="center" anchorY="middle" rotation={[0, -Math.PI / 2, 0]}>
          Mestres
        </Text>
      </group>

      {/* Masters - North Row 2 */}
      <group position={[-3.5, 0, -11.5]} rotation={[0, Math.PI / 2, 0]}>
        {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
          <group key={`mn2-${i}`} position={[x, 0, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.6, 0.06, 0.5]} />
              <meshStandardMaterial map={blueFabric} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.65, -0.22]} castShadow>
              <boxGeometry args={[0.6, 0.55, 0.06]} />
              <meshStandardMaterial map={blueFabric} roughness={0.9} />
            </mesh>
            {[-0.25, 0.25].map((lx, j) => (
              <mesh key={j} position={[lx, 0.17, 0]} castShadow>
                <boxGeometry args={[0.04, 0.34, 0.04]} />
                <meshStandardMaterial map={woodTex} roughness={0.8} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Masters - South Row 1 */}
      <group position={[3.5, 0, -13]} rotation={[0, -Math.PI / 2, 0]}>
        {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
          <group key={`ms1-${i}`} position={[x, 0, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.6, 0.06, 0.5]} />
              <meshStandardMaterial map={blueFabric} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.65, -0.22]} castShadow>
              <boxGeometry args={[0.6, 0.55, 0.06]} />
              <meshStandardMaterial map={blueFabric} roughness={0.9} />
            </mesh>
            {[-0.25, 0.25].map((lx, j) => (
              <mesh key={j} position={[lx, 0.17, 0]} castShadow>
                <boxGeometry args={[0.04, 0.34, 0.04]} />
                <meshStandardMaterial map={woodTex} roughness={0.8} />
              </mesh>
            ))}
          </group>
        ))}
        <Text position={[0, 1.1, 0]} fontSize={0.1} color="#d4af37" anchorX="center" anchorY="middle" rotation={[0, Math.PI / 2, 0]}>
          Mestres
        </Text>
      </group>

      {/* Masters - South Row 2 */}
      <group position={[3.5, 0, -11.5]} rotation={[0, -Math.PI / 2, 0]}>
        {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
          <group key={`ms2-${i}`} position={[x, 0, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.6, 0.06, 0.5]} />
              <meshStandardMaterial map={blueFabric} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.65, -0.22]} castShadow>
              <boxGeometry args={[0.6, 0.55, 0.06]} />
              <meshStandardMaterial map={blueFabric} roughness={0.9} />
            </mesh>
            {[-0.25, 0.25].map((lx, j) => (
              <mesh key={j} position={[lx, 0.17, 0]} castShadow>
                <boxGeometry args={[0.04, 0.34, 0.04]} />
                <meshStandardMaterial map={woodTex} roughness={0.8} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Column labels */}
      <Text position={[-4.5, 2.5, 0]} fontSize={0.15} color="#d4af37" anchorX="center" anchorY="middle" rotation={[0, Math.PI / 2, 0]}>
        Coluna do Norte
      </Text>
      <Text position={[4.5, 2.5, 0]} fontSize={0.15} color="#d4af37" anchorX="center" anchorY="middle" rotation={[0, -Math.PI / 2, 0]}>
        Coluna do Sul
      </Text>
    </group>
  );
}
