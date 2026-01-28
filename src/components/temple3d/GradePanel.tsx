import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface GradePanelProps {
  onClick?: () => void;
}

export function GradePanel({ onClick }: GradePanelProps) {
  // Create the panel texture with symbols
  const createPanelTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d')!;

    // Background - parchment color
    ctx.fillStyle = '#f5e6c8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border with dentate pattern
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Inner border
    ctx.strokeStyle = '#2a1810';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Checkered floor at bottom
    const floorY = canvas.height - 150;
    const tileSize = 30;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 14; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#1a1a1a';
        ctx.fillRect(50 + col * tileSize, floorY + row * tileSize, tileSize, tileSize);
      }
    }

    // Pillars J and B
    ctx.fillStyle = '#cd7f32';
    // Pillar J (left)
    ctx.fillRect(80, 300, 40, 200);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(75, 290, 50, 20);
    ctx.fillRect(75, 500, 50, 20);
    
    // Pillar B (right)
    ctx.fillStyle = '#cd7f32';
    ctx.fillRect(canvas.width - 120, 300, 40, 200);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(canvas.width - 125, 290, 50, 20);
    ctx.fillRect(canvas.width - 125, 500, 50, 20);

    // Letters J and B
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 24px serif';
    ctx.textAlign = 'center';
    ctx.fillText('J', 100, 420);
    ctx.fillText('B', canvas.width - 100, 420);

    // Three steps at center
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(180, 450, 150, 20);
    ctx.fillRect(200, 430, 110, 20);
    ctx.fillRect(220, 410, 70, 20);

    // Delta with Eye at top
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 60);
    ctx.lineTo(canvas.width / 2 - 60, 160);
    ctx.lineTo(canvas.width / 2 + 60, 160);
    ctx.closePath();
    ctx.fill();

    // Eye in delta
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 120, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 120, 8, 0, Math.PI * 2);
    ctx.fill();

    // Sun (left of delta)
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(100, 120, 30, 0, Math.PI * 2);
    ctx.fill();
    // Sun rays
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(100 + Math.cos(angle) * 35, 120 + Math.sin(angle) * 35);
      ctx.lineTo(100 + Math.cos(angle) * 50, 120 + Math.sin(angle) * 50);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Moon (right of delta)
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 120, 25, 0, Math.PI * 2);
    ctx.fill();
    // Moon shadow for crescent effect
    ctx.fillStyle = '#f5e6c8';
    ctx.beginPath();
    ctx.arc(canvas.width - 90, 120, 22, 0, Math.PI * 2);
    ctx.fill();

    // Rough ashlar (Pedra Bruta) - left
    ctx.fillStyle = '#808080';
    ctx.fillRect(60, 540, 50, 50);
    ctx.fillStyle = '#606060';
    ctx.fillRect(65, 545, 40, 40);

    // Cubic stone (Pedra Cúbica) - right
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(canvas.width - 110, 540, 50, 50);
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width - 110, 540, 50, 50);

    // Title
    ctx.fillStyle = '#2a1810';
    ctx.font = 'bold 18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAINEL DO GRAU DE APRENDIZ', canvas.width / 2, canvas.height - 30);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  return (
    <group position={[0, 0.01, 0]} onClick={onClick}>
      {/* Panel frame */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[2.5, 3.5]} />
        <meshStandardMaterial 
          map={createPanelTexture()} 
          roughness={0.7}
        />
      </mesh>

      {/* Decorative frame */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.9, 2, 4]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Four borlas at corners */}
      {[
        [-1.3, 0.02, -1.8],
        [1.3, 0.02, -1.8],
        [-1.3, 0.02, 1.8],
        [1.3, 0.02, 1.8],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
