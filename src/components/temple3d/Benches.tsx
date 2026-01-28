interface BenchesProps {
  onClick?: (name: string) => void;
}

export function Benches({ onClick }: BenchesProps) {
  // Single bench with desk
  const BenchRow = ({ position, side }: { position: [number, number, number]; side: 'north' | 'south' }) => {
    const rotation = side === 'north' ? Math.PI / 2 : -Math.PI / 2;
    
    return (
      <group position={position} rotation={[0, rotation, 0]}>
        {/* Desk/Table */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[2.5, 0.08, 0.5]} />
          <meshStandardMaterial color="#4a3020" roughness={0.7} />
        </mesh>
        {/* Desk legs */}
        <mesh position={[-1.1, 0.22, 0]} castShadow>
          <boxGeometry args={[0.08, 0.44, 0.4]} />
          <meshStandardMaterial color="#3a2515" roughness={0.8} />
        </mesh>
        <mesh position={[1.1, 0.22, 0]} castShadow>
          <boxGeometry args={[0.08, 0.44, 0.4]} />
          <meshStandardMaterial color="#3a2515" roughness={0.8} />
        </mesh>
        
        {/* Chair/Bench seat */}
        <mesh position={[0, 0.35, -0.5]} castShadow>
          <boxGeometry args={[2.5, 0.06, 0.4]} />
          <meshStandardMaterial color="#8B0000" roughness={0.6} />
        </mesh>
        
        {/* Chair back */}
        <mesh position={[0, 0.65, -0.68]} castShadow>
          <boxGeometry args={[2.5, 0.55, 0.06]} />
          <meshStandardMaterial color="#8B0000" roughness={0.6} />
        </mesh>
        
        {/* Chair frame */}
        <mesh position={[-1.2, 0.5, -0.5]} castShadow>
          <boxGeometry args={[0.06, 0.7, 0.4]} />
          <meshStandardMaterial color="#2a1810" roughness={0.8} />
        </mesh>
        <mesh position={[1.2, 0.5, -0.5]} castShadow>
          <boxGeometry args={[0.06, 0.7, 0.4]} />
          <meshStandardMaterial color="#2a1810" roughness={0.8} />
        </mesh>
      </group>
    );
  };

  return (
    <group onClick={() => onClick?.('benches')}>
      {/* North side benches (left when entering) */}
      {[-8, -5, -2, 1, 4, 7].map((z, i) => (
        <BenchRow key={`north-${i}`} position={[-4.5, 0, z]} side="north" />
      ))}
      
      {/* South side benches (right when entering) */}
      {[-8, -5, -2, 1, 4, 7].map((z, i) => (
        <BenchRow key={`south-${i}`} position={[4.5, 0, z]} side="south" />
      ))}
    </group>
  );
}
