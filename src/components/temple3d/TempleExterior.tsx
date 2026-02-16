import { useMemo } from 'react';
import * as THREE from 'three';

interface TempleExteriorProps {
  showCeiling: boolean;
}

function ProceduralTree({ position, scale = 1, type = 'deciduous' }: { position: [number, number, number]; scale?: number; type?: 'deciduous' | 'palm' | 'cypress' }) {
  const trunkColor = type === 'palm' ? '#6B4226' : '#3a2515';
  
  if (type === 'palm') {
    return (
      <group position={position} scale={scale}>
        {/* Palm trunk - slightly curved */}
        <mesh position={[0, 3, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.25, 6, 8]} />
          <meshStandardMaterial color={trunkColor} roughness={0.9} />
        </mesh>
        {/* Trunk rings */}
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={[0, 0.5 + i * 0.45, 0]}>
            <torusGeometry args={[0.2 - i * 0.004, 0.02, 4, 12]} />
            <meshStandardMaterial color="#5a3820" roughness={0.85} />
          </mesh>
        ))}
        {/* Palm fronds */}
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const droop = 0.4 + Math.random() * 0.3;
          return (
            <group key={`frond-${i}`} position={[0, 6, 0]} rotation={[droop, angle, 0]}>
              <mesh position={[0, 0, 1.5]} rotation={[0.3, 0, 0]}>
                <boxGeometry args={[0.08, 0.02, 3]} />
                <meshStandardMaterial color="#2d5a1e" roughness={0.7} />
              </mesh>
              {/* Leaf blades */}
              {Array.from({ length: 6 }, (_, j) => (
                <mesh key={j} position={[0, 0, 0.5 + j * 0.45]} rotation={[0.2, (j % 2 === 0 ? 0.3 : -0.3), 0]}>
                  <boxGeometry args={[0.6 - j * 0.06, 0.01, 0.35]} />
                  <meshStandardMaterial color={j % 2 === 0 ? '#3a7a28' : '#2d6420'} roughness={0.6} />
                </mesh>
              ))}
            </group>
          );
        })}
        {/* Coconuts */}
        {[0.15, -0.1, 0.05].map((x, i) => (
          <mesh key={`coco-${i}`} position={[x, 5.8, (i - 1) * 0.15]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#5a4020" roughness={0.8} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === 'cypress') {
    return (
      <group position={position} scale={scale}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.15, 3, 6]} />
          <meshStandardMaterial color={trunkColor} roughness={0.9} />
        </mesh>
        <mesh position={[0, 5, 0]} castShadow>
          <coneGeometry args={[0.8, 6, 8]} />
          <meshStandardMaterial color="#1a4a12" roughness={0.7} />
        </mesh>
        <mesh position={[0, 4.5, 0]} castShadow>
          <coneGeometry args={[0.9, 5, 8]} />
          <meshStandardMaterial color="#1e5515" roughness={0.65} />
        </mesh>
      </group>
    );
  }

  // Deciduous tree
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 4, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>
      {/* Canopy layers */}
      <mesh position={[0, 5, 0]} castShadow>
        <sphereGeometry args={[1.8, 8, 8]} />
        <meshStandardMaterial color="#2d6a1e" roughness={0.7} />
      </mesh>
      <mesh position={[0.5, 5.5, 0.3]} castShadow>
        <sphereGeometry args={[1.2, 8, 8]} />
        <meshStandardMaterial color="#357a25" roughness={0.65} />
      </mesh>
      <mesh position={[-0.4, 4.8, -0.3]} castShadow>
        <sphereGeometry args={[1.4, 8, 8]} />
        <meshStandardMaterial color="#28601a" roughness={0.72} />
      </mesh>
    </group>
  );
}

function Bush({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.6, 8, 6]} />
        <meshStandardMaterial color="#2a5a18" roughness={0.75} />
      </mesh>
      <mesh position={[0.3, 0.35, 0.2]} castShadow>
        <sphereGeometry args={[0.45, 8, 6]} />
        <meshStandardMaterial color="#326a20" roughness={0.7} />
      </mesh>
    </group>
  );
}

