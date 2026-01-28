import { Text } from '@react-three/drei';

interface BenchesProps {
  onClick?: (name: string) => void;
}

export function Benches({ onClick }: BenchesProps) {
  // Single bench with desk
  const BenchRow = ({ 
    position, 
    side,
    label,
    color = "#8B0000"
  }: { 
    position: [number, number, number]; 
    side: 'north' | 'south';
    label?: string;
    color?: string;
  }) => {
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
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        
        {/* Chair back */}
        <mesh position={[0, 0.65, -0.68]} castShadow>
          <boxGeometry args={[2.5, 0.55, 0.06]} />
          <meshStandardMaterial color={color} roughness={0.6} />
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

        {/* Label on desk */}
        {label && (
          <Text
            position={[0, 0.52, 0.1]}
            fontSize={0.12}
            color="#d4af37"
            anchorX="center"
            anchorY="middle"
            rotation={[0, -rotation, 0]}
          >
            {label}
          </Text>
        )}
      </group>
    );
  };

  return (
    <group onClick={() => onClick?.('benches')}>
      {/* ===== COLUNA DO NORTE (Aprendizes) ===== */}
      {/* North side benches - APRENDIZES (blue accent) */}
      <BenchRow position={[-4.5, 0, -8]} side="north" label="Aprendizes" color="#4a5568" />
      <BenchRow position={[-4.5, 0, -5]} side="north" color="#4a5568" />
      <BenchRow position={[-4.5, 0, -2]} side="north" color="#4a5568" />
      <BenchRow position={[-4.5, 0, 1]} side="north" color="#4a5568" />
      <BenchRow position={[-4.5, 0, 4]} side="north" color="#4a5568" />
      <BenchRow position={[-4.5, 0, 7]} side="north" color="#4a5568" />

      {/* ===== COLUNA DO SUL (Companheiros) ===== */}
      {/* South side benches - COMPANHEIROS (red accent) */}
      <BenchRow position={[4.5, 0, -8]} side="south" label="Companheiros" color="#8B0000" />
      <BenchRow position={[4.5, 0, -5]} side="south" color="#8B0000" />
      <BenchRow position={[4.5, 0, -2]} side="south" color="#8B0000" />
      <BenchRow position={[4.5, 0, 1]} side="south" color="#8B0000" />
      <BenchRow position={[4.5, 0, 4]} side="south" color="#8B0000" />
      
      {/* ===== MESTRES (podem sentar em ambas colunas - próximo ao Oriente) ===== */}
      {/* Masters' seats - closer to the East, distinguished seating */}
      
      {/* North side Masters - Row 1 (closest to Oriente) */}
      <group position={[-4.5, 0, -11]} rotation={[0, Math.PI / 2, 0]}>
        {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
          <group key={`master-n1-${i}`} position={[x, 0, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.6, 0.06, 0.5]} />
              <meshStandardMaterial color="#1a365d" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.65, -0.22]} castShadow>
              <boxGeometry args={[0.6, 0.55, 0.06]} />
              <meshStandardMaterial color="#1a365d" roughness={0.5} />
            </mesh>
            {[-0.25, 0.25].map((lx, j) => (
              <mesh key={j} position={[lx, 0.17, 0]} castShadow>
                <boxGeometry args={[0.04, 0.34, 0.04]} />
                <meshStandardMaterial color="#2a1810" roughness={0.8} />
              </mesh>
            ))}
          </group>
        ))}
        <Text
          position={[0, 1.1, 0]}
          fontSize={0.1}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
          rotation={[0, -Math.PI / 2, 0]}
        >
          Mestres
        </Text>
      </group>

      {/* North side Masters - Row 2 */}
      <group position={[-4.5, 0, -9.5]} rotation={[0, Math.PI / 2, 0]}>
        {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
          <group key={`master-n2-${i}`} position={[x, 0, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.6, 0.06, 0.5]} />
              <meshStandardMaterial color="#1a365d" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.65, -0.22]} castShadow>
              <boxGeometry args={[0.6, 0.55, 0.06]} />
              <meshStandardMaterial color="#1a365d" roughness={0.5} />
            </mesh>
            {[-0.25, 0.25].map((lx, j) => (
              <mesh key={j} position={[lx, 0.17, 0]} castShadow>
                <boxGeometry args={[0.04, 0.34, 0.04]} />
                <meshStandardMaterial color="#2a1810" roughness={0.8} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* South side Masters - Row 1 (closest to Oriente) */}
      <group position={[4.5, 0, -11]} rotation={[0, -Math.PI / 2, 0]}>
        {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
          <group key={`master-s1-${i}`} position={[x, 0, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.6, 0.06, 0.5]} />
              <meshStandardMaterial color="#1a365d" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.65, -0.22]} castShadow>
              <boxGeometry args={[0.6, 0.55, 0.06]} />
              <meshStandardMaterial color="#1a365d" roughness={0.5} />
            </mesh>
            {[-0.25, 0.25].map((lx, j) => (
              <mesh key={j} position={[lx, 0.17, 0]} castShadow>
                <boxGeometry args={[0.04, 0.34, 0.04]} />
                <meshStandardMaterial color="#2a1810" roughness={0.8} />
              </mesh>
            ))}
          </group>
        ))}
        <Text
          position={[0, 1.1, 0]}
          fontSize={0.1}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
          rotation={[0, Math.PI / 2, 0]}
        >
          Mestres
        </Text>
      </group>

      {/* South side Masters - Row 2 */}
      <group position={[4.5, 0, -9.5]} rotation={[0, -Math.PI / 2, 0]}>
        {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
          <group key={`master-s2-${i}`} position={[x, 0, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.6, 0.06, 0.5]} />
              <meshStandardMaterial color="#1a365d" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.65, -0.22]} castShadow>
              <boxGeometry args={[0.6, 0.55, 0.06]} />
              <meshStandardMaterial color="#1a365d" roughness={0.5} />
            </mesh>
            {[-0.25, 0.25].map((lx, j) => (
              <mesh key={j} position={[lx, 0.17, 0]} castShadow>
                <boxGeometry args={[0.04, 0.34, 0.04]} />
                <meshStandardMaterial color="#2a1810" roughness={0.8} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Column labels */}
      <Text
        position={[-4.5, 2.5, 0]}
        fontSize={0.15}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI / 2, 0]}
      >
        Coluna do Norte
      </Text>
      <Text
        position={[4.5, 2.5, 0]}
        fontSize={0.15}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
        rotation={[0, -Math.PI / 2, 0]}
      >
        Coluna do Sul
      </Text>
    </group>
  );
}
