import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface PillarsProps {
  onClick?: (name: string) => void;
}

export function Pillars({ onClick }: PillarsProps) {
  const pillarHeight = 6;
  const pillarRadius = 0.4;

  const Pillar = ({ 
    position, 
    letter, 
    name,
    color = '#f5f5dc'
  }: { 
    position: [number, number, number]; 
    letter: string; 
    name: string;
    color?: string;
  }) => (
    <group position={position} onClick={() => onClick?.(name)}>
      {/* Base */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[1.2, 0.5, 1.2]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>

      {/* Column shaft */}
      <mesh position={[0, pillarHeight / 2 + 0.5, 0]} castShadow>
        <cylinderGeometry args={[pillarRadius, pillarRadius * 1.1, pillarHeight, 32]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Column fluting (decorative lines) */}
      {[...Array(12)].map((_, i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI * 2) / 12) * (pillarRadius + 0.02),
            pillarHeight / 2 + 0.5,
            Math.sin((i * Math.PI * 2) / 12) * (pillarRadius + 0.02),
          ]}
          castShadow
        >
          <cylinderGeometry args={[0.03, 0.03, pillarHeight - 0.5, 8]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} />
        </mesh>
      ))}

      {/* Capital (top) */}
      <mesh position={[0, pillarHeight + 0.5, 0]} castShadow>
        <cylinderGeometry args={[pillarRadius * 1.5, pillarRadius, 0.5, 32]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Abacus (top plate) */}
      <mesh position={[0, pillarHeight + 0.9, 0]} castShadow>
        <boxGeometry args={[1.2, 0.3, 1.2]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>

      {/* Letter */}
      <Text
        position={[0, pillarHeight / 2 + 0.5, pillarRadius + 0.1]}
        fontSize={0.5}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Cinzel-Bold.ttf"
      >
        {letter}
      </Text>

      {/* Globe on top */}
      <mesh position={[0, pillarHeight + 1.3, 0]} castShadow>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial 
          color={letter === 'J' ? '#4169E1' : '#228B22'} 
          roughness={0.2} 
          metalness={0.3} 
        />
      </mesh>
    </group>
  );

  return (
    <group>
      {/* Pillar J (Jachin) - South/Right when facing East */}
      <Pillar position={[4, 0, 8]} letter="J" name="pillar-j" />
      
      {/* Pillar B (Boaz) - North/Left when facing East */}
      <Pillar position={[-4, 0, 8]} letter="B" name="pillar-b" />
    </group>
  );
}
