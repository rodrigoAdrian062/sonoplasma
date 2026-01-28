import { Text } from '@react-three/drei';

interface AltarProps {
  onClick?: () => void;
}

export function Altar({ onClick }: AltarProps) {
  return (
    <group position={[0, 0, -11]} onClick={onClick}>
      {/* Altar-Mor (Main Altar) - VM's desk */}
      {/* Rectangular desk, closed front and sides */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[2.2, 0.8, 0.8]} />
        <meshStandardMaterial color="#3a2515" roughness={0.7} />
      </mesh>

      {/* Altar top (darker wood) */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[2.3, 0.1, 0.9]} />
        <meshStandardMaterial color="#2a1810" roughness={0.6} />
      </mesh>

      {/* Esquadro symbol on front (Square - VM's jewel) */}
      <group position={[0, 0.4, 0.42]}>
        {/* Vertical arm */}
        <mesh castShadow>
          <boxGeometry args={[0.15, 0.02, 0.02]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Horizontal arm */}
        <mesh position={[0.065, -0.065, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <boxGeometry args={[0.15, 0.02, 0.02]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* Three-branch candelabrum (Luzes Litúrgicas) */}
      <group position={[0.8, 0.9, 0.2]}>
        {/* Base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.1, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Main stem */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.2, 8]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Three candle holders */}
        {[-0.08, 0, 0.08].map((x, i) => (
          <group key={i} position={[x, 0.28, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.02, 0.025, 0.08, 8]} />
              <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
            </mesh>
            {/* Candle */}
            <mesh position={[0, 0.12, 0]} castShadow>
              <cylinderGeometry args={[0.015, 0.015, 0.15, 8]} />
              <meshStandardMaterial color="#fffaf0" roughness={0.9} />
            </mesh>
            {/* Flame */}
            <pointLight position={[0, 0.22, 0]} intensity={0.2} color="#ff6600" distance={2} />
            <mesh position={[0, 0.22, 0]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshBasicMaterial color="#ff9900" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Malhete (Gavel) */}
      <group position={[-0.6, 0.95, 0.15]} rotation={[0, 0.3, 0]}>
        {/* Head */}
        <mesh castShadow>
          <boxGeometry args={[0.12, 0.05, 0.05]} />
          <meshStandardMaterial color="#2a1810" roughness={0.8} />
        </mesh>
        {/* Handle */}
        <mesh position={[0, -0.08, 0]} rotation={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.015, 0.15, 8]} />
          <meshStandardMaterial color="#4a3728" roughness={0.7} />
        </mesh>
      </group>

      {/* Sword case (Espada Flamejante) */}
      <mesh position={[-0.3, 0.92, -0.2]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.6, 0.04, 0.08]} />
        <meshStandardMaterial color="#2a1810" roughness={0.8} />
      </mesh>

      {/* Prancheta with Parallel Crosses (right side, south) */}
      <group position={[1.2, 1.05, 0]} rotation={[0.2, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.35, 0.02]} />
          <meshStandardMaterial color="#2a1810" roughness={0.7} />
        </mesh>
        {/* X symbol */}
        <mesh position={[0, 0, 0.012]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.2, 0.02, 0.005]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.012]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.2, 0.02, 0.005]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>

      {/* Carta Constitutiva frame (left side, north) */}
      <group position={[-1.2, 1.05, 0]} rotation={[0.2, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.35, 0.02]} />
          <meshStandardMaterial color="#2a1810" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <boxGeometry args={[0.25, 0.3, 0.005]} />
          <meshStandardMaterial color="#fffef5" roughness={0.9} />
        </mesh>
        <Text
          position={[0, 0, 0.02]}
          fontSize={0.03}
          color="#2a1810"
          anchorX="center"
          anchorY="middle"
        >
          CARTA{'\n'}CONSTITUTIVA
        </Text>
      </group>

      {/* Label */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.1}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        Altar do Venerável Mestre
      </Text>
    </group>
  );
}
