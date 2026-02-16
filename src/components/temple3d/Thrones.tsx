import { Text } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

interface ThronesProps {
  onClick?: (name: string) => void;
}

function createFabricTexture(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  // Base rich color
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, color);
  const darkerColor = color.replace(/[0-9a-f]{2}/gi, (match) => {
    const val = Math.max(0, parseInt(match, 16) - 15);
    return val.toString(16).padStart(2, '0');
  });
  grad.addColorStop(1, darkerColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Velvet weave pattern
  ctx.globalAlpha = 0.04;
  for (let y = 0; y < canvas.height; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(0, y, canvas.width, 1);
  }
  for (let x = 0; x < canvas.width; x += 2) {
    ctx.fillStyle = x % 4 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(x, 0, 1, canvas.height);
  }
  ctx.globalAlpha = 1;

  // Subtle shimmer spots
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 3 + Math.random() * 8;
    const shimmer = ctx.createRadialGradient(x, y, 0, x, y, r);
    shimmer.addColorStop(0, '#ffffff');
    shimmer.addColorStop(1, 'transparent');
    ctx.fillStyle = shimmer;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function createWoodTexture(base: string, grain: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  // Rich wood gradient
  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, base);
  grad.addColorStop(0.5, base.replace(/[0-9a-f]{2}/gi, (m) => Math.min(255, parseInt(m, 16) + 10).toString(16).padStart(2, '0')));
  grad.addColorStop(1, base);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  
  // Realistic grain
  ctx.strokeStyle = grain;
  for (let i = 0; i < 60; i++) {
    ctx.lineWidth = 0.3 + Math.random() * 1.2;
    ctx.globalAlpha = 0.1 + Math.random() * 0.15;
    ctx.beginPath();
    let y = Math.random() * 512;
    ctx.moveTo(0, y);
    for (let x = 0; x < 512; x += 12) {
      y += (Math.random() - 0.5) * 2.5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(canvas);
}

export function Thrones({ onClick }: ThronesProps) {
  const velvetTex = useMemo(() => createFabricTexture('#7a0000'), []);
  const woodTex = useMemo(() => createWoodTexture('#2a1810', '#1a0e08'), []);

  const VMThrone = () => (
    <group position={[0, 0, -12.5]} onClick={() => onClick?.('throne-vm')}>
      {/* Three marble steps - wider and grander */}
      {[
        { w: 6, d: 4, y: 0.1, z: 1.8 },
        { w: 5.2, d: 3, y: 0.3, z: 1.2 },
        { w: 4.4, d: 2, y: 0.5, z: 0.6 },
      ].map((step, i) => (
        <group key={i}>
          <mesh position={[0, step.y, step.z]} castShadow receiveShadow>
            <boxGeometry args={[step.w, 0.2, step.d]} />
            <meshStandardMaterial color="#e8e0d0" roughness={0.2} metalness={0.08} />
          </mesh>
          {/* Gold edge trim on each step */}
          <mesh position={[0, step.y + 0.1, step.z + step.d / 2]}>
            <boxGeometry args={[step.w, 0.02, 0.02]} />
            <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Throne seat frame - polished dark wood */}
      <mesh position={[0, 0.82, 0]} castShadow>
        <boxGeometry args={[1.3, 0.3, 1]} />
        <meshStandardMaterial map={woodTex} roughness={0.6} />
      </mesh>
      {/* Velvet seat cushion */}
      <mesh position={[0, 1, 0.1]} castShadow>
        <boxGeometry args={[1.15, 0.12, 0.75]} />
        <meshStandardMaterial map={velvetTex} roughness={0.92} />
      </mesh>
      {/* High back - wood frame */}
      <mesh position={[0, 1.7, -0.5]} castShadow>
        <boxGeometry args={[1.4, 1.5, 0.1]} />
        <meshStandardMaterial map={woodTex} roughness={0.6} />
      </mesh>
      {/* Velvet back panel */}
      <mesh position={[0, 1.7, -0.42]} castShadow>
        <boxGeometry args={[1.2, 1.3, 0.06]} />
        <meshStandardMaterial map={velvetTex} roughness={0.92} />
      </mesh>
      {/* Gold crown/emblem on back top */}
      <mesh position={[0, 2.35, -0.44]}>
        <circleGeometry args={[0.2, 32]} />
        <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} emissive="#d4af37" emissiveIntensity={0.1} />
      </mesh>
      {/* Armrests */}
      {[-0.65, 0.65].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 1.1, -0.05]} castShadow>
            <boxGeometry args={[0.1, 0.2, 0.85]} />
            <meshStandardMaterial map={woodTex} roughness={0.6} />
          </mesh>
          <mesh position={[x, 1.13, 0.35]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Grand Dossel (Red Velvet Canopy) */}
      <mesh position={[0, 3.5, -0.3]} castShadow>
        <boxGeometry args={[3.5, 0.18, 1.8]} />
        <meshStandardMaterial map={woodTex} roughness={0.6} />
      </mesh>
      {/* Back curtain */}
      <mesh position={[0, 2.4, -0.85]} castShadow>
        <boxGeometry args={[3.2, 2.2, 0.06]} />
        <meshStandardMaterial map={velvetTex} roughness={0.95} />
      </mesh>
      {/* Side curtains */}
      {[-1.55, 1.55].map((x, i) => (
        <mesh key={i} position={[x, 2.4, 0.05]} castShadow>
          <boxGeometry args={[0.08, 2.2, 0.9]} />
          <meshStandardMaterial map={velvetTex} roughness={0.95} />
        </mesh>
      ))}
      {/* Gold fringe along front */}
      <mesh position={[0, 3.33, 0.55]}>
        <boxGeometry args={[3.6, 0.15, 0.02]} />
        <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.85} />
      </mesh>
      {/* Gold tassels */}
      {[-1.4, -0.7, 0.7, 1.4].map((x, i) => (
        <group key={i} position={[x, 3.2, 0.55]}>
          <mesh>
            <cylinderGeometry args={[0.015, 0.015, 0.15, 8]} />
            <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <coneGeometry args={[0.045, 0.1, 12]} />
            <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
          </mesh>
        </group>
      ))}

      <Text
        position={[0, 3.8, 0]}
        fontSize={0.14}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        Venerável Mestre
      </Text>
    </group>
  );

  const VigilanteThrone = ({
    position,
    title,
    name,
    steps,
    rotation = 0,
    symbol,
  }: {
    position: [number, number, number];
    title: string;
    name: string;
    steps: number;
    rotation?: number;
    symbol: string;
  }) => (
    <group position={position} rotation={[0, rotation, 0]} onClick={() => onClick?.(name)}>
      {/* Steps */}
      {Array.from({ length: steps }, (_, i) => (
        <mesh key={i} position={[0, 0.1 + i * 0.2, (steps - i) * 0.4]} castShadow receiveShadow>
          <boxGeometry args={[2.8 - i * 0.3, 0.2, 1.5 - i * 0.2]} />
          <meshStandardMaterial color="#e8e0d0" roughness={0.2} metalness={0.08} />
        </mesh>
      ))}

      {/* Chair */}
      <mesh position={[0, 0.2 + steps * 0.2, 0]} castShadow>
        <boxGeometry args={[1, 0.25, 0.75]} />
        <meshStandardMaterial map={woodTex} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.36 + steps * 0.2, 0.05]} castShadow>
        <boxGeometry args={[0.9, 0.08, 0.6]} />
        <meshStandardMaterial map={velvetTex} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.7 + steps * 0.2, -0.35]} castShadow>
        <boxGeometry args={[1, 0.7, 0.08]} />
        <meshStandardMaterial map={woodTex} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.7 + steps * 0.2, -0.3]} castShadow>
        <boxGeometry args={[0.88, 0.6, 0.04]} />
        <meshStandardMaterial map={velvetTex} roughness={0.92} />
      </mesh>
      {/* Armrests */}
      {[-0.48, 0.48].map((x, i) => (
        <mesh key={i} position={[x, 0.48 + steps * 0.2, -0.05]} castShadow>
          <boxGeometry args={[0.06, 0.18, 0.5]} />
          <meshStandardMaterial map={woodTex} roughness={0.6} />
        </mesh>
      ))}

      {/* Desk */}
      <mesh position={[0, 0.38 + steps * 0.2, 0.85]} castShadow>
        <boxGeometry args={[1.8, 0.65, 0.45]} />
        <meshStandardMaterial map={woodTex} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.72 + steps * 0.2, 0.85]}>
        <boxGeometry args={[1.82, 0.02, 0.47]} />
        <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.85} transparent opacity={0.2} />
      </mesh>

      {/* Symbol */}
      <Text
        position={[0, 0.38 + steps * 0.2, 1.1]}
        fontSize={0.15}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        {symbol}
      </Text>

      <Text
        position={[0, 1.5 + steps * 0.2, 0]}
        fontSize={0.1}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
        rotation={[0, -rotation, 0]}
      >
        {title}
      </Text>
    </group>
  );

  return (
    <group>
      <VMThrone />
      {/* 1º Vigilante - West, center, facing East */}
      <VigilanteThrone
        position={[0, 0, 10]}
        title="1º Vigilante"
        name="throne-1v"
        steps={2}
        rotation={Math.PI}
        symbol="⊥"
      />
      {/* 2º Vigilante - South wall, mid-point, facing North */}
      <VigilanteThrone
        position={[5.8, 0, -1]}
        title="2º Vigilante"
        name="throne-2v"
        steps={1}
        rotation={-Math.PI / 2}
        symbol="↓"
      />
    </group>
  );
}
