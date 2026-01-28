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
    const scale = isMain ? 1.2 : 1;
    const platformHeight = isMain ? 0.8 : 0.4;

    return (
      <group position={position} onClick={() => onClick?.(name)}>
        {/* Platform/Dais - White marble look */}
        {isMain && (
          <>
            {/* Multiple steps for main throne */}
            <mesh position={[0, 0.15, 1.5]} castShadow>
              <boxGeometry args={[5, 0.3, 4]} />
              <meshStandardMaterial color="#e8e8e8" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.45, 0.8]} castShadow>
              <boxGeometry args={[4.5, 0.3, 2.5]} />
              <meshStandardMaterial color="#f0f0f0" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.75, 0]} castShadow>
              <boxGeometry args={[4, 0.3, 1.5]} />
              <meshStandardMaterial color="#f5f5f5" roughness={0.3} />
            </mesh>
          </>
        )}

        {/* Chair back - Red upholstery */}
        <mesh position={[0, platformHeight + 0.9, -0.4 * scale]} castShadow>
          <boxGeometry args={[1 * scale, 1.6 * scale, 0.12]} />
          <meshStandardMaterial color="#8B0000" roughness={0.6} />
        </mesh>

        {/* Chair seat */}
        <mesh position={[0, platformHeight + 0.35, 0]} castShadow>
          <boxGeometry args={[0.9 * scale, 0.08, 0.7 * scale]} />
          <meshStandardMaterial color="#8B0000" roughness={0.6} />
        </mesh>

        {/* Chair frame - Dark wood */}
        <mesh position={[0, platformHeight + 0.15, 0]} castShadow>
          <boxGeometry args={[1.1 * scale, 0.3, 0.8 * scale]} />
          <meshStandardMaterial color="#2a1810" roughness={0.7} />
        </mesh>

        {/* Armrests */}
        {[-0.45, 0.45].map((x, i) => (
          <mesh key={i} position={[x * scale, platformHeight + 0.5, -0.1]} castShadow>
            <boxGeometry args={[0.08, 0.25, 0.5 * scale]} />
            <meshStandardMaterial color="#2a1810" roughness={0.7} />
          </mesh>
        ))}

        {/* Desk in front */}
        <mesh position={[0, platformHeight + 0.45, 0.9 * scale]} castShadow>
          <boxGeometry args={[1.8 * scale, 0.7, 0.4]} />
          <meshStandardMaterial color="#3a2515" roughness={0.7} />
        </mesh>

        {/* Title text */}
        <Text
          position={[0, platformHeight + 2, -0.5 * scale]}
          fontSize={0.12}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          {title}
        </Text>
      </group>
    );
  };

  return (
    <group>
      {/* Venerável Mestre (Worshipful Master) - East, elevated */}
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
        position={[6, 0, 0]}
        title="2º Vigilante"
        name="throne-2v"
      />
    </group>
  );
}
