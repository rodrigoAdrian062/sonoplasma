import { Text } from '@react-three/drei';
import { forwardRef, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';

interface CandelabraProps {
  position: [number, number, number];
  title: string;
  name: string;
  onClick?: (name: string) => void;
}

const Candelabra = forwardRef<Group, CandelabraProps>(({ position, title, name, onClick }, ref) => {
  const flameRef = useRef<Group>(null);

  useFrame((state) => {
    if (flameRef.current) {
      const t = state.clock.elapsedTime;
      flameRef.current.scale.y = 1 + Math.sin(t * 8 + position[0]) * 0.15;
      flameRef.current.position.x = Math.sin(t * 5 + position[2]) * 0.005;
    }
  });

  return (
    <group ref={ref} position={position} onClick={() => onClick?.(name)}>
      {/* Ornate base with detail */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.1, 16]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 0.1, 16]} />
        <meshStandardMaterial color="#c9a227" roughness={0.25} metalness={0.75} />
      </mesh>

      {/* Stem with decorative rings */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.07, 1.2, 16]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Decorative rings */}
      {[0.4, 0.6, 0.8].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <torusGeometry args={[0.08 + i * 0.01, 0.015, 16, 32]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
        </mesh>
      ))}

      {/* Top dish */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.1, 0.08, 16]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Candle */}
      <mesh position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.06, 0.45, 16]} />
        <meshStandardMaterial color="#fffaf0" roughness={0.9} />
      </mesh>
      {/* Wax drips */}
      <mesh position={[0.04, 1.52, 0]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#fff5e0" roughness={0.9} />
      </mesh>

      {/* Animated flame */}
      <group ref={flameRef} position={[0, 1.95, 0]}>
        <mesh>
          <coneGeometry args={[0.035, 0.12, 8]} />
          <meshBasicMaterial color="#ffaa00" />
        </mesh>
        {/* Inner flame */}
        <mesh position={[0, -0.01, 0]}>
          <coneGeometry args={[0.02, 0.08, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      <pointLight position={[0, 2, 0]} intensity={1.2} color="#ff8800" distance={8} />

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
  );
});

Candelabra.displayName = 'Candelabra';

interface LightsProps {
  onClick?: (name: string) => void;
}

export function Lights({ onClick }: LightsProps) {
  return (
    <group>
      {/* Sabedoria (Wisdom) - East */}
      <Candelabra position={[2, 0, -8]} title="Sabedoria" name="light-wisdom" onClick={onClick} />

      {/* Força (Strength) - West */}
      <Candelabra position={[-2, 0, 6]} title="Força" name="light-strength" onClick={onClick} />

      {/* Beleza (Beauty) - South */}
      <Candelabra position={[5, 0, 2]} title="Beleza" name="light-beauty" onClick={onClick} />

      {/* Enhanced central chandelier */}
      <group position={[0, 8, 0]}>
        {/* Chain */}
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 2.5, 8]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
        </mesh>

        {/* Ceiling medallion */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.6, 0.5, 0.1, 32]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
        </mesh>

        {/* Main body - ornate sphere */}
        <mesh position={[0, -1.3, 0]}>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
        </mesh>

        {/* Lower finial */}
        <mesh position={[0, -1.8, 0]}>
          <coneGeometry args={[0.15, 0.3, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
        </mesh>

        {/* Two tiers of light arms */}
        {[0, 1].map((tier) => (
          <group key={tier} position={[0, -1.3 - tier * 0.4, 0]}>
            {[...Array(8)].map((_, i) => {
              const angle = (i * Math.PI * 2) / 8 + tier * Math.PI / 8;
              const armLen = tier === 0 ? 1.2 : 0.9;
              return (
                <group key={i} rotation={[0, angle, 0]}>
                  {/* Curved arm */}
                  <mesh position={[armLen / 2, 0.15, 0]} rotation={[0, 0, -Math.PI / 8]}>
                    <cylinderGeometry args={[0.015, 0.02, armLen, 8]} />
                    <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
                  </mesh>
                  {/* Candle dish */}
                  <mesh position={[armLen * 0.85, 0.3, 0]}>
                    <cylinderGeometry args={[0.04, 0.03, 0.03, 12]} />
                    <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
                  </mesh>
                  {/* Candle */}
                  <mesh position={[armLen * 0.85, 0.42, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
                    <meshStandardMaterial color="#fffaf0" roughness={0.9} />
                  </mesh>
                  {/* Flame */}
                  <mesh position={[armLen * 0.85, 0.55, 0]}>
                    <coneGeometry args={[0.02, 0.06, 8]} />
                    <meshBasicMaterial color="#ffaa00" />
                  </mesh>
                  <pointLight position={[armLen * 0.85, 0.5, 0]} intensity={0.25} color="#ff9900" distance={4} />
                </group>
              );
            })}
          </group>
        ))}

        {/* Central chandelier ambient glow */}
        <pointLight position={[0, -1.3, 0]} intensity={0.5} color="#ffd700" distance={8} />
      </group>
    </group>
  );
}
