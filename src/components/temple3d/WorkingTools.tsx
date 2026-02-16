import { Text } from '@react-three/drei';

interface WorkingToolsProps {
  onClick?: (name: string) => void;
}

export function WorkingTools({ onClick }: WorkingToolsProps) {
  return (
    <group>
      {/* === Tábua de Delinear (Tracing Board) === */}
      {/* Positioned near the 1st Vigilante */}
      <group position={[-1.5, 0.01, 7]} onClick={() => onClick?.('tracing-board')}>
        {/* Easel legs */}
        <mesh position={[-0.3, 0.6, -0.15]} rotation={[0.15, 0, -0.1]} castShadow>
          <boxGeometry args={[0.04, 1.2, 0.04]} />
          <meshStandardMaterial color="#3a2515" roughness={0.8} />
        </mesh>
        <mesh position={[0.3, 0.6, -0.15]} rotation={[0.15, 0, 0.1]} castShadow>
          <boxGeometry args={[0.04, 1.2, 0.04]} />
          <meshStandardMaterial color="#3a2515" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.5, 0.2]} rotation={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.04, 1, 0.04]} />
          <meshStandardMaterial color="#3a2515" roughness={0.8} />
        </mesh>
        
        {/* Board */}
        <mesh position={[0, 0.9, 0]} rotation={[0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.7, 0.9, 0.03]} />
          <meshStandardMaterial color="#f5e6c8" roughness={0.7} />
        </mesh>
        
        {/* Board border */}
        <mesh position={[0, 0.9, 0.02]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.72, 0.92, 0.01]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} transparent opacity={0.3} />
        </mesh>

        {/* Mini Delta symbol on board */}
        <mesh position={[0, 1.15, 0.04]} rotation={[0.2, 0, 0]}>
          <coneGeometry args={[0.08, 0.12, 3]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>

        <Text
          position={[0, 1.6, 0]}
          fontSize={0.07}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          Tábua de Delinear
        </Text>
      </group>

      {/* === Pedra Bruta (Rough Ashlar) === */}
      <group position={[-4, 0, -4]} onClick={() => onClick?.('rough-ashlar')}>
        {/* Irregular rough stone */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <dodecahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial color="#808080" roughness={0.95} />
        </mesh>
        {/* Base pedestal */}
        <mesh position={[0, 0.03, 0]} castShadow>
          <boxGeometry args={[0.5, 0.06, 0.5]} />
          <meshStandardMaterial color="#a0a0a0" roughness={0.6} />
        </mesh>
        <Text
          position={[0, 0.6, 0]}
          fontSize={0.06}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          Pedra Bruta
        </Text>
      </group>

      {/* === Pedra Cúbica (Cubic Stone) === */}
      <group position={[4, 0, 1]} onClick={() => onClick?.('cubic-stone')}>
        {/* Perfect cube */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#d0d0d0" roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Engraved lines */}
        {[0.152, -0.152].map((z, i) => (
          <mesh key={i} position={[0, 0.18, z]}>
            <boxGeometry args={[0.25, 0.25, 0.002]} />
            <meshStandardMaterial color="#b0b0b0" roughness={0.2} />
          </mesh>
        ))}
        {/* Base pedestal */}
        <mesh position={[0, 0.03, 0]} castShadow>
          <boxGeometry args={[0.5, 0.06, 0.5]} />
          <meshStandardMaterial color="#a0a0a0" roughness={0.6} />
        </mesh>
        <Text
          position={[0, 0.6, 0]}
          fontSize={0.06}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          Pedra Cúbica
        </Text>
      </group>

      {/* === Maço e Cinzel (Mallet and Chisel) near Rough Ashlar === */}
      <group position={[-4, 0.35, -3.6]} onClick={() => onClick?.('mallet-chisel')}>
        {/* Mallet head */}
        <mesh position={[0, 0.05, 0]} rotation={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.15, 0.08, 0.08]} />
          <meshStandardMaterial color="#4a3728" roughness={0.8} />
        </mesh>
        {/* Mallet handle */}
        <mesh position={[0, -0.05, 0]} rotation={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.02, 0.15, 8]} />
          <meshStandardMaterial color="#6b4e37" roughness={0.7} />
        </mesh>
        {/* Chisel */}
        <mesh position={[0.15, 0.02, 0]} rotation={[0, 0.3, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.008, 0.015, 0.2, 6]} />
          <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>

      {/* === Régua de 24 Polegadas (24-inch Gauge) near entrance === */}
      <group position={[0, 0.02, 10]} onClick={() => onClick?.('gauge-24')}>
        <mesh rotation={[-Math.PI / 2, 0, 0.3]} castShadow>
          <boxGeometry args={[1.2, 0.08, 0.02]} />
          <meshStandardMaterial color="#c9a96e" roughness={0.6} />
        </mesh>
        {/* Division marks */}
        {Array.from({ length: 3 }, (_, i) => (
          <mesh key={i} position={[-0.3 + i * 0.4, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0.3]}>
            <boxGeometry args={[0.01, 0.09, 0.025]} />
            <meshStandardMaterial color="#2a1810" roughness={0.8} />
          </mesh>
        ))}
        <Text
          position={[0, 0.15, 0]}
          fontSize={0.06}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          Régua de 24 Polegadas
        </Text>
      </group>
    </group>
  );
}
