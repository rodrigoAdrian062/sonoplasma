import { useMemo } from 'react';
import * as THREE from 'three';

interface FloorProps {
  onClick?: () => void;
}

export function Floor({ onClick }: FloorProps) {
  const floorWidth = 16;
  const floorLength = 28;

  // Create high-quality oblique checkered pattern
  const checkerTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    // Marble white background
    ctx.fillStyle = '#f0ece0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle marble veining to white
    ctx.strokeStyle = 'rgba(200, 190, 175, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      const startX = Math.random() * canvas.width;
      const startY = Math.random() * canvas.height;
      ctx.moveTo(startX, startY);
      for (let j = 0; j < 5; j++) {
        ctx.lineTo(
          startX + (Math.random() - 0.5) * 200,
          startY + (Math.random() - 0.5) * 200
        );
      }
      ctx.stroke();
    }
    
    // Draw diagonal pattern with marble-like black tiles
    const tileSize = 128;
    
    for (let row = -2; row < 12; row++) {
      for (let col = -2; col < 12; col++) {
        if ((row + col) % 2 === 0) {
          const x = col * tileSize;
          const y = row * tileSize;
          
          ctx.save();
          ctx.translate(x + tileSize / 2, y + tileSize / 2);
          ctx.rotate(Math.PI / 4);

          // Black marble tile
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(-tileSize / 2 * 0.7, -tileSize / 2 * 0.7, tileSize * 0.7, tileSize * 0.7);
          
          // Subtle veining on black tiles
          ctx.strokeStyle = 'rgba(60, 60, 60, 0.4)';
          ctx.lineWidth = 0.5;
          for (let v = 0; v < 3; v++) {
            ctx.beginPath();
            ctx.moveTo(-tileSize * 0.3 + Math.random() * tileSize * 0.6, -tileSize * 0.3);
            ctx.lineTo(-tileSize * 0.3 + Math.random() * tileSize * 0.6, tileSize * 0.3);
            ctx.stroke();
          }
          
          ctx.restore();
        }
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 8);
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
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[floorWidth * 1.15, floorLength * 1.05]} />
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
