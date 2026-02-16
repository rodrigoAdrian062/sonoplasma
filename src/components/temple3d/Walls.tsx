import { Text, useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

export function Walls() {
  const emblemTexture = useTexture('/images/brasao-loja.png');
  const wallHeight = 8;
  const roomWidth = 16;
  const roomLength = 28;

  // Create wall texture with subtle pattern
  const wallTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base color with subtle gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#6ca8d0');
    grad.addColorStop(0.5, '#5a9bc5');
    grad.addColorStop(1, '#4a8ab5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle wainscoting / panel lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    for (let x = 0; x < canvas.width; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    return texture;
  }, []);

  return (
    <group>
      {/* East Wall (behind VM) */}
      <mesh position={[0, wallHeight / 2, -roomLength / 2]} castShadow receiveShadow>
        <boxGeometry args={[roomWidth, wallHeight, 0.3]} />
        <meshStandardMaterial map={wallTexture} roughness={0.7} />
      </mesh>

      {/* Red backdrop behind altar - velvet-like */}
      <mesh position={[0, wallHeight / 2 + 0.5, -roomLength / 2 + 0.2]}>
        <boxGeometry args={[4, 3, 0.1]} />
        <meshStandardMaterial color="#6B0000" roughness={0.9} />
      </mesh>
      {/* Gold border around backdrop */}
      <mesh position={[0, wallHeight / 2 + 0.5, -roomLength / 2 + 0.22]}>
        <boxGeometry args={[4.1, 3.1, 0.01]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} transparent opacity={0.3} />
      </mesh>

      {/* Delta/Triangle with All-Seeing Eye on East Wall */}
      <group position={[0, wallHeight / 2 + 1.5, -roomLength / 2 + 0.3]}>
        {/* Triangle background */}
        <mesh>
          <coneGeometry args={[1.5, 2.2, 3]} />
          <meshStandardMaterial 
            color="#d4af37" 
            roughness={0.25} 
            metalness={0.8}
          />
        </mesh>
        {/* Radiating light rays */}
        {Array.from({ length: 16 }, (_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const len = i % 2 === 0 ? 0.6 : 0.35;
          return (
            <mesh 
              key={i} 
              position={[Math.cos(angle) * 2, Math.sin(angle) * 2 - 0.3, -0.1]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[len, 0.06, 0.02]} />
              <meshStandardMaterial 
                color="#ffd700" 
                emissive="#ff9900"
                emissiveIntensity={0.5}
              />
            </mesh>
          );
        })}
        {/* Eye - white sclera */}
        <mesh position={[0, -0.3, 0.15]}>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial 
            color="#ffffff" 
            emissive="#ffd700"
            emissiveIntensity={0.5}
          />
        </mesh>
        {/* Eye - iris */}
        <mesh position={[0, -0.3, 0.45]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Eye glow */}
        <pointLight position={[0, -0.3, 0.5]} intensity={1.2} color="#ffd700" distance={6} />
        
        <Text
          position={[0, -1.5, 0.2]}
          fontSize={0.15}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          Delta Luminoso
        </Text>
      </group>

      {/* Lodge Emblem on NORTH Wall */}
      <mesh position={[-roomWidth / 2 + 0.25, wallHeight / 2, -5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial 
          map={emblemTexture} 
          transparent 
          roughness={0.5}
        />
      </mesh>

      {/* Lodge Emblem on SOUTH Wall */}
      <mesh position={[roomWidth / 2 - 0.25, wallHeight / 2, -5]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial 
          map={emblemTexture} 
          transparent 
          roughness={0.5}
        />
      </mesh>

      {/* West Wall */}
      <mesh position={[0, wallHeight / 2, roomLength / 2]} castShadow receiveShadow>
        <boxGeometry args={[roomWidth, wallHeight, 0.3]} />
        <meshStandardMaterial map={wallTexture} roughness={0.7} />
      </mesh>

      {/* Door frame on West Wall - enhanced */}
      <mesh position={[0, 2.5, roomLength / 2 - 0.1]}>
        <boxGeometry args={[3, 5, 0.2]} />
        <meshStandardMaterial color="#3a2515" roughness={0.8} />
      </mesh>
      {/* Door panels */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 2.5, roomLength / 2 - 0.02]}>
          <boxGeometry args={[1.2, 4.5, 0.05]} />
          <meshStandardMaterial color="#2a1810" roughness={0.7} />
        </mesh>
      ))}
      {/* Door handle */}
      <mesh position={[-0.15, 2.5, roomLength / 2 + 0.05]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0.15, 2.5, roomLength / 2 + 0.05]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* North Wall */}
      <mesh position={[-roomWidth / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, wallHeight, roomLength]} />
        <meshStandardMaterial map={wallTexture} roughness={0.7} />
      </mesh>

      {/* South Wall */}
      <mesh position={[roomWidth / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, wallHeight, roomLength]} />
        <meshStandardMaterial map={wallTexture} roughness={0.7} />
      </mesh>

      {/* Lower wainscoting (dark wood panels) */}
      {/* North */}
      <mesh position={[-roomWidth / 2 + 0.2, 1.2, 0]}>
        <boxGeometry args={[0.1, 2.4, roomLength - 0.5]} />
        <meshStandardMaterial color="#2a1810" roughness={0.8} />
      </mesh>
      {/* South */}
      <mesh position={[roomWidth / 2 - 0.2, 1.2, 0]}>
        <boxGeometry args={[0.1, 2.4, roomLength - 0.5]} />
        <meshStandardMaterial color="#2a1810" roughness={0.8} />
      </mesh>
      {/* East */}
      <mesh position={[0, 1.2, -roomLength / 2 + 0.2]}>
        <boxGeometry args={[roomWidth - 0.5, 2.4, 0.1]} />
        <meshStandardMaterial color="#2a1810" roughness={0.8} />
      </mesh>
      {/* West */}
      <mesh position={[0, 1.2, roomLength / 2 - 0.2]}>
        <boxGeometry args={[roomWidth - 0.5, 2.4, 0.1]} />
        <meshStandardMaterial color="#2a1810" roughness={0.8} />
      </mesh>

      {/* White decorative molding on top of walls */}
      {[
        { pos: [0, wallHeight, -roomLength / 2], size: [roomWidth + 0.5, 0.4, 0.6] },
        { pos: [0, wallHeight, roomLength / 2], size: [roomWidth + 0.5, 0.4, 0.6] },
        { pos: [-roomWidth / 2, wallHeight, 0], size: [0.6, 0.4, roomLength] },
        { pos: [roomWidth / 2, wallHeight, 0], size: [0.6, 0.4, roomLength] },
      ].map((molding, i) => (
        <mesh key={i} position={molding.pos as [number, number, number]}>
          <boxGeometry args={molding.size as [number, number, number]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.4} />
        </mesh>
      ))}

      {/* Gold trim below molding */}
      {[
        { pos: [0, wallHeight - 0.3, -roomLength / 2 + 0.2], size: [roomWidth, 0.15, 0.1] },
        { pos: [0, wallHeight - 0.3, roomLength / 2 - 0.2], size: [roomWidth, 0.15, 0.1] },
        { pos: [-roomWidth / 2 + 0.2, wallHeight - 0.3, 0], size: [0.1, 0.15, roomLength] },
        { pos: [roomWidth / 2 - 0.2, wallHeight - 0.3, 0], size: [0.1, 0.15, roomLength] },
      ].map((trim, i) => (
        <mesh key={`trim-${i}`} position={trim.pos as [number, number, number]}>
          <boxGeometry args={trim.size as [number, number, number]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
      ))}

      {/* Gold trim at wainscoting top */}
      {[
        { pos: [-roomWidth / 2 + 0.22, 2.42, 0], size: [0.08, 0.06, roomLength - 0.5] },
        { pos: [roomWidth / 2 - 0.22, 2.42, 0], size: [0.08, 0.06, roomLength - 0.5] },
        { pos: [0, 2.42, -roomLength / 2 + 0.22], size: [roomWidth - 0.5, 0.06, 0.08] },
        { pos: [0, 2.42, roomLength / 2 - 0.22], size: [roomWidth - 0.5, 0.06, 0.08] },
      ].map((trim, i) => (
        <mesh key={`wains-trim-${i}`} position={trim.pos as [number, number, number]}>
          <boxGeometry args={trim.size as [number, number, number]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
      ))}

      {/* Decorative gold pilasters on walls */}
      {[-8, -4, 0, 4, 8].map((z, i) => (
        <group key={`decor-${i}`}>
          {/* North wall pilaster */}
          <mesh position={[-roomWidth / 2 + 0.2, wallHeight / 2, z]}>
            <boxGeometry args={[0.12, wallHeight - 2.5, 0.6]} />
            <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* South wall pilaster */}
          <mesh position={[roomWidth / 2 - 0.2, wallHeight / 2, z]}>
            <boxGeometry args={[0.12, wallHeight - 2.5, 0.6]} />
            <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
