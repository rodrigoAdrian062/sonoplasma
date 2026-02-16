import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function StainedGlassWindows() {
  const lightRef1 = useRef<THREE.PointLight>(null);
  const lightRef2 = useRef<THREE.PointLight>(null);

  // Subtle pulsing light through windows
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (lightRef1.current) {
      lightRef1.current.intensity = 0.8 + Math.sin(t * 0.5) * 0.15;
    }
    if (lightRef2.current) {
      lightRef2.current.intensity = 0.6 + Math.sin(t * 0.7 + 1) * 0.1;
    }
  });

  const roomWidth = 16;
  const roomLength = 28;
  const wallHeight = 8;

  const createWindowTexture = (colors: string[], pattern: 'rose' | 'lancet') => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;

    // Dark frame
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (pattern === 'rose') {
      // Rose window pattern
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = 100;

      // Outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = colors[0];
      ctx.fill();

      // Inner petals
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const px = cx + Math.cos(angle) * radius * 0.5;
        const py = cy + Math.sin(angle) * radius * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, 25, 0, Math.PI * 2);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
      }

      // Center circle
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();

      // Frame lines
      ctx.strokeStyle = '#2a1810';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.stroke();
      }
    } else {
      // Lancet (pointed arch) window
      const cx = canvas.width / 2;
      const topY = 40;
      const bottomY = canvas.height - 30;
      const halfW = 60;

      // Pointed arch shape
      ctx.beginPath();
      ctx.moveTo(cx - halfW, bottomY);
      ctx.lineTo(cx - halfW, canvas.height * 0.4);
      ctx.quadraticCurveTo(cx - halfW, topY, cx, topY - 20);
      ctx.quadraticCurveTo(cx + halfW, topY, cx + halfW, canvas.height * 0.4);
      ctx.lineTo(cx + halfW, bottomY);
      ctx.closePath();
      
      // Gradient fill
      const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(0.3, colors[1] || colors[0]);
      grad.addColorStop(0.6, colors[2] || colors[0]);
      grad.addColorStop(1, colors[3] || colors[0]);
      ctx.fillStyle = grad;
      ctx.fill();

      // Cross dividers
      ctx.strokeStyle = '#2a1810';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, topY - 20);
      ctx.lineTo(cx, bottomY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - halfW, canvas.height * 0.5);
      ctx.lineTo(cx + halfW, canvas.height * 0.5);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // Window positions on north and south walls
  const windowPositions = [-8, -2, 4, 10];
  const blueGold = ['#2244aa', '#3366cc', '#d4af37', '#1a3388'];
  const redGold = ['#8B0000', '#cc3333', '#d4af37', '#661111'];

  return (
    <group>
      {/* North wall windows (lancet) */}
      {windowPositions.map((z, i) => (
        <group key={`north-${i}`}>
          {/* Window frame (recessed) */}
          <mesh position={[-roomWidth / 2 + 0.05, wallHeight * 0.6, z]}>
            <boxGeometry args={[0.15, 2.5, 1.2]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          {/* Stained glass */}
          <mesh position={[-roomWidth / 2 + 0.18, wallHeight * 0.6, z]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[1, 2.2]} />
            <meshStandardMaterial
              map={createWindowTexture(i % 2 === 0 ? blueGold : redGold, 'lancet')}
              transparent
              opacity={0.9}
              emissive="#ffffff"
              emissiveIntensity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* South wall windows (lancet) */}
      {windowPositions.map((z, i) => (
        <group key={`south-${i}`}>
          <mesh position={[roomWidth / 2 - 0.05, wallHeight * 0.6, z]}>
            <boxGeometry args={[0.15, 2.5, 1.2]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh position={[roomWidth / 2 - 0.18, wallHeight * 0.6, z]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[1, 2.2]} />
            <meshStandardMaterial
              map={createWindowTexture(i % 2 === 0 ? redGold : blueGold, 'lancet')}
              transparent
              opacity={0.9}
              emissive="#ffffff"
              emissiveIntensity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* Rose window above entrance (West wall) */}
      <mesh position={[0, wallHeight * 0.75, roomLength / 2 - 0.1]} rotation={[0, 0, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial
          map={createWindowTexture(['#2244aa', '#8B0000', '#d4af37', '#228822', '#cc6600', '#662288', '#cc3333', '#336699'], 'rose')}
          transparent
          opacity={0.9}
          emissive="#ffffff"
          emissiveIntensity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Light shafts through windows */}
      <pointLight ref={lightRef1} position={[-7, 5, -2]} intensity={0.8} color="#4466cc" distance={8} />
      <pointLight ref={lightRef2} position={[7, 5, 4]} intensity={0.6} color="#cc4444" distance={8} />
    </group>
  );
}
