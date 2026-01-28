import { Text } from '@react-three/drei';

interface AltarOfOathsProps {
  onClick?: () => void;
}

export function AltarOfOaths({ onClick }: AltarOfOathsProps) {
  return (
    <group position={[0, 0, -8]} onClick={onClick}>
      {/* Triangular altar base - Ionic style */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.5, 0.7, 3]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Altar top - triangular */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.4, 0.1, 3]} />
        <meshStandardMaterial color="#2a1810" roughness={0.6} />
      </mesh>

      {/* Circle between parallel lines symbol on front */}
      <group position={[0, 0.35, 0.45]} rotation={[0, 0, 0]}>
        {/* Circle */}
        <mesh>
          <torusGeometry args={[0.12, 0.015, 16, 32]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Left parallel line */}
        <mesh position={[-0.15, 0, 0]}>
          <boxGeometry args={[0.02, 0.3, 0.02]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Right parallel line */}
        <mesh position={[0.15, 0, 0]}>
          <boxGeometry args={[0.02, 0.3, 0.02]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>

      {/* The Three Great Lights on top */}
      
      {/* Volume of Sacred Law (Bible) */}
      <mesh position={[0, 0.85, 0]} rotation={[0.1, 0.2, 0]} castShadow>
        <boxGeometry args={[0.4, 0.06, 0.3]} />
        <meshStandardMaterial color="#2c1810" roughness={0.8} />
      </mesh>

      {/* Open pages */}
      <mesh position={[0, 0.89, 0]} rotation={[0.1, 0.2, 0]}>
        <boxGeometry args={[0.38, 0.02, 0.28]} />
        <meshStandardMaterial color="#fffef5" roughness={0.9} />
      </mesh>

      {/* Square (Esquadro) - with equal arms for Lights */}
      <group position={[-0.12, 0.92, 0.05]} rotation={[0, 0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.015, 0.015]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0.09, 0, 0.09]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <boxGeometry args={[0.2, 0.015, 0.015]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* Compass (Compasso) - open at 45 degrees */}
      <group position={[0.1, 0.92, -0.05]} rotation={[0, -0.2, 0]}>
        {/* Left leg */}
        <mesh rotation={[0, 0, 0.35]} position={[-0.08, 0, 0]} castShadow>
          <boxGeometry args={[0.18, 0.012, 0.012]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Right leg */}
        <mesh rotation={[0, 0, -0.35]} position={[0.08, 0, 0]} castShadow>
          <boxGeometry args={[0.18, 0.012, 0.012]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Hinge */}
        <mesh position={[0, 0.02, 0]} castShadow>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* Label */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.1}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        Altar dos Juramentos
      </Text>
    </group>
  );
}
