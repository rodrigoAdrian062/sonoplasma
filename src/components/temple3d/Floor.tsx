import { useMemo } from 'react';
import * as THREE from 'three';

interface FloorProps {
  onClick?: () => void;
}

export function Floor({ onClick }: FloorProps) {
  const floorWidth = 16;
  const floorLength = 28;

  // Create aligned black and white marble checkerboard
  const checkerTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const tiles = 8;
    const tilePx = 128;
    canvas.width = tiles * tilePx;
    canvas.height = tiles * tilePx;
    const ctx = canvas.getContext('2d')!;

    // Helper: draw marble veining
    const drawVeins = (x: number, y: number, w: number, h: number, color: string, count: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < count; i++) {
        ctx.globalAlpha = 0.15 + Math.random() * 0.2;
        ctx.beginPath();
        let cx = x + Math.random() * w;
        let cy = y + Math.random() * h;
        ctx.moveTo(cx, cy);
        for (let j = 0; j < 6; j++) {
          cx += (Math.random() - 0.5) * 60;
          cy += (Math.random() - 0.5) * 60;
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
          // Black marble
          ctx.fillStyle = '#111111';
          ctx.fillRect(x, y, tilePx, tilePx);
          drawVeins(x, y, tilePx, tilePx, 'rgba(80, 80, 80, 0.5)', 5);
        } else {
          // White marble
          ctx.fillStyle = '#f0ece4';
          ctx.fillRect(x, y, tilePx, tilePx);
          drawVeins(x, y, tilePx, tilePx, 'rgba(190, 180, 165, 0.4)', 5);
        }

        // Subtle tile border / grout line
        ctx.strokeStyle = 'rgba(100, 90, 80, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, y + 0.5, tilePx - 1, tilePx - 1);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 7);
    texture.anisotropy = 16;
    return texture;
  }, []);

  // Enhanced dentate border texture
  const borderTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // Gold background
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#c9a227');
    grad.addColorStop(0.5, '#d4af37');
    grad.addColorStop(1, '#b8962e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Triangular teeth pattern
    const teethCount = 16;
    const teethWidth = canvas.width / teethCount;
    ctx.fillStyle = '#1a1a1a';
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
    // Bottom teeth
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

  return (
    <group onClick={onClick}>
      {/* Main checkered floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[floorWidth, floorLength]} />
        <meshStandardMaterial 
          map={checkerTexture} 
          roughness={0.15}
          metalness={0.35}
        />
      </mesh>

      {/* Floor reflection layer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[floorWidth, floorLength]} />
        <meshStandardMaterial 
          color="#ffffff"
          transparent
          opacity={0.03}
          roughness={0.05}
          metalness={0.6}
        />
      </mesh>

      {/* Orla Denteada */}
      {/* North border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-floorWidth / 2 + 0.15, 0.02, 0]}>
        <planeGeometry args={[0.3, floorLength - 2]} />
        <meshStandardMaterial map={borderTexture} roughness={0.4} />
      </mesh>
      {/* South border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[floorWidth / 2 - 0.15, 0.02, 0]}>
        <planeGeometry args={[0.3, floorLength - 2]} />
        <meshStandardMaterial map={borderTexture} roughness={0.4} />
      </mesh>
      {/* East border */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.02, -floorLength / 2 + 0.15]}>
        <planeGeometry args={[0.3, floorWidth - 0.6]} />
        <meshStandardMaterial map={borderTexture} roughness={0.4} />
      </mesh>
      {/* West border */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.02, floorLength / 2 - 0.15]}>
        <planeGeometry args={[0.3, floorWidth - 0.6]} />
        <meshStandardMaterial map={borderTexture} roughness={0.4} />
      </mesh>

      {/* Balaustrade (enhanced) */}
      <group position={[0, 0, -6]}>
        {/* Main rail - polished gold */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[12, 0.08, 0.08]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Bottom rail */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[12, 0.06, 0.06]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Ornate balusters */}
        {Array.from({ length: 24 }, (_, i) => {
          const x = -5.5 + i * 0.5;
          if (Math.abs(x) < 1.5) return null;
          return (
            <group key={i}>
              {/* Main baluster */}
              <mesh position={[x, 0.32, 0]} castShadow>
                <cylinderGeometry args={[0.025, 0.025, 0.3, 8]} />
                <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
              </mesh>
              {/* Decorative bulge */}
              <mesh position={[x, 0.32, 0]}>
                <sphereGeometry args={[0.035, 8, 8]} />
                <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
              </mesh>
            </group>
          );
        })}
        {/* Three steps up to Oriente - marble */}
        {[0, 1, 2].map((step) => (
          <mesh key={step} position={[0, 0.05 + step * 0.08, 0.3 + step * 0.25]} castShadow>
            <boxGeometry args={[3 - step * 0.3, 0.08, 0.5]} />
            <meshStandardMaterial color="#f0ece0" roughness={0.2} metalness={0.1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
