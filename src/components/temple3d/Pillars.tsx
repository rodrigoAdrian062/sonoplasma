import { Text } from '@react-three/drei';

interface PillarsProps {
  onClick?: (name: string) => void;
}

export function Pillars({ onClick }: PillarsProps) {
  // Vestibular Pillars J and B (Bronze colored, with capitals and decorations)
  const VestibularPillar = ({ 
    position, 
    letter, 
    name,
    fullName,
  }: { 
    position: [number, number, number]; 
    letter: string;
    name: string;
    fullName: string;
  }) => (
    <group position={position} onClick={() => onClick?.(name)}>
      {/* Base with papyrus/lotus leaves pattern */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.5, 0.4, 32]} />
        <meshStandardMaterial color="#cd7f32" roughness={0.4} metalness={0.6} />
      </mesh>
      
      {/* Column shaft (hollow, bronze) - tapered */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.38, 6.5, 32]} />
        <meshStandardMaterial color="#cd7f32" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Capital with lily leaves */}
      <mesh position={[0, 6.9, 0]} castShadow>
        <cylinderGeometry args={[0.48, 0.3, 0.35, 32]} />
        <meshStandardMaterial color="#cd7f32" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Decorative ring (networks pattern) */}
      <mesh position={[0, 7.15, 0]}>
        <torusGeometry args={[0.4, 0.05, 16, 32]} />
        <meshStandardMaterial color="#cd7f32" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Pomegranates on top */}
      {[0, Math.PI / 3, 2 * Math.PI / 3, Math.PI, 4 * Math.PI / 3, 5 * Math.PI / 3].map((angle, i) => (
        <mesh 
          key={i} 
          position={[
            Math.cos(angle) * 0.35, 
            7.35, 
            Math.sin(angle) * 0.35
          ]}
        >
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#8B0000" roughness={0.6} />
        </mesh>
      ))}

      {/* Globe on top */}
      <mesh position={[0, 7.6, 0]} castShadow>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#cd7f32" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Letter on column */}
      <Text
        position={[0, 3.5, 0.35]}
        fontSize={0.4}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {letter}
      </Text>

      {/* Full name label */}
      <Text
        position={[0, 8.2, 0]}
        fontSize={0.12}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        {fullName}
      </Text>
    </group>
  );

  // Side columns (white classical style along walls)
  const SideColumn = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.3, 32]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
      
      {/* Column shaft */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 6.5, 24]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      
      {/* Capital */}
      <mesh position={[0, 6.9, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.25, 0.3, 32]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
      
      {/* Top plate */}
      <mesh position={[0, 7.15, 0]} castShadow>
        <boxGeometry args={[0.6, 0.2, 0.6]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
    </group>
  );

  return (
    <group>
      {/* Main vestibular pillars J and B at the entrance (West) */}
      {/* B is on the left when entering (North side) */}
      <VestibularPillar 
        position={[-2.5, 0, 12]} 
        letter="B" 
        name="pillar-b"
        fullName="Boaz"
      />
      {/* J is on the right when entering (South side) */}
      <VestibularPillar 
        position={[2.5, 0, 12]} 
        letter="J" 
        name="pillar-j"
        fullName="Jakin"
      />

      {/* Side columns along North wall */}
      {[-8, -4, 0, 4, 8].map((z, i) => (
        <SideColumn key={`north-${i}`} position={[-6.8, 0, z]} />
      ))}

      {/* Side columns along South wall */}
      {[-8, -4, 0, 4, 8].map((z, i) => (
        <SideColumn key={`south-${i}`} position={[6.8, 0, z]} />
      ))}
    </group>
  );
}
