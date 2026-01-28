import { Text } from '@react-three/drei';
import { forwardRef } from 'react';
import { Group } from 'three';

interface CandelabraProps {
  position: [number, number, number];
  title: string;
  name: string;
  onClick?: (name: string) => void;
}

const Candelabra = forwardRef<Group, CandelabraProps>(({ position, title, name, onClick }, ref) => (
  <group ref={ref} position={position} onClick={() => onClick?.(name)}>
    {/* Base */}
    <mesh position={[0, 0.1, 0]} castShadow>
      <cylinderGeometry args={[0.3, 0.4, 0.2, 16]} />
      <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
    </mesh>

    {/* Stem */}
    <mesh position={[0, 0.8, 0]} castShadow>
      <cylinderGeometry args={[0.05, 0.08, 1.4, 16]} />
      <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
    </mesh>

    {/* Decorative ring */}
    <mesh position={[0, 0.5, 0]} castShadow>
      <torusGeometry args={[0.12, 0.03, 16, 32]} />
      <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
    </mesh>

    {/* Top dish */}
    <mesh position={[0, 1.5, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.1, 0.1, 16]} />
      <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
    </mesh>

    {/* Candle */}
    <mesh position={[0, 1.7, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.06, 0.4, 16]} />
      <meshStandardMaterial color="#fffaf0" roughness={0.9} />
    </mesh>

    {/* Flame */}
    <pointLight position={[0, 2, 0]} intensity={1} color="#ff6600" distance={8} />
    <mesh position={[0, 1.95, 0]}>
      <coneGeometry args={[0.04, 0.1, 8]} />
      <meshBasicMaterial color="#ff9900" />
    </mesh>

    {/* Title */}
    <Text
      position={[0, 2.3, 0]}
      fontSize={0.2}
      color="#d4af37"
      anchorX="center"
      anchorY="middle"
    >
      {title}
    </Text>
  </group>
));

Candelabra.displayName = 'Candelabra';

interface LightsProps {
  onClick?: (name: string) => void;
}

export function Lights({ onClick }: LightsProps) {
  return (
    <group>
      {/* Sabedoria (Wisdom) - East, near VM */}
      <Candelabra position={[2, 0, -8]} title="Sabedoria" name="light-wisdom" onClick={onClick} />

      {/* Força (Strength) - West, near 1º Vigilante */}
      <Candelabra position={[-2, 0, 6]} title="Força" name="light-strength" onClick={onClick} />

      {/* Beleza (Beauty) - South, near 2º Vigilante */}
      <Candelabra position={[5, 0, 2]} title="Beleza" name="light-beauty" onClick={onClick} />

      {/* Central chandelier */}
      <group position={[0, 8, 0]}>
        {/* Chain */}
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 3, 8]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Main body */}
        <mesh position={[0, -1.5, 0]}>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Light arms */}
        {[...Array(8)].map((_, i) => {
          const angle = (i * Math.PI * 2) / 8;
          return (
            <group key={i} position={[0, -1.8, 0]} rotation={[0, angle, 0]}>
              <mesh position={[0.8, 0, 0]} rotation={[0, 0, -Math.PI / 6]}>
                <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
                <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
              </mesh>
              <pointLight position={[1.2, 0.2, 0]} intensity={0.3} color="#ffd700" distance={5} />
              <mesh position={[1.2, 0.1, 0]}>
                <coneGeometry args={[0.03, 0.08, 8]} />
                <meshBasicMaterial color="#ff9900" />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
