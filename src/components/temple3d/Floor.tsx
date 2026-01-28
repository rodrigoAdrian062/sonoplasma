import * as THREE from 'three';

interface FloorProps {
  onClick?: () => void;
}

export function Floor({ onClick }: FloorProps) {
  const floorWidth = 16;
  const floorLength = 28;

  // Create oblique/diagonal checkered pattern (REAA specification)
  // Not like a chessboard, but diagonal squares
  const createCheckerTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw diagonal/oblique pattern
    const tileSize = 64;
    ctx.fillStyle = '#1a1a1a';
    
    for (let row = -1; row < 10; row++) {
      for (let col = -1; col < 10; col++) {
        if ((row + col) % 2 === 0) {
          const x = col * tileSize;
          const y = row * tileSize;
          
          // Draw rotated square (diamond shape for oblique pattern)
          ctx.save();
          ctx.translate(x + tileSize / 2, y + tileSize / 2);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-tileSize / 2 * 0.7, -tileSize / 2 * 0.7, tileSize * 0.7, tileSize * 0.7);
          ctx.restore();
        }
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 8);
    return texture;
  };

  // Create dentate border pattern (Orla Denteada)
  const createBorderTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Background
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Triangular teeth pattern
    ctx.fillStyle = '#1a1a1a';
    const teethCount = 16;
    const teethWidth = canvas.width / teethCount;
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
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(8, 1);
    return texture;
  };

  return (
    <group onClick={onClick}>
      {/* Main checkered floor - Pavimento Mosaico oblíquo */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[floorWidth * 1.15, floorLength * 1.05]} />
        <meshStandardMaterial 
          map={createCheckerTexture()} 
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>

      {/* Floor shine/reflection effect */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[floorWidth, floorLength]} />
        <meshStandardMaterial 
          color="#ffffff"
          transparent
          opacity={0.05}
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>

      {/* Orla Denteada (Dentate Border) around the floor */}
      {/* North border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-floorWidth / 2 + 0.15, 0.02, 0]}>
        <planeGeometry args={[0.3, floorLength - 2]} />
        <meshStandardMaterial 
          map={createBorderTexture()} 
          roughness={0.4}
        />
      </mesh>
      {/* South border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[floorWidth / 2 - 0.15, 0.02, 0]}>
        <planeGeometry args={[0.3, floorLength - 2]} />
        <meshStandardMaterial 
          map={createBorderTexture()} 
          roughness={0.4}
        />
      </mesh>
      {/* East border */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.02, -floorLength / 2 + 0.15]}>
        <planeGeometry args={[0.3, floorWidth - 0.6]} />
        <meshStandardMaterial 
          map={createBorderTexture()} 
          roughness={0.4}
        />
      </mesh>
      {/* West border */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.02, floorLength / 2 - 0.15]}>
        <planeGeometry args={[0.3, floorWidth - 0.6]} />
        <meshStandardMaterial 
          map={createBorderTexture()} 
          roughness={0.4}
        />
      </mesh>

      {/* Balaustrade (Grade do Oriente) separating East from West */}
      <group position={[0, 0, -6]}>
        {/* Main rail */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[12, 0.08, 0.08]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Bottom rail */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[12, 0.06, 0.06]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Balusters (vertical bars) */}
        {Array.from({ length: 24 }, (_, i) => {
          const x = -5.5 + i * 0.5;
          // Skip center passage (-1.5 to 1.5)
          if (Math.abs(x) < 1.5) return null;
          return (
            <mesh key={i} position={[x, 0.32, 0]} castShadow>
              <boxGeometry args={[0.04, 0.35, 0.04]} />
              <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
            </mesh>
          );
        })}
        {/* Single step up to Oriente */}
        <mesh position={[0, 0.05, 0.3]} castShadow>
          <boxGeometry args={[3, 0.1, 0.6]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}
