import { Text } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

interface PillarsProps {
  onClick?: (name: string) => void;
}

function createBronzeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  // Bronze gradient
  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, '#a06828');
  grad.addColorStop(0.3, '#cd7f32');
  grad.addColorStop(0.5, '#daa520');
  grad.addColorStop(0.7, '#cd7f32');
  grad.addColorStop(1, '#a06828');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Patina and surface detail
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.fillStyle = Math.random() > 0.5 ? '#4a8060' : '#2a1810';
    ctx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  ctx.globalAlpha = 1;
  
  // Vertical polish lines
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#ffffff';
  for (let i = 0; i < 30; i++) {
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    const x = Math.random() * canvas.width;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 10, canvas.height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createMarbleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Marble veins
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 20; i++) {
    ctx.strokeStyle = `hsl(${30 + Math.random() * 20}, ${10 + Math.random() * 20}%, ${70 + Math.random() * 15}%)`;
    ctx.lineWidth = 0.5 + Math.random() * 2;
    ctx.beginPath();
    let x = Math.random() * canvas.width;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < canvas.height) {
      x += (Math.random() - 0.5) * 30;
      y += 10 + Math.random() * 20;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  return new THREE.CanvasTexture(canvas);
}

export function Pillars({ onClick }: PillarsProps) {
  const bronzeTex = useMemo(() => createBronzeTexture(), []);
  const marbleTex = useMemo(() => createMarbleTexture(), []);

  const VestibularPillar = ({ 
    position, letter, name, fullName,
  }: { 
    position: [number, number, number]; 
    letter: string; name: string; fullName: string;
  }) => (
    <group position={position} onClick={() => onClick?.(name)}>
      {/* Base with detailed molding */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.48, 0.52, 0.24, 32]} />
        <meshStandardMaterial map={bronzeTex} roughness={0.35} metalness={0.65} />
      </mesh>
      {/* Base ring */}
      <mesh position={[0, 0.25, 0]}>
        <torusGeometry args={[0.45, 0.03, 16, 32]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
      </mesh>
      
      {/* Column shaft - tapered with fluting effect via texture */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.38, 6.2, 32]} />
        <meshStandardMaterial map={bronzeTex} roughness={0.35} metalness={0.6} />
      </mesh>

      {/* Mid-shaft decorative ring */}
      <mesh position={[0, 3.5, 0]}>
        <torusGeometry args={[0.32, 0.02, 16, 32]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
      </mesh>

      {/* Capital with lily leaves */}
      <mesh position={[0, 6.7, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.3, 0.4, 32]} />
        <meshStandardMaterial map={bronzeTex} roughness={0.35} metalness={0.65} />
      </mesh>

      {/* Network/lattice ring */}
      <mesh position={[0, 7, 0]}>
        <torusGeometry args={[0.42, 0.04, 16, 32]} />
        <meshStandardMaterial map={bronzeTex} roughness={0.35} metalness={0.65} />
      </mesh>

      {/* Pomegranates on top */}
      {[0, Math.PI / 3, 2 * Math.PI / 3, Math.PI, 4 * Math.PI / 3, 5 * Math.PI / 3].map((angle, i) => (
        <group key={i}>
          <mesh position={[Math.cos(angle) * 0.35, 7.25, Math.sin(angle) * 0.35]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#8B0000" roughness={0.7} />
          </mesh>
          {/* Pomegranate crown */}
          <mesh position={[Math.cos(angle) * 0.35, 7.32, Math.sin(angle) * 0.35]}>
            <coneGeometry args={[0.02, 0.04, 6]} />
            <meshStandardMaterial color="#4a2000" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Globe on top */}
      <mesh position={[0, 7.5, 0]} castShadow>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial map={bronzeTex} roughness={0.25} metalness={0.7} />
      </mesh>
      {/* Globe equator line */}
      <mesh position={[0, 7.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.255, 0.008, 8, 32]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
      </mesh>

      {/* Letter on column - embossed look */}
      <Text
        position={[0, 3.5, 0.34]}
        fontSize={0.4}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {letter}
      </Text>

      <Text
        position={[0, 8.1, 0]}
        fontSize={0.12}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        {fullName}
      </Text>
    </group>
  );

  const SideColumn = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      {/* Marble base */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.3, 32]} />
        <meshStandardMaterial map={marbleTex} roughness={0.3} metalness={0.05} />
      </mesh>
      
      {/* Fluted column shaft */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 6.5, 24]} />
        <meshStandardMaterial map={marbleTex} roughness={0.25} metalness={0.05} />
      </mesh>
      
      {/* Ionic capital */}
      <mesh position={[0, 6.9, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.25, 0.3, 32]} />
        <meshStandardMaterial map={marbleTex} roughness={0.3} metalness={0.05} />
      </mesh>
      
      {/* Top plate */}
      <mesh position={[0, 7.15, 0]} castShadow>
        <boxGeometry args={[0.6, 0.2, 0.6]} />
        <meshStandardMaterial map={marbleTex} roughness={0.3} metalness={0.05} />
      </mesh>
    </group>
  );

  return (
    <group>
      <VestibularPillar position={[-2.5, 0, 12]} letter="B" name="pillar-b" fullName="Boaz" />
      <VestibularPillar position={[2.5, 0, 12]} letter="J" name="pillar-j" fullName="Jakin" />

      {[-8, -4, 0, 4, 8].map((z, i) => (
        <SideColumn key={`north-${i}`} position={[-6.8, 0, z]} />
      ))}
      {[-8, -4, 0, 4, 8].map((z, i) => (
        <SideColumn key={`south-${i}`} position={[6.8, 0, z]} />
      ))}
    </group>
  );
}
