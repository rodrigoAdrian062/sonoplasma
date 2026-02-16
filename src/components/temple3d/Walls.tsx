import { Text, useTexture } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function AllSeeingEye({ position }: { position: [number, number, number] }) {
  const irisRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  // Create iris texture procedurally
  const irisTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const cx = 128, cy = 128;

    // Deep blue-gold iris
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 128);
    grad.addColorStop(0, '#111111');
    grad.addColorStop(0.25, '#1a1a2e');
    grad.addColorStop(0.5, '#2a6496');
    grad.addColorStop(0.75, '#c9a227');
    grad.addColorStop(1, '#8B6914');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Radial fibers
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 20, cy + Math.sin(angle) * 20);
      ctx.lineTo(cx + Math.cos(angle) * 120, cy + Math.sin(angle) * 120);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Subtle pulsing glow
    if (glowRef.current) {
      glowRef.current.intensity = 1.5 + Math.sin(t * 2) * 0.4;
    }
  });

  return (
    <group position={position}>
      {/* Eye shape - almond/lenticular using scaled sphere */}
      {/* Sclera (white) */}
      <mesh scale={[1.4, 0.6, 0.5]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color="#f5f0e0"
          emissive="#ffd700"
          emissiveIntensity={0.15}
          roughness={0.3}
        />
      </mesh>

      {/* Upper eyelid */}
      <mesh position={[0, 0.12, 0.05]} scale={[1.5, 0.4, 0.55]} rotation={[0.15, 0, 0]}>
        <sphereGeometry args={[0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Lower eyelid */}
      <mesh position={[0, -0.12, 0.05]} scale={[1.5, 0.35, 0.55]} rotation={[-0.15, 0, Math.PI]}>
        <sphereGeometry args={[0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Iris */}
      <mesh ref={irisRef} position={[0, 0, 0.16]}>
        <circleGeometry args={[0.14, 32]} />
        <meshStandardMaterial
          map={irisTexture}
          emissive="#d4af37"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Pupil */}
      <mesh position={[0, 0, 0.165]}>
        <circleGeometry args={[0.055, 32]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Pupil highlight / reflection */}
      <mesh position={[0.025, 0.02, 0.17]}>
        <circleGeometry args={[0.018, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
      </mesh>

      {/* Divine glow from eye */}
      <pointLight ref={glowRef} position={[0, 0, 0.3]} intensity={1.5} color="#ffd700" distance={6} />
    </group>
  );
}

interface WallsProps {
  showSouthWall?: boolean;
}

export function Walls({ showSouthWall = true }: WallsProps) {
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
        {/* === ALL-SEEING EYE (Olho que Tudo Vê) === */}
        <AllSeeingEye position={[0, -0.3, 0.15]} />
        
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
      {showSouthWall && (
        <mesh position={[roomWidth / 2 - 0.25, wallHeight / 2, -5]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[2.5, 2.5]} />
          <meshStandardMaterial map={emblemTexture} transparent roughness={0.5} />
        </mesh>
      )}

      {/* West Wall - split for grand door opening */}
      <mesh position={[-(roomWidth / 2 + 2.5) / 2, wallHeight / 2, roomLength / 2]} castShadow receiveShadow>
        <boxGeometry args={[(roomWidth / 2 - 2.5), wallHeight, 0.3]} />
        <meshStandardMaterial map={wallTexture} roughness={0.7} />
      </mesh>
      <mesh position={[(roomWidth / 2 + 2.5) / 2, wallHeight / 2, roomLength / 2]} castShadow receiveShadow>
        <boxGeometry args={[(roomWidth / 2 - 2.5), wallHeight, 0.3]} />
        <meshStandardMaterial map={wallTexture} roughness={0.7} />
      </mesh>
      <mesh position={[0, wallHeight - 0.5, roomLength / 2]} castShadow receiveShadow>
        <boxGeometry args={[5.2, 1, 0.3]} />
        <meshStandardMaterial map={wallTexture} roughness={0.7} />
      </mesh>

      {/* === GRAND DOOR FRAME === */}
      <mesh position={[-2.6, wallHeight / 2 - 0.5, roomLength / 2]} castShadow>
        <boxGeometry args={[0.3, wallHeight - 1, 0.4]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.75} />
      </mesh>
      <mesh position={[2.6, wallHeight / 2 - 0.5, roomLength / 2]} castShadow>
        <boxGeometry args={[0.3, wallHeight - 1, 0.4]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.75} />
      </mesh>
      <mesh position={[-2.42, wallHeight / 2 - 0.5, roomLength / 2 + 0.15]}>
        <boxGeometry args={[0.06, wallHeight - 1.2, 0.06]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
      </mesh>
      <mesh position={[2.42, wallHeight / 2 - 0.5, roomLength / 2 + 0.15]}>
        <boxGeometry args={[0.06, wallHeight - 1.2, 0.06]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
      </mesh>
      <mesh position={[0, wallHeight - 1, roomLength / 2]} castShadow>
        <boxGeometry args={[5.5, 0.4, 0.42]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.75} />
      </mesh>
      <mesh position={[0, wallHeight - 1.22, roomLength / 2 + 0.18]}>
        <boxGeometry args={[5.3, 0.1, 0.05]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
      </mesh>
      <mesh position={[0, wallHeight - 0.78, roomLength / 2 + 0.18]}>
        <boxGeometry args={[5.3, 0.06, 0.05]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
      </mesh>
      <mesh position={[0, wallHeight - 0.55, roomLength / 2 + 0.2]}>
        <boxGeometry args={[5.8, 0.15, 0.08]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
      </mesh>

      {/* === CLOSED DOOR - Left leaf === */}
      <group position={[-1.2, (wallHeight - 1.4) / 2, roomLength / 2 + 0.12]}>
        <mesh castShadow>
          <boxGeometry args={[2.3, wallHeight - 1.8, 0.12]} />
          <meshStandardMaterial color="#2a1508" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.065]}>
          <boxGeometry args={[2.1, wallHeight - 2.1, 0.02]} />
          <meshStandardMaterial color="#3a2010" roughness={0.55} />
        </mesh>
        {[1.8, -0.2, -2].map((py, pi) => (
          <group key={`lp-${pi}`}>
            <mesh position={[0, py, 0.07]}>
              <boxGeometry args={[1.6, pi === 0 ? 1.8 : 1.4, 0.03]} />
              <meshStandardMaterial color="#1e0e05" roughness={0.7} />
            </mesh>
            <mesh position={[0, py + (pi === 0 ? 0.92 : 0.72), 0.085]}>
              <boxGeometry args={[1.7, 0.04, 0.01]} />
              <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
            </mesh>
            <mesh position={[0, py - (pi === 0 ? 0.92 : 0.72), 0.085]}>
              <boxGeometry args={[1.7, 0.04, 0.01]} />
              <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
            </mesh>
            <mesh position={[-0.82, py, 0.085]}>
              <boxGeometry args={[0.04, pi === 0 ? 1.88 : 1.48, 0.01]} />
              <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
            </mesh>
            <mesh position={[0.82, py, 0.085]}>
              <boxGeometry args={[0.04, pi === 0 ? 1.88 : 1.48, 0.01]} />
              <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
            </mesh>
          </group>
        ))}
        <mesh position={[1, 0, 0.1]}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[1, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[1, 0, 0.08]}>
          <boxGeometry args={[0.18, 0.3, 0.02]} />
          <meshStandardMaterial color="#c9a227" roughness={0.2} metalness={0.85} />
        </mesh>
        <mesh position={[0.5, 0.8, 0.1]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#c9a227" roughness={0.25} metalness={0.8} />
        </mesh>
        <mesh position={[0.5, 0.55, 0.12]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.1, 0.02, 8, 20]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[0, 2.85, 0.08]}>
          <cylinderGeometry args={[0.12, 0.12, 0.03, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
        </mesh>
        {[-2.5, -0.5, 1.5].map((y, i) => (
          <mesh key={`hl-${i}`} position={[-1.1, y, 0.08]}>
            <boxGeometry args={[0.15, 0.3, 0.04]} />
            <meshStandardMaterial color="#8B7500" roughness={0.3} metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* === CLOSED DOOR - Right leaf === */}
      <group position={[1.2, (wallHeight - 1.4) / 2, roomLength / 2 + 0.12]}>
        <mesh castShadow>
          <boxGeometry args={[2.3, wallHeight - 1.8, 0.12]} />
          <meshStandardMaterial color="#2a1508" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.065]}>
          <boxGeometry args={[2.1, wallHeight - 2.1, 0.02]} />
          <meshStandardMaterial color="#3a2010" roughness={0.55} />
        </mesh>
        {[1.8, -0.2, -2].map((py, pi) => (
          <group key={`rp-${pi}`}>
            <mesh position={[0, py, 0.07]}>
              <boxGeometry args={[1.6, pi === 0 ? 1.8 : 1.4, 0.03]} />
              <meshStandardMaterial color="#1e0e05" roughness={0.7} />
            </mesh>
            <mesh position={[0, py + (pi === 0 ? 0.92 : 0.72), 0.085]}>
              <boxGeometry args={[1.7, 0.04, 0.01]} />
              <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
            </mesh>
            <mesh position={[0, py - (pi === 0 ? 0.92 : 0.72), 0.085]}>
              <boxGeometry args={[1.7, 0.04, 0.01]} />
              <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
            </mesh>
            <mesh position={[-0.82, py, 0.085]}>
              <boxGeometry args={[0.04, pi === 0 ? 1.88 : 1.48, 0.01]} />
              <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
            </mesh>
            <mesh position={[0.82, py, 0.085]}>
              <boxGeometry args={[0.04, pi === 0 ? 1.88 : 1.48, 0.01]} />
              <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
            </mesh>
          </group>
        ))}
        <mesh position={[-1, 0, 0.1]}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[-1, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[-1, 0, 0.08]}>
          <boxGeometry args={[0.18, 0.3, 0.02]} />
          <meshStandardMaterial color="#c9a227" roughness={0.2} metalness={0.85} />
        </mesh>
        <mesh position={[-0.5, 0.8, 0.1]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#c9a227" roughness={0.25} metalness={0.8} />
        </mesh>
        <mesh position={[-0.5, 0.55, 0.12]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.1, 0.02, 8, 20]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[0, 2.85, 0.08]}>
          <cylinderGeometry args={[0.12, 0.12, 0.03, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
        </mesh>
        {[-2.5, -0.5, 1.5].map((y, i) => (
          <mesh key={`hr-${i}`} position={[1.1, y, 0.08]}>
            <boxGeometry args={[0.15, 0.3, 0.04]} />
            <meshStandardMaterial color="#8B7500" roughness={0.3} metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Center seam */}
      <mesh position={[0, (wallHeight - 1.4) / 2, roomLength / 2 + 0.2]}>
        <boxGeometry args={[0.04, wallHeight - 1.8, 0.02]} />
        <meshStandardMaterial color="#1a0e05" roughness={0.8} />
      </mesh>

      {/* === Esquadro e Compasso above door === */}
      <group position={[0, wallHeight - 0.5, roomLength / 2 + 0.22]}>
        <mesh position={[-0.15, -0.05, 0]} rotation={[0, 0, 0.25]}>
          <boxGeometry args={[0.5, 0.04, 0.04]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[0.15, -0.05, 0]} rotation={[0, 0, -0.25]}>
          <boxGeometry args={[0.5, 0.04, 0.04]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[0, -0.15, 0.02]} rotation={[0, 0, Math.PI]}>
          <boxGeometry args={[0.04, 0.3, 0.04]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[0.15, -0.3, 0.02]}>
          <boxGeometry args={[0.35, 0.04, 0.04]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <cylinderGeometry args={[0.08, 0.08, 0.03, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
      </group>

      {/* North Wall */}
      <mesh position={[-roomWidth / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, wallHeight, roomLength]} />
        <meshStandardMaterial map={wallTexture} roughness={0.7} />
      </mesh>

      {/* South Wall - toggleable */}
      {showSouthWall && (
        <mesh position={[roomWidth / 2, wallHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, wallHeight, roomLength]} />
          <meshStandardMaterial map={wallTexture} roughness={0.7} />
        </mesh>
      )}

      {/* Lower wainscoting (dark wood panels) */}
      {/* North */}
      <mesh position={[-roomWidth / 2 + 0.2, 1.2, 0]}>
        <boxGeometry args={[0.1, 2.4, roomLength - 0.5]} />
        <meshStandardMaterial color="#2a1810" roughness={0.8} />
      </mesh>
      {/* South */}
      {showSouthWall && (
        <mesh position={[roomWidth / 2 - 0.2, 1.2, 0]}>
          <boxGeometry args={[0.1, 2.4, roomLength - 0.5]} />
          <meshStandardMaterial color="#2a1810" roughness={0.8} />
        </mesh>
      )}
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
        ...(showSouthWall ? [{ pos: [roomWidth / 2, wallHeight, 0], size: [0.6, 0.4, roomLength] }] : []),
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
        ...(showSouthWall ? [{ pos: [roomWidth / 2 - 0.2, wallHeight - 0.3, 0], size: [0.1, 0.15, roomLength] }] : []),
      ].map((trim, i) => (
        <mesh key={`trim-${i}`} position={trim.pos as [number, number, number]}>
          <boxGeometry args={trim.size as [number, number, number]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
      ))}

      {/* Gold trim at wainscoting top */}
      {[
        { pos: [-roomWidth / 2 + 0.22, 2.42, 0], size: [0.08, 0.06, roomLength - 0.5] },
        ...(showSouthWall ? [{ pos: [roomWidth / 2 - 0.22, 2.42, 0], size: [0.08, 0.06, roomLength - 0.5] }] : []),
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
          <mesh position={[-roomWidth / 2 + 0.2, wallHeight / 2, z]}>
            <boxGeometry args={[0.12, wallHeight - 2.5, 0.6]} />
            <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} />
          </mesh>
          {showSouthWall && (
            <mesh position={[roomWidth / 2 - 0.2, wallHeight / 2, z]}>
              <boxGeometry args={[0.12, wallHeight - 2.5, 0.6]} />
              <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
