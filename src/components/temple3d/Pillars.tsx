import { Text } from '@react-three/drei';

interface PillarsProps {
  onClick?: (name: string) => void;
}

export function Pillars({ onClick }: PillarsProps) {
  // White classical column component
  const Column = ({ position, showLabel, label }: { position: [number, number, number]; showLabel?: boolean; label?: string }) => (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.45, 0.3, 32]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
      
      {/* Column shaft with fluting effect */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 6.5, 24]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      
      {/* Capital */}
      <mesh position={[0, 6.9, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.3, 0.3, 32]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
      
      {/* Top decoration */}
      <mesh position={[0, 7.15, 0]} castShadow>
        <boxGeometry args={[0.7, 0.2, 0.7]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>

      {/* Label if needed */}
      {showLabel && label && (
        <Text
          position={[0, 4, 0.4]}
          fontSize={0.4}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  );

  return (
    <group>
      {/* Main entrance pillars J and B */}
      <group onClick={() => onClick?.('pillar-j')}>
        <Column position={[-2.5, 0, 10]} showLabel label="J" />
      </group>
      <group onClick={() => onClick?.('pillar-b')}>
        <Column position={[2.5, 0, 10]} showLabel label="B" />
      </group>

      {/* Side columns along North wall */}
      {[-10, -6, -2, 2, 6].map((z, i) => (
        <Column key={`north-${i}`} position={[-6.5, 0, z]} />
      ))}

      {/* Side columns along South wall */}
      {[-10, -6, -2, 2, 6].map((z, i) => (
        <Column key={`south-${i}`} position={[6.5, 0, z]} />
      ))}
    </group>
  );
}
