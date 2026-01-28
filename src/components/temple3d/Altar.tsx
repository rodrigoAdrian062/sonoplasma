import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface AltarProps {
  onClick?: () => void;
}

export function Altar({ onClick }: AltarProps) {
  return (
    <group position={[0, 0, 2]} onClick={onClick}>
      {/* Altar base */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.5, 0.8, 1]} />
        <meshStandardMaterial color="#8B4513" roughness={0.6} />
      </mesh>

      {/* Altar top (marble) */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[1.6, 0.1, 1.1]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Bible/Volume of Sacred Law */}
      <mesh position={[0, 1, 0]} rotation={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.6, 0.08, 0.4]} />
        <meshStandardMaterial color="#2c1810" roughness={0.8} />
      </mesh>

      {/* Square (Esquadro) */}
      <group position={[-0.3, 1.05, 0.15]} rotation={[0, 0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.02, 0.02]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0.14, 0, 0.14]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <boxGeometry args={[0.3, 0.02, 0.02]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* Compass (Compasso) */}
      <group position={[0.2, 1.05, -0.1]} rotation={[0, -0.3, 0]}>
        <mesh rotation={[0, 0, 0.3]} position={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.25, 0.015, 0.015]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh rotation={[0, 0, -0.3]} position={[0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.25, 0.015, 0.015]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Compass hinge */}
        <mesh position={[0, 0.02, 0]} castShadow>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* Three small candles around the altar */}
      {[
        { pos: [-0.5, 0.9, 0.6], name: 'Sabedoria' },
        { pos: [0.5, 0.9, 0.6], name: 'Força' },
        { pos: [0, 0.9, -0.6], name: 'Beleza' },
      ].map((candle, i) => (
        <group key={i} position={candle.pos as [number, number, number]}>
          {/* Candle holder */}
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.15, 16]} />
            <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Candle */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.2, 16]} />
            <meshStandardMaterial color="#fffaf0" roughness={0.9} />
          </mesh>
          {/* Flame */}
          <pointLight position={[0, 0.35, 0]} intensity={0.3} color="#ff6600" distance={2} />
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#ff9900" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
