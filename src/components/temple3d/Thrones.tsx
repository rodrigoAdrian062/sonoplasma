import { Text } from '@react-three/drei';

interface ThronesProps {
  onClick?: (name: string) => void;
}

export function Thrones({ onClick }: ThronesProps) {
  const Throne = ({
    position,
    title,
    name,
    isMain = false,
  }: {
    position: [number, number, number];
    title: string;
    name: string;
    isMain?: boolean;
  }) => {
    const scale = isMain ? 1.3 : 1;
    const platformHeight = isMain ? 0.6 : 0.3;

    return (
      <group position={position} onClick={() => onClick?.(name)}>
        {/* Platform/Dais */}
        <mesh position={[0, platformHeight / 2, 0]} castShadow>
          <boxGeometry args={[3 * scale, platformHeight, 2 * scale]} />
          <meshStandardMaterial color="#4a3728" roughness={0.7} />
        </mesh>

        {/* Platform step */}
        {isMain && (
          <mesh position={[0, 0.15, 1.2]} castShadow>
            <boxGeometry args={[3.5, 0.3, 0.8]} />
            <meshStandardMaterial color="#5a4738" roughness={0.7} />
          </mesh>
        )}

        {/* Chair back */}
        <mesh position={[0, platformHeight + 1, -0.6 * scale]} castShadow>
          <boxGeometry args={[1.2 * scale, 2 * scale, 0.15]} />
          <meshStandardMaterial color="#8B0000" roughness={0.6} />
        </mesh>

        {/* Chair back gold trim */}
        <mesh position={[0, platformHeight + 1.8, -0.55 * scale]} castShadow>
          <boxGeometry args={[1.3 * scale, 0.3, 0.05]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Chair seat */}
        <mesh position={[0, platformHeight + 0.4, -0.2 * scale]} castShadow>
          <boxGeometry args={[1 * scale, 0.1, 0.8 * scale]} />
          <meshStandardMaterial color="#8B0000" roughness={0.6} />
        </mesh>

        {/* Armrests */}
        {[-0.5, 0.5].map((x, i) => (
          <mesh key={i} position={[x * scale, platformHeight + 0.55, -0.2 * scale]} castShadow>
            <boxGeometry args={[0.1, 0.3, 0.8 * scale]} />
            <meshStandardMaterial color="#4a3728" roughness={0.7} />
          </mesh>
        ))}

        {/* Symbol on chair back */}
        {isMain && (
          <mesh position={[0, platformHeight + 1.3, -0.45 * scale]}>
            <circleGeometry args={[0.25, 32]} />
            <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
          </mesh>
        )}

        {/* Title text */}
        <Text
          position={[0, platformHeight + 2.5, -0.6 * scale]}
          fontSize={0.15}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          {title}
        </Text>

        {/* Desk in front */}
        <mesh position={[0, platformHeight + 0.5, 0.8 * scale]} castShadow>
          <boxGeometry args={[1.8 * scale, 0.8, 0.4]} />
          <meshStandardMaterial color="#4a3728" roughness={0.7} />
        </mesh>

        {/* Gavel on desk */}
        <group position={[0.4, platformHeight + 1, 0.8 * scale]} rotation={[0, 0.5, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.25, 8]} />
            <meshStandardMaterial color="#5a4738" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
            <meshStandardMaterial color="#4a3728" roughness={0.8} />
          </mesh>
        </group>
      </group>
    );
  };

  return (
    <group>
      {/* Venerável Mestre (Worshipful Master) - East */}
      <Throne
        position={[0, 0, -12]}
        title="Venerável Mestre"
        name="throne-vm"
        isMain={true}
      />

      {/* 1º Vigilante (Senior Warden) - West */}
      <Throne
        position={[0, 0, 10]}
        title="1º Vigilante"
        name="throne-1v"
      />

      {/* 2º Vigilante (Junior Warden) - South */}
      <Throne
        position={[8, 0, 0]}
        title="2º Vigilante"
        name="throne-2v"
      />
    </group>
  );
}
