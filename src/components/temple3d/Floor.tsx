import { useMemo } from 'react';
import * as THREE from 'three';

interface FloorProps {
  onClick?: () => void;
}

export function Floor({ onClick }: FloorProps) {
  const floorWidth = 16;
  const floorLength = 28;
  const entranceDepth = 8;

  // High-quality marble checkerboard
  const checkerTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const tiles = 8;
    const tilePx = 256;
    canvas.width = tiles * tilePx;
    canvas.height = tiles * tilePx;
    const ctx = canvas.getContext('2d')!;

    const drawMarbleVeins = (x: number, y: number, w: number, h: number, colors: string[], count: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      for (let i = 0; i < count; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.3 + Math.random() * 1.5;
        ctx.globalAlpha = 0.08 + Math.random() * 0.15;
        ctx.beginPath();
        let cx = x + Math.random() * w;
        let cy = y + Math.random() * h;
        ctx.moveTo(cx, cy);
        const segments = 4 + Math.floor(Math.random() * 6);
        for (let j = 0; j < segments; j++) {
          cx += (Math.random() - 0.5) * 80;
          cy += (Math.random() - 0.5) * 80;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    for (let row = 0; row < tiles; row++) {
      for (let col = 0; col < tiles; col++) {
        const x = col * tilePx;
        const y = row * tilePx;
        const isBlack = (row + col) % 2 === 1;

        if (isBlack) {
          // Rich black marble with subtle green-gray veins
          const grad = ctx.createRadialGradient(
            x + tilePx / 2, y + tilePx / 2, 0,
            x + tilePx / 2, y + tilePx / 2, tilePx
          );
          grad.addColorStop(0, '#141414');
          grad.addColorStop(1, '#0e0e0e');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, tilePx, tilePx);
          drawMarbleVeins(x, y, tilePx, tilePx, ['rgba(60,70,60,0.5)', 'rgba(80,80,80,0.4)', 'rgba(50,55,50,0.3)'], 8);
        } else {
          // Carrara white marble with warm gray veins
          const grad = ctx.createRadialGradient(
            x + tilePx / 2, y + tilePx / 2, 0,
            x + tilePx / 2, y + tilePx / 2, tilePx
          );
          grad.addColorStop(0, '#f5f0e8');
          grad.addColorStop(1, '#ece5d8');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, tilePx, tilePx);
          drawMarbleVeins(x, y, tilePx, tilePx, ['rgba(180,170,155,0.35)', 'rgba(160,150,130,0.3)', 'rgba(140,135,120,0.25)'], 10);
        }

        // Fine grout line
        ctx.strokeStyle = 'rgba(80, 70, 60, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, tilePx - 2, tilePx - 2);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 7);
    texture.anisotropy = 16;
    return texture;
  }, []);

  // Orla Denteada (dentate border) texture
  const borderTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#c9a227');
    grad.addColorStop(0.3, '#e0c060');
    grad.addColorStop(0.5, '#d4af37');
    grad.addColorStop(0.7, '#c9a227');
    grad.addColorStop(1, '#a88820');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const teethCount = 16;
    const teethWidth = canvas.width / teethCount;
    ctx.fillStyle = '#151515';
    for (let i = 0; i < teethCount; i++) {
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.moveTo(i * teethWidth, 0);
        ctx.lineTo((i + 1) * teethWidth, canvas.height / 2);
        ctx.lineTo((i + 2) * teethWidth, 0);
        ctx.closePath();
        ctx.fill();
      }
    }
    for (let i = 0; i < teethCount; i++) {
      if (i % 2 === 1) {
        ctx.beginPath();
        ctx.moveTo(i * teethWidth, canvas.height);
        ctx.lineTo((i + 1) * teethWidth, canvas.height / 2);
        ctx.lineTo((i + 2) * teethWidth, canvas.height);
        ctx.closePath();
        ctx.fill();
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(8, 1);
    return texture;
  }, []);

  // Stone floor for entrance areas
  const stoneTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(0, 0, 512, 512);
    
    // Flagstone pattern
    const stones = [
      { x: 0, y: 0, w: 200, h: 170 },
      { x: 200, y: 0, w: 180, h: 130 },
      { x: 380, y: 0, w: 132, h: 160 },
      { x: 0, y: 170, w: 160, h: 180 },
      { x: 160, y: 130, w: 200, h: 150 },
      { x: 360, y: 160, w: 152, h: 170 },
      { x: 0, y: 350, w: 220, h: 162 },
      { x: 220, y: 280, w: 170, h: 232 },
      { x: 390, y: 330, w: 122, h: 182 },
    ];
    
    stones.forEach(s => {
      const brightness = 0.22 + Math.random() * 0.08;
      const r = Math.floor(brightness * 255 * (0.95 + Math.random() * 0.1));
      const g = Math.floor(brightness * 245 * (0.95 + Math.random() * 0.1));
      const b = Math.floor(brightness * 230 * (0.95 + Math.random() * 0.1));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
      
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    return texture;
  }, []);

  return (
    <group onClick={onClick}>
      {/* Main checkered floor - only Ocidente (from balustrade z=-6 to West wall z=14) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 4]} receiveShadow>
        <planeGeometry args={[floorWidth, 20]} />
        <meshStandardMaterial 
          map={checkerTexture} 
          roughness={0.12}
          metalness={0.4}
        />
      </mesh>

      {/* Oriente floor - plain polished dark wood/marble, no mosaic */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[floorWidth, 8]} />
        <meshStandardMaterial 
          color="#2a1810"
          roughness={0.25}
          metalness={0.15}
        />
      </mesh>

      {/* Reflective floor overlay - only Ocidente */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 4]}>
        <planeGeometry args={[floorWidth, 20]} />
        <meshStandardMaterial 
          color="#ffffff"
          transparent
          opacity={0.04}
          roughness={0.02}
          metalness={0.7}
        />
      </mesh>

      {/* === ORLA DENTEADA (Dentate Border) === */}
      {/* North */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-floorWidth / 2 + 0.15, 0.015, 0]}>
        <planeGeometry args={[0.3, floorLength - 2]} />
        <meshStandardMaterial map={borderTexture} roughness={0.35} metalness={0.15} />
      </mesh>
      {/* South */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[floorWidth / 2 - 0.15, 0.015, 0]}>
        <planeGeometry args={[0.3, floorLength - 2]} />
        <meshStandardMaterial map={borderTexture} roughness={0.35} metalness={0.15} />
      </mesh>
      {/* East */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.015, -floorLength / 2 + 0.15]}>
        <planeGeometry args={[0.3, floorWidth - 0.6]} />
        <meshStandardMaterial map={borderTexture} roughness={0.35} metalness={0.15} />
      </mesh>
      {/* West */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.015, floorLength / 2 - 0.15]}>
        <planeGeometry args={[0.3, floorWidth - 0.6]} />
        <meshStandardMaterial map={borderTexture} roughness={0.35} metalness={0.15} />
      </mesh>

      {/* === BALAUSTRADA (Balustrade separating Oriente) === */}
      <group position={[0, 0, -6]}>
        {/* Top rail - polished brass */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[13, 0.08, 0.1]} />
          <meshStandardMaterial color="#c9a227" roughness={0.15} metalness={0.85} />
        </mesh>
        {/* Bottom rail */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[13, 0.06, 0.08]} />
          <meshStandardMaterial color="#c9a227" roughness={0.15} metalness={0.85} />
        </mesh>
        {/* Balusters */}
        {Array.from({ length: 28 }, (_, i) => {
          const x = -6.25 + i * 0.48;
          if (Math.abs(x) < 1.5) return null;
          return (
            <group key={i}>
              <mesh position={[x, 0.34, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.025, 0.35, 8]} />
                <meshStandardMaterial color="#c9a227" roughness={0.15} metalness={0.85} />
              </mesh>
              <mesh position={[x, 0.34, 0]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshStandardMaterial color="#d4af37" roughness={0.15} metalness={0.85} />
              </mesh>
            </group>
          );
        })}
        {/* Three marble steps to Oriente */}
        {[0, 1, 2].map((step) => (
          <mesh key={step} position={[0, 0.06 + step * 0.1, 0.35 + step * 0.3]} castShadow receiveShadow>
            <boxGeometry args={[3.2 - step * 0.3, 0.1, 0.55]} />
            <meshStandardMaterial color="#e8e0d0" roughness={0.2} metalness={0.08} />
          </mesh>
        ))}
      </group>

      {/* === ÁTRIO (Narthex/Vestibule) === */}
      <group position={[0, 0, floorLength / 2 + entranceDepth / 2]}>
        {/* Átrio floor - right side */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[floorWidth / 4, 0, 0]} receiveShadow>
          <planeGeometry args={[floorWidth / 2 - 0.5, entranceDepth]} />
          <meshStandardMaterial map={stoneTexture} roughness={0.7} metalness={0.05} />
        </mesh>
        
        {/* Sala dos Passos Perdidos floor - left side */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-floorWidth / 4, 0, 0]} receiveShadow>
          <planeGeometry args={[floorWidth / 2 - 0.5, entranceDepth]} />
          <meshStandardMaterial map={stoneTexture} roughness={0.7} metalness={0.05} />
        </mesh>

        {/* Dividing wall between Átrio and Sala PP */}
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[0.2, 4, entranceDepth]} />
          <meshStandardMaterial color="#4a4035" roughness={0.8} />
        </mesh>
      </group>

      {/* === ENTRANCE AREA WALLS === */}
      {/* Left wall - Sala PP */}
      <mesh position={[-floorWidth / 2, 2, floorLength / 2 + entranceDepth / 2]} castShadow>
        <boxGeometry args={[0.3, 4, entranceDepth]} />
        <meshStandardMaterial color="#4a6080" roughness={0.7} />
      </mesh>
      {/* Right wall - Átrio */}
      <mesh position={[floorWidth / 2, 2, floorLength / 2 + entranceDepth / 2]} castShadow>
        <boxGeometry args={[0.3, 4, entranceDepth]} />
        <meshStandardMaterial color="#4a6080" roughness={0.7} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 2, floorLength / 2 + entranceDepth]} castShadow>
        <boxGeometry args={[floorWidth + 0.3, 4, 0.3]} />
        <meshStandardMaterial color="#4a6080" roughness={0.7} />
      </mesh>

      {/* Entrance door from Átrio into temple */}
      <group position={[floorWidth / 4, 0, floorLength / 2]}>
        {/* Door arch */}
        <mesh position={[0, 2.5, 0]} castShadow>
          <boxGeometry args={[2.5, 5, 0.15]} />
          <meshStandardMaterial color="#2a1810" roughness={0.8} />
        </mesh>
        {/* Door opening */}
        <mesh position={[0, 1.8, -0.05]}>
          <boxGeometry args={[1.8, 3.6, 0.3]} />
          <meshStandardMaterial color="#1a0e08" roughness={0.9} />
        </mesh>
      </group>

      {/* Entrance labels */}
      {/* Sala PP label */}
      <mesh position={[-floorWidth / 4, 3.5, floorLength / 2 + entranceDepth - 0.1]} rotation={[0, 0, 0]}>
        <planeGeometry args={[3, 0.6]} />
        <meshStandardMaterial color="#2a1810" roughness={0.7} />
      </mesh>
      {/* Átrio label */}
      <mesh position={[floorWidth / 4, 3.5, floorLength / 2 + entranceDepth - 0.1]} rotation={[0, 0, 0]}>
        <planeGeometry args={[3, 0.6]} />
        <meshStandardMaterial color="#2a1810" roughness={0.7} />
      </mesh>

      {/* Entrance area lighting */}
      <pointLight position={[-floorWidth / 4, 3, floorLength / 2 + 4]} intensity={0.3} color="#ff9966" distance={6} />
      <pointLight position={[floorWidth / 4, 3, floorLength / 2 + 4]} intensity={0.3} color="#ff9966" distance={6} />
    </group>
  );
}