function FlowerBed({ position, length }: { position: [number, number, number]; length: number }) {
  return (
    <group position={position}>
      {/* Bed border */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.2, 0.2, length]} />
        <meshStandardMaterial color="#5a4030" roughness={0.85} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[1, 0.05, length - 0.1]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
      </mesh>
      {/* Small plants */}
      {Array.from({ length: Math.floor(length / 1.2) }, (_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 0.6, 0.4, -length / 2 + 0.6 + i * 1.2]}>
          <sphereGeometry args={[0.2 + Math.random() * 0.15, 6, 6]} />
          <meshStandardMaterial color={i % 3 === 0 ? '#8B2252' : i % 3 === 1 ? '#FF6B35' : '#2d6a1e'} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export function TempleExterior({ showCeiling }: TempleExteriorProps) {
  const roomWidth = 16;
  const roomLength = 28;
  const wallHeight = 8;

  // Grass texture
  const grassTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base green
    ctx.fillStyle = '#2a5a18';
    ctx.fillRect(0, 0, 512, 512);

    // Grass blades variation
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const green = 40 + Math.floor(Math.random() * 60);
      ctx.fillStyle = `rgba(${20 + Math.random() * 30}, ${green + Math.random() * 40}, ${10 + Math.random() * 20}, 0.3)`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 3 + Math.random() * 5);
    }

    // Some darker patches
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 15 + Math.random() * 30;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(20, 50, 10, 0.2)');
      grad.addColorStop(1, 'rgba(20, 50, 10, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    return texture;
  }, []);

  // Pathway texture
  const pathTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#8a7a65';
    ctx.fillRect(0, 0, 256, 256);
    // Cobblestone pattern
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const w = 15 + Math.random() * 25;
      const h = 12 + Math.random() * 20;
      const brightness = 0.6 + Math.random() * 0.3;
      ctx.fillStyle = `rgb(${Math.floor(160 * brightness)}, ${Math.floor(145 * brightness)}, ${Math.floor(120 * brightness)})`;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 2);
    return texture;
  }, []);

  // Roof tile texture
  const roofTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#6a3a2a';
    ctx.fillRect(0, 0, 512, 256);
    const tileH = 20;
    const tileW = 30;
    for (let row = 0; row < 256 / tileH; row++) {
      const offset = row % 2 === 0 ? 0 : tileW / 2;
      for (let col = -1; col < 512 / tileW + 1; col++) {
        const x = col * tileW + offset;
        const y = row * tileH;
        const b = 0.7 + Math.random() * 0.3;
        ctx.fillStyle = `rgb(${Math.floor(110 * b)}, ${Math.floor(55 * b)}, ${Math.floor(35 * b)})`;
        ctx.beginPath();
        ctx.ellipse(x + tileW / 2, y + tileH, tileW / 2, tileH / 1.5, 0, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    return texture;
  }, []);

  return (
    <group>
      {/* === LARGE GREEN GROUND PLANE === */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial map={grassTexture} roughness={0.85} />
      </mesh>

      {/* === COBBLESTONE PATH TO ENTRANCE === */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, roomLength / 2 + 15]}>
        <planeGeometry args={[4, 26]} />
        <meshStandardMaterial map={pathTexture} roughness={0.8} />
      </mesh>

      {/* === EXTERIOR BUILDING STRUCTURE === */}
      {/* Exterior walls - stucco/painted masonry */}
      {/* Front facade (West - entrance side) */}
      <mesh position={[0, wallHeight / 2, roomLength / 2 + 0.3]} castShadow>
        <boxGeometry args={[roomWidth + 1.5, wallHeight + 1, 0.5]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.8} />
      </mesh>
      {/* Back (East) */}
      <mesh position={[0, wallHeight / 2, -roomLength / 2 - 0.3]} castShadow>
        <boxGeometry args={[roomWidth + 1.5, wallHeight + 1, 0.5]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.8} />
      </mesh>
      {/* North exterior */}
      <mesh position={[-roomWidth / 2 - 0.5, wallHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.5, wallHeight + 1, roomLength + 1]} />
        <meshStandardMaterial color="#ddd0bc" roughness={0.8} />
      </mesh>
      {/* South exterior */}
      <mesh position={[roomWidth / 2 + 0.5, wallHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.5, wallHeight + 1, roomLength + 1]} />
        <meshStandardMaterial color="#ddd0bc" roughness={0.8} />
      </mesh>

      {/* Corner pilasters - classical style */}
      {[
        [-roomWidth / 2 - 0.5, roomLength / 2 + 0.3],
        [roomWidth / 2 + 0.5, roomLength / 2 + 0.3],
        [-roomWidth / 2 - 0.5, -roomLength / 2 - 0.3],
        [roomWidth / 2 + 0.5, -roomLength / 2 - 0.3],
      ].map(([x, z], i) => (
        <group key={`corner-${i}`}>
          <mesh position={[x, wallHeight / 2, z]} castShadow>
            <boxGeometry args={[1, wallHeight + 1.5, 1]} />
            <meshStandardMaterial color="#d4c8b0" roughness={0.7} />
          </mesh>
          {/* Capital */}
          <mesh position={[x, wallHeight + 0.8, z]}>
            <boxGeometry args={[1.3, 0.4, 1.3]} />
            <meshStandardMaterial color="#e0d4bc" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Front entrance portico columns */}
      {[-3, 3].map((x, i) => (
        <group key={`portico-${i}`}>
          <mesh position={[x, wallHeight / 2 - 0.5, roomLength / 2 + 2.5]} castShadow>
            <cylinderGeometry args={[0.35, 0.4, wallHeight - 1, 12]} />
            <meshStandardMaterial color="#e0d4bc" roughness={0.5} />
          </mesh>
          {/* Column capital */}
          <mesh position={[x, wallHeight - 0.5, roomLength / 2 + 2.5]}>
            <boxGeometry args={[0.9, 0.5, 0.9]} />
            <meshStandardMaterial color="#e8dcc8" roughness={0.5} />
          </mesh>
          {/* Column base */}
          <mesh position={[x, 0.15, roomLength / 2 + 2.5]}>
            <boxGeometry args={[0.9, 0.3, 0.9]} />
            <meshStandardMaterial color="#d4c8b0" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Portico pediment / entablature */}
      <mesh position={[0, wallHeight, roomLength / 2 + 2.5]} castShadow>
        <boxGeometry args={[8, 0.5, 1.2]} />
        <meshStandardMaterial color="#e0d4bc" roughness={0.6} />
      </mesh>
      {/* Triangular pediment */}
      <mesh position={[0, wallHeight + 1, roomLength / 2 + 2.5]} castShadow>
        <coneGeometry args={[4.5, 1.5, 3]} />
        <meshStandardMaterial color="#e0d4bc" roughness={0.6} />
      </mesh>

      {/* === LARGE MASONIC SYMBOL (Esquadro e Compasso) on front facade === */}
      <group position={[0, wallHeight / 2 + 1.5, roomLength / 2 + 0.6]}>
        {/* Circular background medallion */}
        <mesh>
          <cylinderGeometry args={[2.2, 2.2, 0.08, 32]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Gold ring border */}
        <mesh position={[0, 0, 0.04]}>
          <torusGeometry args={[2.2, 0.1, 8, 32]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <torusGeometry args={[1.9, 0.05, 8, 32]} />
          <meshStandardMaterial color="#c9a227" roughness={0.25} metalness={0.8} />
        </mesh>

        {/* Compasses - two arms forming a V (top) */}
        <mesh position={[-0.55, -0.15, 0.08]} rotation={[Math.PI / 2, 0, 0.38]}>
          <boxGeometry args={[2.4, 0.1, 0.12]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[0.55, -0.15, 0.08]} rotation={[Math.PI / 2, 0, -0.38]}>
          <boxGeometry args={[2.4, 0.1, 0.12]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        {/* Compass hinge */}
        <mesh position={[0, 0.95, 0.1]}>
          <cylinderGeometry args={[0.12, 0.12, 0.15, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        {/* Compass tips */}
        <mesh position={[-1.15, -1.1, 0.08]} rotation={[Math.PI / 2, 0, 0.38]}>
          <coneGeometry args={[0.08, 0.25, 8]} />
          <meshStandardMaterial color="#c9a227" roughness={0.2} metalness={0.85} />
        </mesh>
        <mesh position={[1.15, -1.1, 0.08]} rotation={[Math.PI / 2, 0, -0.38]}>
          <coneGeometry args={[0.08, 0.25, 8]} />
          <meshStandardMaterial color="#c9a227" roughness={0.2} metalness={0.85} />
        </mesh>

        {/* Square (Esquadro) - L shape, overlapping under compasses */}
        {/* Vertical arm of square */}
        <mesh position={[0, -0.2, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.12, 0.1, 1.6]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        {/* Horizontal arm of square */}
        <mesh position={[0.55, -0.95, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[1.2, 0.1, 0.12]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} />
        </mesh>
        {/* Square corner reinforcement */}
        <mesh position={[0, -0.95, 0.08]}>
          <cylinderGeometry args={[0.1, 0.1, 0.12, 12]} />
          <meshStandardMaterial color="#c9a227" roughness={0.2} metalness={0.85} />
        </mesh>

        {/* Letter "G" in center */}
        <mesh position={[0, 0.05, 0.12]}>
          <torusGeometry args={[0.35, 0.06, 8, 24, Math.PI * 1.7]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} emissive="#ff9900" emissiveIntensity={0.2} />
        </mesh>
        {/* G crossbar */}
        <mesh position={[0.18, 0.05, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.25, 0.1, 0.06]} />
          <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.9} emissive="#ff9900" emissiveIntensity={0.2} />
        </mesh>

        {/* Glow light behind the symbol */}
        <pointLight position={[0, 0, 0.5]} intensity={0.8} color="#ffd700" distance={6} />
      </group>

      {/* Portico steps */}
      {[0, 1, 2].map((step) => (
        <mesh key={`step-${step}`} position={[0, step * 0.15, roomLength / 2 + 3.5 + step * 0.5]} castShadow receiveShadow>
          <boxGeometry args={[7, 0.15, 1]} />
          <meshStandardMaterial color="#c8bca8" roughness={0.7} />
        </mesh>
      ))}

      {/* === ROOF / CEILING === */}
      {showCeiling && (
        <group>
          {/* Main roof ridge */}
          <mesh position={[0, wallHeight + 2.5, 0]} castShadow>
            <boxGeometry args={[roomWidth + 3, 0.3, roomLength + 2]} />
            <meshStandardMaterial map={roofTexture} roughness={0.75} />
          </mesh>
          {/* Roof slopes - North */}
          <mesh position={[-roomWidth / 2 - 0.5, wallHeight + 1.2, 0]} rotation={[0, 0, 0.35]} castShadow>
            <boxGeometry args={[4, 0.15, roomLength + 2]} />
            <meshStandardMaterial map={roofTexture} roughness={0.75} />
          </mesh>
          {/* Roof slopes - South */}
          <mesh position={[roomWidth / 2 + 0.5, wallHeight + 1.2, 0]} rotation={[0, 0, -0.35]} castShadow>
            <boxGeometry args={[4, 0.15, roomLength + 2]} />
            <meshStandardMaterial map={roofTexture} roughness={0.75} />
          </mesh>
          {/* Interior ceiling - flat */}
          <mesh position={[0, wallHeight + 0.2, 0]}>
            <boxGeometry args={[roomWidth - 0.5, 0.15, roomLength - 0.5]} />
            <meshStandardMaterial color="#f5f0e5" roughness={0.6} />
          </mesh>
          {/* Ceiling molding trim */}
          <mesh position={[0, wallHeight + 0.1, 0]}>
            <boxGeometry args={[roomWidth + 0.2, 0.08, roomLength + 0.2]} />
            <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.5} />
          </mesh>
        </group>
      )}

      {/* === ENTRANCE AREA ROOF === */}
      <mesh position={[0, 4.2, roomLength / 2 + 8]} castShadow>
        <boxGeometry args={[roomWidth + 1.5, 0.15, 8.5]} />
        <meshStandardMaterial map={roofTexture} roughness={0.75} />
      </mesh>

      {/* === LANDSCAPING === */}
      {/* Palm trees - flanking entrance */}
      <ProceduralTree position={[-6, 0, roomLength / 2 + 8]} scale={1.1} type="palm" />
      <ProceduralTree position={[6, 0, roomLength / 2 + 8]} scale={1} type="palm" />
      <ProceduralTree position={[-10, 0, roomLength / 2 + 15]} scale={0.9} type="palm" />
      <ProceduralTree position={[10, 0, roomLength / 2 + 15]} scale={1.05} type="palm" />

      {/* Deciduous trees - around building */}
      <ProceduralTree position={[-14, 0, -8]} scale={1.2} type="deciduous" />
      <ProceduralTree position={[14, 0, -5]} scale={1} type="deciduous" />
      <ProceduralTree position={[-15, 0, 8]} scale={0.9} type="deciduous" />
      <ProceduralTree position={[15, 0, 10]} scale={1.1} type="deciduous" />
      <ProceduralTree position={[-12, 0, -18]} scale={1.3} type="deciduous" />
      <ProceduralTree position={[13, 0, -16]} scale={1.15} type="deciduous" />

      {/* Cypress trees - flanking sides */}
      <ProceduralTree position={[-11, 0, -12]} scale={0.8} type="cypress" />
      <ProceduralTree position={[11, 0, -12]} scale={0.85} type="cypress" />
      <ProceduralTree position={[-11, 0, 4]} scale={0.75} type="cypress" />
      <ProceduralTree position={[11, 0, 4]} scale={0.8} type="cypress" />

      {/* Bushes along the building */}
      {[-6, -3, 0, 3, 6].map((x, i) => (
        <Bush key={`bush-n-${i}`} position={[-roomWidth / 2 - 1.5, 0, x]} scale={0.7 + Math.random() * 0.4} />
      ))}
      {[-6, -3, 0, 3, 6].map((x, i) => (
        <Bush key={`bush-s-${i}`} position={[roomWidth / 2 + 1.5, 0, x]} scale={0.7 + Math.random() * 0.4} />
      ))}

      {/* Flower beds along entrance path */}
      <FlowerBed position={[-3, 0, roomLength / 2 + 15]} length={10} />
      <FlowerBed position={[3, 0, roomLength / 2 + 15]} length={10} />

      {/* Garden benches */}
      {[[-5, roomLength / 2 + 6], [5, roomLength / 2 + 6]].map(([x, z], i) => (
        <group key={`gbench-${i}`} position={[x, 0, z]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[1.5, 0.08, 0.5]} />
            <meshStandardMaterial color="#5a3a20" roughness={0.8} />
          </mesh>
          <mesh position={[-0.6, 0.15, 0]}>
            <boxGeometry args={[0.08, 0.3, 0.4]} />
            <meshStandardMaterial color="#4a3018" roughness={0.85} />
          </mesh>
          <mesh position={[0.6, 0.15, 0]}>
            <boxGeometry args={[0.08, 0.3, 0.4]} />
            <meshStandardMaterial color="#4a3018" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Exterior lighting - lamp posts */}
      {[[-4, roomLength / 2 + 5], [4, roomLength / 2 + 5]].map(([x, z], i) => (
        <group key={`lamp-${i}`} position={[x, 0, z]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 3, 6]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#fff8e0" emissive="#ffcc44" emissiveIntensity={0.5} transparent opacity={0.8} />
          </mesh>
          <pointLight position={[0, 3.2, 0]} intensity={0.5} color="#ffcc44" distance={8} />
        </group>
      ))}

      {/* Exterior sunlight */}
      <directionalLight position={[20, 30, 15]} intensity={0.4} color="#fff5e0" />
    </group>
  );
}
