import * as THREE from 'three';

interface FloorProps {
  onClick?: () => void;
}

export function Floor({ onClick }: FloorProps) {
  const floorWidth = 16;
  const floorLength = 28;

  // Create diamond checkered pattern texture (rotated 45 degrees)
  const createCheckerTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw diamond pattern
    const tileSize = 64;
    ctx.fillStyle = '#1a1a1a';
    
    for (let row = -1; row < 10; row++) {
      for (let col = -1; col < 10; col++) {
        if ((row + col) % 2 === 0) {
          const x = col * tileSize;
          const y = row * tileSize;
          
          // Draw rotated square (diamond)
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
    texture.repeat.set(4, 6);
    return texture;
  };

  return (
    <group onClick={onClick}>
      {/* Main checkered floor - rotated 45 degrees for diamond pattern */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[floorWidth * 1.2, floorLength * 1.1]} />
        <meshStandardMaterial 
          map={createCheckerTexture()} 
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>

      {/* Floor reflection/shine effect */}
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

      {/* Border around the floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[Math.min(floorWidth, floorLength) / 2 - 0.3, Math.min(floorWidth, floorLength) / 2, 64]} />
        <meshStandardMaterial color="#4a3728" roughness={0.7} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}
