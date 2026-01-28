import { Text } from '@react-three/drei';

interface SeaOfBronzeProps {
  onClick?: () => void;
}

export function SeaOfBronze({ onClick }: SeaOfBronzeProps) {
  return (
    <group position={[5.5, 0, 8]} onClick={onClick}>
      {/* Pedestal with twelve oxen base (simplified) */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.6, 12]} />
        <meshStandardMaterial color="#cd7f32" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Decorative ring */}
      <mesh position={[0, 0.55, 0]}>
        <torusGeometry args={[0.35, 0.03, 16, 32]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Basin (Mar de Bronze) */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.35, 0.3, 32]} />
        <meshStandardMaterial color="#cd7f32" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Water inside */}
      <mesh position={[0, 0.85, 0]}>
        <circleGeometry args={[0.35, 32]} />
        <meshStandardMaterial 
          color="#4a90d9" 
          roughness={0.1} 
          metalness={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Pitcher (Bilha) */}
      <group position={[0.5, 0.5, 0.2]}>
        {/* Body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.3, 16]} />
          <meshStandardMaterial color="#cd7f32" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.06, 0.15, 16]} />
          <meshStandardMaterial color="#cd7f32" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Handle */}
        <mesh position={[0.08, 0.1, 0]} rotation={[0, 0, 0.3]} castShadow>
          <torusGeometry args={[0.08, 0.015, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#cd7f32" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>

      {/* White towel */}
      <mesh position={[-0.4, 0.4, 0]} rotation={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.25, 0.02, 0.15]} />
        <meshStandardMaterial color="#fffef5" roughness={0.9} />
      </mesh>

      {/* Label */}
      <Text
        position={[0, 1.3, 0]}
        fontSize={0.08}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        Mar de Bronze
      </Text>
    </group>
  );
}
