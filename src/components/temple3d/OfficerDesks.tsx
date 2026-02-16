import { Text } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { AnimatedFlame } from './AnimatedFlame';

interface OfficerDesksProps {
  onClick?: (name: string) => void;
}

function createWoodTex() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3a2515';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#251508';
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 35; i++) {
    ctx.lineWidth = 0.3 + Math.random() * 1;
    ctx.beginPath();
    let y = Math.random() * 256;
    ctx.moveTo(0, y);
    for (let x = 0; x < 256; x += 10) { y += (Math.random() - 0.5) * 2.5; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(canvas);
}

function createFabricTex(color: string) {
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
  return new THREE.CanvasTexture(canvas);
}

export function OfficerDesks({ onClick }: OfficerDesksProps) {
  const woodTex = useMemo(() => createWoodTex(), []);
  const fabricTex = useMemo(() => createFabricTex('#7a0000'), []);

  const OfficerDesk = ({
    position,
    rotation,
    title,
    name,
    symbol,
  }: {
    position: [number, number, number];
    rotation: number;
    title: string;
    name: string;
    symbol?: string;
  }) => (
    <group position={position} rotation={[0, rotation, 0]} onClick={() => onClick?.(name)}>
      {/* Desk - polished wood */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.3, 0.08, 0.55]} />
        <meshStandardMaterial map={woodTex} roughness={0.5} />
      </mesh>
      
      {/* Desk front panel */}
      <mesh position={[0, 0.22, 0.25]} castShadow>
        <boxGeometry args={[1.3, 0.44, 0.04]} />
        <meshStandardMaterial map={woodTex} roughness={0.6} />
      </mesh>

      {/* Desk legs */}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={i} position={[x, 0.22, -0.22]} castShadow>
          <boxGeometry args={[0.06, 0.44, 0.06]} />
          <meshStandardMaterial map={woodTex} roughness={0.7} />
        </mesh>
      ))}

      {/* Chair */}
      <mesh position={[0, 0.28, -0.55]} castShadow>
        <boxGeometry args={[0.55, 0.06, 0.45]} />
        <meshStandardMaterial map={fabricTex} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, -0.75]} castShadow>
        <boxGeometry args={[0.55, 0.5, 0.06]} />
        <meshStandardMaterial map={fabricTex} roughness={0.85} />
      </mesh>
      {/* Chair legs */}
      {[-0.22, 0.22].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.13, -0.35]} castShadow>
            <boxGeometry args={[0.04, 0.26, 0.04]} />
            <meshStandardMaterial map={woodTex} roughness={0.7} />
          </mesh>
          <mesh position={[x, 0.13, -0.72]} castShadow>
            <boxGeometry args={[0.04, 0.26, 0.04]} />
            <meshStandardMaterial map={woodTex} roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Candelabrum on desk */}
      <group position={[0.45, 0.52, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.07, 0.06, 12]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.02, 0.1, 8]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.013, 0.013, 0.12, 8]} />
          <meshStandardMaterial color="#fffaf0" roughness={0.95} />
        </mesh>
        <AnimatedFlame position={[0, 0.26, 0]} scale={0.4} lightDistance={2} lightIntensity={0.2} />
      </group>

      {/* Symbol on desk front */}
      {symbol && (
        <Text
          position={[0, 0.22, 0.28]}
          fontSize={0.12}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          {symbol}
        </Text>
      )}

      {/* Title */}
      <Text
        position={[0, 0.95, 0]}
        fontSize={0.08}
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
      {/* === ORIENTE (behind balustrade) === */}
      
      {/* Orador (10) - North side of East, facing South */}
      <OfficerDesk
        position={[-5.5, 0, -9]}
        rotation={Math.PI / 2}
        title="Orador"
        name="orador"
        symbol="📖"
      />

      {/* Secretário (16) - South side of East, facing North */}
      <OfficerDesk
        position={[5.5, 0, -9]}
        rotation={-Math.PI / 2}
        title="Secretário"
        name="secretario"
        symbol="✒"
      />

      {/* Altar dos Perfumes (near VM) */}
      <group position={[2.5, 0, -11]} onClick={() => onClick?.('altar-perfumes')}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, 0.7, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.65} />
        </mesh>
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.18, 0.2, 0.1, 16]} />
          <meshStandardMaterial color="#2a1810" roughness={0.7} />
        </mesh>
        <Text position={[0, 1.1, 0]} fontSize={0.06} color="#d4af37" anchorX="center" anchorY="middle">
          Altar dos Perfumes
        </Text>
      </group>

      {/* === NORTH COLUMN (outside balustrade) === */}
      
      {/* Tesoureiro (near balustrade, north) */}
      <OfficerDesk
        position={[-5.5, 0, -5]}
        rotation={Math.PI / 2}
        title="Tesoureiro"
        name="tesoureiro"
        symbol="🔑"
      />

      {/* Hospitaleiro (north, further west) */}
      <OfficerDesk
        position={[-5.5, 0, -2]}
        rotation={Math.PI / 2}
        title="Hospitaleiro"
        name="hospitaleiro"
        symbol="💝"
      />

      {/* === SOUTH COLUMN === */}

      {/* Chanceler (south, near balustrade) */}
      <OfficerDesk
        position={[5.5, 0, -5]}
        rotation={-Math.PI / 2}
        title="Chanceler"
        name="chanceler"
        symbol="⚜"
      />

      {/* === CENTER / WEST === */}

      {/* Mestre de Cerimônias - center, near west */}
      <OfficerDesk
        position={[0, 0, 7]}
        rotation={Math.PI}
        title="M∴ de Cerimônias"
        name="mestre-cerimonias"
        symbol="🗡"
      />

      {/* 1º Diácono (6) - near 1º Vigilante (west) */}
      <OfficerDesk
        position={[-3.5, 0, 8]}
        rotation={Math.PI}
        title="1º Diácono"
        name="1-diacono"
      />

      {/* 2º Diácono (9) - near 2º Vigilante (south) */}
      <OfficerDesk
        position={[5.5, 0, 2]}
        rotation={-Math.PI / 2}
        title="2º Diácono"
        name="2-diacono"
      />

      {/* Cobridor (19) - outside door, east side */}
      <OfficerDesk
        position={[3, 0, 12.5]}
        rotation={Math.PI}
        title="Cobridor"
        name="cobridor"
        symbol="⚔"
      />

      {/* Guarda Interno (18) - inside door, west side */}
      <OfficerDesk
        position={[-3, 0, 12.5]}
        rotation={Math.PI}
        title="Guarda Interno"
        name="guarda-interno"
        symbol="🛡"
      />
    </group>
  );
}
