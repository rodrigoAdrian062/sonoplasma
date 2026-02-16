import { Text } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { AnimatedFlame } from './AnimatedFlame';

interface AltarProps {
  onClick?: () => void;
}

// Procedural wood grain texture
function createWoodTexture(baseColor: string, grainColor: string, scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Wood grain lines
  ctx.strokeStyle = grainColor;
  for (let i = 0; i < 60; i++) {
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.globalAlpha = 0.15 + Math.random() * 0.2;
    ctx.beginPath();
    let y = Math.random() * canvas.height;
    ctx.moveTo(0, y);
    for (let x = 0; x < canvas.width; x += 20) {
      y += (Math.random() - 0.5) * 4 * scale;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Knots
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 3; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 8 + Math.random() * 15, 0, Math.PI * 2);
    ctx.fillStyle = grainColor;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function Altar({ onClick }: AltarProps) {
  const darkWoodTex = useMemo(() => createWoodTexture('#2a1810', '#1a0e08'), []);
  const medWoodTex = useMemo(() => createWoodTexture('#3a2515', '#251508'), []);

  return (
    <group position={[0, 0, -11]} onClick={onClick}>
      {/* Altar-Mor (Main Altar) - VM's desk with wood texture */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.8, 0.8]} />
        <meshStandardMaterial map={medWoodTex} roughness={0.75} />
      </mesh>

      {/* Altar top (polished darker wood) */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[2.3, 0.1, 0.9]} />
        <meshStandardMaterial map={darkWoodTex} roughness={0.4} metalness={0.05} />
      </mesh>

      {/* Gold inlay trim on edges */}
      <mesh position={[0, 0.91, 0]}>
        <boxGeometry args={[2.32, 0.02, 0.92]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} transparent opacity={0.3} />
      </mesh>

      {/* Esquadro symbol on front (Square - VM's jewel) */}
      <group position={[0, 0.4, 0.42]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.025, 0.025]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[0.08, -0.08, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <boxGeometry args={[0.18, 0.025, 0.025]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.9} />
        </mesh>
      </group>

      {/* Three-branch candelabrum (Luzes Litúrgicas) - enhanced */}
      <group position={[0.8, 0.9, 0.2]}>
        {/* Ornate base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.12, 0.08, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.08, 16]} />
          <meshStandardMaterial color="#c9a227" roughness={0.25} metalness={0.8} />
        </mesh>
        {/* Main stem */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.025, 0.18, 8]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
        </mesh>
        {/* Three candle holders */}
        {[-0.1, 0, 0.1].map((x, i) => (
          <group key={i} position={[x, 0.32, 0]}>
            {/* Dish */}
            <mesh castShadow>
              <cylinderGeometry args={[0.025, 0.03, 0.04, 8]} />
              <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
            </mesh>
            {/* Candle - with wax texture */}
            <mesh position={[0, 0.12, 0]} castShadow>
              <cylinderGeometry args={[0.014, 0.016, 0.18, 8]} />
              <meshStandardMaterial color="#faf5e8" roughness={0.95} />
            </mesh>
            {/* Animated flame */}
            <AnimatedFlame position={[0, 0.24, 0]} scale={0.6} lightDistance={2.5} lightIntensity={0.3} />
          </group>
        ))}
      </group>

      {/* Malhete (Gavel) - more detailed */}
      <group position={[-0.6, 0.95, 0.15]} rotation={[0, 0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.14, 0.06, 0.06]} />
          <meshStandardMaterial map={darkWoodTex} roughness={0.8} />
        </mesh>
        {/* Metal bands */}
        <mesh position={[-0.06, 0, 0]}>
          <boxGeometry args={[0.01, 0.065, 0.065]} />
          <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0.06, 0, 0]}>
          <boxGeometry args={[0.01, 0.065, 0.065]} />
          <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, -0.1, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.016, 0.18, 8]} />
          <meshStandardMaterial color="#5a4030" roughness={0.7} />
        </mesh>
      </group>

      {/* Sword case (Espada Flamejante) */}
      <mesh position={[-0.3, 0.92, -0.2]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.65, 0.04, 0.08]} />
        <meshStandardMaterial map={darkWoodTex} roughness={0.8} />
      </mesh>
      {/* Gold clasp */}
      <mesh position={[-0.1, 0.94, -0.2]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.04, 0.02, 0.09]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
      </mesh>

      {/* Prancheta (right side) */}
      <group position={[1.2, 1.05, 0]} rotation={[0.2, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.35, 0.02]} />
          <meshStandardMaterial map={darkWoodTex} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.012]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.2, 0.02, 0.005]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0, 0.012]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.2, 0.02, 0.005]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
        </mesh>
      </group>

      {/* Carta Constitutiva frame */}
      <group position={[-1.2, 1.05, 0]} rotation={[0.2, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.35, 0.02]} />
          <meshStandardMaterial map={darkWoodTex} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <boxGeometry args={[0.25, 0.3, 0.005]} />
          <meshStandardMaterial color="#faf5e0" roughness={0.95} />
        </mesh>
        <Text
          position={[0, 0, 0.02]}
          fontSize={0.03}
          color="#2a1810"
          anchorX="center"
          anchorY="middle"
        >
          CARTA{'\n'}CONSTITUTIVA
        </Text>
      </group>

      {/* Label */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.1}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        Altar do Venerável Mestre
      </Text>
    </group>
  );
}
