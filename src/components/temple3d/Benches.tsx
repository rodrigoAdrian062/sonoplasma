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
  ctx.globalAlpha = 0.04;
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
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3a2515';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#251508';
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 30; i++) {
    ctx.lineWidth = 0.3 + Math.random() * 0.8;
    ctx.beginPath();
    let y = Math.random() * 256;
    ctx.moveTo(0, y);
    for (let x = 0; x < 256; x += 10) { y += (Math.random() - 0.5) * 2; ctx.lineTo(x, y); }
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
        {/* Desk with polished wood */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.08, 0.5]} />
          <meshStandardMaterial map={woodTex} roughness={0.5} />
        </mesh>
        {/* Gold edge on desk */}
        <mesh position={[0, 0.495, 0]}>
          <boxGeometry args={[2.52, 0.01, 0.52]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.85} transparent opacity={0.15} />
        </mesh>
        {/* Desk legs */}
        <mesh position={[-1.1, 0.22, 0]} castShadow>
          <boxGeometry args={[0.06, 0.44, 0.4]} />
          <meshStandardMaterial map={woodTex} roughness={0.7} />
        </mesh>
        <mesh position={[1.1, 0.22, 0]} castShadow>
          <boxGeometry args={[0.06, 0.44, 0.4]} />
          <meshStandardMaterial map={woodTex} roughness={0.7} />
        </mesh>
        
        {/* Chair seat */}
        <mesh position={[0, 0.35, -0.5]} castShadow>
          <boxGeometry args={[2.5, 0.07, 0.4]} />
          <meshStandardMaterial map={fabricTex} roughness={0.88} />
        </mesh>
        
        {/* Chair back */}
        <mesh position={[0, 0.68, -0.7]} castShadow>
          <boxGeometry args={[2.5, 0.6, 0.06]} />
          <meshStandardMaterial map={fabricTex} roughness={0.88} />
        </mesh>
        
        {/* Chair frame sides */}
        <mesh position={[-1.2, 0.52, -0.52]} castShadow>
          <boxGeometry args={[0.06, 0.75, 0.42]} />
          <meshStandardMaterial map={woodTex} roughness={0.7} />
        </mesh>
        <mesh position={[1.2, 0.52, -0.52]} castShadow>
          <boxGeometry args={[0.06, 0.75, 0.42]} />
          <meshStandardMaterial map={woodTex} roughness={0.7} />
        </mesh>

        {label && (
          <Text
            position={[0, 0.55, 0.1]}
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
      {/* === NORTH COLUMN - Apprentices (gray) === */}
      {/* Rows I-VI along the north wall */}
      <BenchRow position={[-5.5, 0, 9]} side="north" fabricTex={grayFabric} />
      <BenchRow position={[-5.5, 0, 6.5]} side="north" fabricTex={grayFabric} />
      <BenchRow position={[-5.5, 0, 4]} side="north" fabricTex={grayFabric} />
      <BenchRow position={[-5.5, 0, 1.5]} side="north" label="Aprendizes" fabricTex={grayFabric} />
      {/* Second row of benches (32) - inner row */}
      <BenchRow position={[-3.8, 0, 6.5]} side="north" fabricTex={grayFabric} />
      <BenchRow position={[-3.8, 0, 4]} side="north" fabricTex={grayFabric} />
      <BenchRow position={[-3.8, 0, 1.5]} side="north" fabricTex={grayFabric} />

      {/* === SOUTH COLUMN - Fellows (red) === */}
      {/* Rows VII-XI along the south wall */}
      <BenchRow position={[5.5, 0, 9]} side="south" fabricTex={redFabric} />
      <BenchRow position={[5.5, 0, 6.5]} side="south" fabricTex={redFabric} />
      <BenchRow position={[5.5, 0, 4]} side="south" fabricTex={redFabric} />
      <BenchRow position={[5.5, 0, 1.5]} side="south" label="Companheiros" fabricTex={redFabric} />
      {/* Second row (31) - inner row */}
      <BenchRow position={[3.8, 0, 6.5]} side="south" fabricTex={redFabric} />
      <BenchRow position={[3.8, 0, 4]} side="south" fabricTex={redFabric} />
      <BenchRow position={[3.8, 0, 1.5]} side="south" fabricTex={redFabric} />

      {/* === MASTERS - Near East, both sides (blue) === */}
      
      {/* Masters - North side (inside balustrade) */}
      <group position={[-4.5, 0, -8]} rotation={[0, Math.PI / 2, 0]}>
        {[-0.9, 0, 0.9].map((x, i) => (
          <group key={`mn-${i}`} position={[x, 0, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.65, 0.06, 0.5]} />
              <meshStandardMaterial map={blueFabric} roughness={0.88} />
            </mesh>
            <mesh position={[0, 0.68, -0.24]} castShadow>
              <boxGeometry args={[0.65, 0.6, 0.06]} />
              <meshStandardMaterial map={blueFabric} roughness={0.88} />
            </mesh>
            {[-0.28, 0.28].map((lx, j) => (
              <mesh key={j} position={[lx, 0.18, 0]} castShadow>
                <boxGeometry args={[0.04, 0.36, 0.04]} />
                <meshStandardMaterial map={woodTex} roughness={0.7} />
              </mesh>
            ))}
          </group>
        ))}
        <Text position={[0, 1.15, 0]} fontSize={0.1} color="#d4af37" anchorX="center" anchorY="middle" rotation={[0, -Math.PI / 2, 0]}>
          Mestres
        </Text>
      </group>

      {/* Masters - South side */}
      <group position={[4.5, 0, -8]} rotation={[0, -Math.PI / 2, 0]}>
        {[-0.9, 0, 0.9].map((x, i) => (
          <group key={`ms-${i}`} position={[x, 0, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.65, 0.06, 0.5]} />
              <meshStandardMaterial map={blueFabric} roughness={0.88} />
            </mesh>
            <mesh position={[0, 0.68, -0.24]} castShadow>
              <boxGeometry args={[0.65, 0.6, 0.06]} />
              <meshStandardMaterial map={blueFabric} roughness={0.88} />
            </mesh>
            {[-0.28, 0.28].map((lx, j) => (
              <mesh key={j} position={[lx, 0.18, 0]} castShadow>
                <boxGeometry args={[0.04, 0.36, 0.04]} />
                <meshStandardMaterial map={woodTex} roughness={0.7} />
              </mesh>
            ))}
          </group>
        ))}
        <Text position={[0, 1.15, 0]} fontSize={0.1} color="#d4af37" anchorX="center" anchorY="middle" rotation={[0, Math.PI / 2, 0]}>
          Mestres
        </Text>
      </group>

      {/* Column labels on walls */}
      <Text position={[-6, 2.5, 0]} fontSize={0.15} color="#d4af37" anchorX="center" anchorY="middle" rotation={[0, Math.PI / 2, 0]}>
        Coluna do Norte
      </Text>
      <Text position={[6, 2.5, 0]} fontSize={0.15} color="#d4af37" anchorX="center" anchorY="middle" rotation={[0, -Math.PI / 2, 0]}>
        Coluna do Sul
      </Text>
    </group>
  );
}
