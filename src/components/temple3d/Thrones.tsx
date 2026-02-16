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
  
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Fabric weave pattern
  ctx.globalAlpha = 0.06;
  for (let y = 0; y < canvas.height; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(0, y, canvas.width, 1);
  }
  for (let x = 0; x < canvas.width; x += 3) {
    ctx.fillStyle = x % 6 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(x, 0, 1, canvas.height);
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
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = grain;
  for (let i = 0; i < 40; i++) {
    ctx.lineWidth = 0.5 + Math.random();
    ctx.globalAlpha = 0.12 + Math.random() * 0.15;
    ctx.beginPath();
    let y = Math.random() * 256;
    ctx.moveTo(0, y);
    for (let x = 0; x < 256; x += 15) {
      y += (Math.random() - 0.5) * 3;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(canvas);
}

export function Thrones({ onClick }: ThronesProps) {
  const velvetTex = useMemo(() => createFabricTexture('#6B0000'), []);
  const woodTex = useMemo(() => createWoodTexture('#2a1810', '#1a0e08'), []);

  const VMThrone = () => (
    <group position={[0, 0, -12.5]} onClick={() => onClick?.('throne-vm')}>
      {/* Three marble steps */}
      {[
        { w: 5, d: 3.5, y: 0.1, z: 1.5 },
        { w: 4.5, d: 2.5, y: 0.3, z: 1 },
        { w: 4, d: 1.5, y: 0.5, z: 0.5 },
      ].map((step, i) => (
        <mesh key={i} position={[0, step.y, step.z]} castShadow receiveShadow>
          <boxGeometry args={[step.w, 0.2, step.d]} />
          <meshStandardMaterial color="#e8e0d0" roughness={0.25} metalness={0.05} />
        </mesh>
      ))}
      {/* Step gold edge trim */}
      {[0.2, 0.4, 0.6].map((y, i) => (
        <mesh key={`trim-${i}`} position={[0, y, 1.5 - i * 0.5]}>
          <boxGeometry args={[5 - i * 0.5, 0.02, 0.02]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
        </mesh>
      ))}

      {/* Throne frame */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[1.2, 0.3, 0.9]} />
        <meshStandardMaterial map={woodTex} roughness={0.75} />
      </mesh>
      {/* Seat cushion - velvet */}
      <mesh position={[0, 0.97, 0.1]} castShadow>
        <boxGeometry args={[1.08, 0.1, 0.68]} />
        <meshStandardMaterial map={velvetTex} roughness={0.9} />
      </mesh>
      {/* High back - velvet with wood frame */}
      <mesh position={[0, 1.55, -0.48]} castShadow>
        <boxGeometry args={[1.3, 1.35, 0.08]} />
        <meshStandardMaterial map={woodTex} roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.55, -0.4]} castShadow>
        <boxGeometry args={[1.15, 1.2, 0.06]} />
        <meshStandardMaterial map={velvetTex} roughness={0.9} />
      </mesh>
      {/* Gold medallion on back */}
      <mesh position={[0, 1.8, -0.36]}>
        <circleGeometry args={[0.15, 32]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
      </mesh>
      {/* Armrests with carved ends */}
      {[-0.58, 0.58].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 1.05, 0]} castShadow>
            <boxGeometry args={[0.1, 0.2, 0.75]} />
            <meshStandardMaterial map={woodTex} roughness={0.75} />
          </mesh>
          {/* Carved scroll end */}
          <mesh position={[x, 1.08, 0.35]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial map={woodTex} roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Red Dossel (Canopy) - rich velvet */}
      <mesh position={[0, 3.3, -0.3]} castShadow>
        <boxGeometry args={[3, 0.15, 1.5]} />
        <meshStandardMaterial map={woodTex} roughness={0.7} />
      </mesh>
      {/* Back curtain */}
      <mesh position={[0, 2.3, -0.8]} castShadow>
        <boxGeometry args={[2.8, 2, 0.06]} />
        <meshStandardMaterial map={velvetTex} roughness={0.92} />
      </mesh>
      {/* Side curtains with draping */}
      {[-1.38, 1.38].map((x, i) => (
        <mesh key={i} position={[x, 2.3, 0.1]} castShadow>
          <boxGeometry args={[0.08, 2, 0.8]} />
          <meshStandardMaterial map={velvetTex} roughness={0.92} />
        </mesh>
      ))}
      {/* Gold fringe */}
      <mesh position={[0, 3.15, 0.42]}>
        <boxGeometry args={[3.1, 0.12, 0.02]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Gold tassels */}
      {[-1.3, -0.8, 0.8, 1.3].map((x, i) => (
        <group key={i} position={[x, 3.05, 0.42]}>
          <mesh>
            <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
            <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, -0.1, 0]}>
            <coneGeometry args={[0.04, 0.08, 12]} />
            <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
          </mesh>
        </group>
      ))}

      <Text
        position={[0, 3.6, 0]}
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
          <boxGeometry args={[2.5 - i * 0.3, 0.2, 1.5 - i * 0.2]} />
          <meshStandardMaterial color="#e8e0d0" roughness={0.25} metalness={0.05} />
        </mesh>
      ))}

      {/* Chair with wood texture */}
      <mesh position={[0, 0.2 + steps * 0.2, 0]} castShadow>
        <boxGeometry args={[0.9, 0.25, 0.7]} />
        <meshStandardMaterial map={woodTex} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.35 + steps * 0.2, 0.05]} castShadow>
        <boxGeometry args={[0.83, 0.07, 0.58]} />
        <meshStandardMaterial map={velvetTex} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.65 + steps * 0.2, -0.32]} castShadow>
        <boxGeometry args={[0.9, 0.6, 0.08]} />
        <meshStandardMaterial map={woodTex} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.65 + steps * 0.2, -0.28]} castShadow>
        <boxGeometry args={[0.82, 0.52, 0.04]} />
        <meshStandardMaterial map={velvetTex} roughness={0.9} />
      </mesh>
      {/* Armrests */}
      {[-0.42, 0.42].map((x, i) => (
        <mesh key={i} position={[x, 0.45 + steps * 0.2, -0.05]} castShadow>
          <boxGeometry args={[0.06, 0.15, 0.45]} />
          <meshStandardMaterial map={woodTex} roughness={0.75} />
        </mesh>
      ))}

      {/* Desk with wood texture */}
      <mesh position={[0, 0.35 + steps * 0.2, 0.8]} castShadow>
        <boxGeometry args={[1.6, 0.6, 0.4]} />
        <meshStandardMaterial map={woodTex} roughness={0.75} />
      </mesh>
      {/* Gold trim on desk */}
      <mesh position={[0, 0.66 + steps * 0.2, 0.8]}>
        <boxGeometry args={[1.62, 0.02, 0.42]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} transparent opacity={0.2} />
      </mesh>

      {/* Symbol on desk */}
      <Text
        position={[0, 0.35 + steps * 0.2, 1.02]}
        fontSize={0.12}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        {symbol}
      </Text>

      {/* Candelabrum */}
      <group position={[0.5, 0.7 + steps * 0.2, 0.8]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.06, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
        </mesh>
        {[-0.05, 0, 0.05].map((x, i) => (
          <group key={i} position={[x, 0.15, 0]}>
            <mesh position={[0, 0.05, 0]} castShadow>
              <cylinderGeometry args={[0.01, 0.01, 0.08, 8]} />
              <meshStandardMaterial color="#faf5e8" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <coneGeometry args={[0.008, 0.03, 8]} />
              <meshBasicMaterial color="#ffcc44" />
            </mesh>
            <pointLight position={[0, 0.12, 0]} intensity={0.15} color="#ff8800" distance={1.5} />
          </group>
        ))}
      </group>

      {/* Jewels */}
      {name === 'throne-1v' && (
        <mesh position={[-0.5, 0.75 + steps * 0.2, 0.8]} castShadow>
          <dodecahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial color="#808080" roughness={0.9} />
        </mesh>
      )}
      {name === 'throne-2v' && (
        <mesh position={[-0.5, 0.75 + steps * 0.2, 0.8]} castShadow>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="#b0b0b0" roughness={0.3} metalness={0.1} />
        </mesh>
      )}

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
      {/* 1º Vigilante - Ocidente (West), centralizado, olhando para o Oriente */}
      <VigilanteThrone
        position={[0, 0, 10]}
        title="1º Vigilante"
        name="throne-1v"
        steps={2}
        rotation={Math.PI}
        symbol="⊥"
      />
      {/* 2º Vigilante - Sul (South), meio da coluna, olhando para o Norte */}
      <VigilanteThrone
        position={[5.8, 0, 0]}
        title="2º Vigilante"
        name="throne-2v"
        steps={1}
        rotation={-Math.PI / 2}
        symbol="↓"
      />
    </group>
  );
}
