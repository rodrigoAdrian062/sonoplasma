import { Text } from '@react-three/drei';

interface ZodiacColumnsProps {
  onClick?: (name: string) => void;
}

// Zodiac signs with their symbols
const zodiacSigns = [
  // North wall (from West to East) - Spring/Summer signs
  { name: 'Áries', symbol: '♈', position: 'north', index: 0 },
  { name: 'Touro', symbol: '♉', position: 'north', index: 1 },
  { name: 'Gêmeos', symbol: '♊', position: 'north', index: 2 },
  { name: 'Câncer', symbol: '♋', position: 'north', index: 3 },
  { name: 'Leão', symbol: '♌', position: 'north', index: 4 },
  { name: 'Virgem', symbol: '♍', position: 'north', index: 5 },
  // South wall (from East to West) - Autumn/Winter signs
  { name: 'Libra', symbol: '♎', position: 'south', index: 0 },
  { name: 'Escorpião', symbol: '♏', position: 'south', index: 1 },
  { name: 'Sagitário', symbol: '♐', position: 'south', index: 2 },
  { name: 'Capricórnio', symbol: '♑', position: 'south', index: 3 },
  { name: 'Aquário', symbol: '♒', position: 'south', index: 4 },
  { name: 'Peixes', symbol: '♓', position: 'south', index: 5 },
];

export function ZodiacColumns({ onClick }: ZodiacColumnsProps) {
  const roomWidth = 16;
  const roomLength = 28;
  const wallOffset = 0.2;
  const columnSpacing = 3.5;
  const startZ = -roomLength / 2 + 5; // Start from near the Oriente

  // Ionic column with zodiac symbol
  const ZodiacColumn = ({ 
    position, 
    sign 
  }: { 
    position: [number, number, number]; 
    sign: typeof zodiacSigns[0];
  }) => (
    <group 
      position={position} 
      onClick={() => onClick?.(`zodiac-${sign.name.toLowerCase()}`)}
    >
      {/* Half-column base (embedded in wall) */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 0.2, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>

      {/* Column shaft */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.18, 4.5, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>

      {/* Ionic capital with volutes */}
      <mesh position={[0, 4.85, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.15, 0.2, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>

      {/* Top plate */}
      <mesh position={[0, 5, 0]} castShadow>
        <boxGeometry args={[0.35, 0.1, 0.2]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>

      {/* Zodiac symbol medallion */}
      <mesh position={[0.02, 3.5, 0.16]}>
        <circleGeometry args={[0.2, 32]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Zodiac symbol text */}
      <Text
        position={[0.02, 3.5, 0.18]}
        fontSize={0.2}
        color="#1a1a1a"
        anchorX="center"
        anchorY="middle"
      >
        {sign.symbol}
      </Text>

      {/* Sign name */}
      <Text
        position={[0.02, 3.1, 0.18]}
        fontSize={0.08}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        {sign.name}
      </Text>
    </group>
  );

  return (
    <group>
      {/* North wall columns (6 signs) */}
      {zodiacSigns
        .filter(s => s.position === 'north')
        .map((sign) => (
          <ZodiacColumn
            key={sign.name}
            position={[
              -roomWidth / 2 + wallOffset,
              0,
              startZ + sign.index * columnSpacing,
            ]}
            sign={sign}
          />
        ))}

      {/* South wall columns (6 signs) */}
      {zodiacSigns
        .filter(s => s.position === 'south')
        .map((sign) => (
          <ZodiacColumn
            key={sign.name}
            position={[
              roomWidth / 2 - wallOffset,
              0,
              startZ + sign.index * columnSpacing,
            ]}
            sign={sign}
          />
        ))}
    </group>
  );
}
