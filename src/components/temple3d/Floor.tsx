import { useRef } from 'react';
import * as THREE from 'three';

interface FloorProps {
  onClick?: () => void;
}

export function Floor({ onClick }: FloorProps) {
  const floorSize = 20;
  const tileSize = 1;
  const tilesPerSide = floorSize / tileSize;

  // Create checkered pattern texture
  const createCheckerTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const tiles = 20;
    const tileWidth = canvas.width / tiles;
    const tileHeight = canvas.height / tiles;
    
    for (let i = 0; i < tiles; i++) {
      for (let j = 0; j < tiles; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#f5f5f5' : '#1a1a1a';
        ctx.fillRect(i * tileWidth, j * tileHeight, tileWidth, tileHeight);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  };

  return (
    <group onClick={onClick}>
      {/* Main checkered floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[floorSize, floorSize * 1.5]} />
        <meshStandardMaterial 
          map={createCheckerTexture()} 
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Border decoration */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <ringGeometry args={[floorSize / 2 - 0.5, floorSize / 2, 4]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>

      {/* Carpet/Tapete along the center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[3, floorSize * 1.2]} />
        <meshStandardMaterial 
          color="#1a237e" 
          roughness={0.9}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Gold trim on carpet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.6, 0.025, 0]}>
        <planeGeometry args={[0.1, floorSize * 1.2]} />
        <meshStandardMaterial color="#ffd700" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.6, 0.025, 0]}>
        <planeGeometry args={[0.1, floorSize * 1.2]} />
        <meshStandardMaterial color="#ffd700" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}
