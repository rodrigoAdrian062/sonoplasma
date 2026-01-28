import { Text } from '@react-three/drei';

interface ThronesProps {
  onClick?: (name: string) => void;
}

export function Thrones({ onClick }: ThronesProps) {
  // VM Throne with red dossel (canopy)
  const VMThrone = () => (
    <group position={[0, 0, -12.5]} onClick={() => onClick?.('throne-vm')}>
      {/* Three steps to the Sólio (platform) */}
      <mesh position={[0, 0.1, 1.5]} castShadow>
        <boxGeometry args={[5, 0.2, 3.5]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.3, 1]} castShadow>
        <boxGeometry args={[4.5, 0.2, 2.5]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 0.5]} castShadow>
        <boxGeometry args={[4, 0.2, 1.5]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.3} />
      </mesh>

      {/* The Throne (Cátedra) with high back */}
      {/* Seat frame */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[1.2, 0.3, 0.9]} />
        <meshStandardMaterial color="#2a1810" roughness={0.7} />
      </mesh>
      {/* Seat cushion */}
      <mesh position={[0, 0.95, 0.1]} castShadow>
        <boxGeometry args={[1.1, 0.08, 0.7]} />
        <meshStandardMaterial color="#8B0000" roughness={0.6} />
      </mesh>
      {/* High back with carved symbols */}
      <mesh position={[0, 1.5, -0.4]} castShadow>
        <boxGeometry args={[1.2, 1.2, 0.15]} />
        <meshStandardMaterial color="#8B0000" roughness={0.6} />
      </mesh>
      {/* Back frame */}
      <mesh position={[0, 1.5, -0.48]} castShadow>
        <boxGeometry args={[1.3, 1.3, 0.08]} />
        <meshStandardMaterial color="#2a1810" roughness={0.7} />
      </mesh>
      {/* Armrests */}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={i} position={[x, 1.05, 0]} castShadow>
          <boxGeometry args={[0.1, 0.2, 0.7]} />
          <meshStandardMaterial color="#2a1810" roughness={0.7} />
        </mesh>
      ))}

      {/* Red Dossel (Canopy) */}
      {/* Top canopy */}
      <mesh position={[0, 3.2, -0.3]} castShadow>
        <boxGeometry args={[3, 0.15, 1.5]} />
        <meshStandardMaterial color="#8B0000" roughness={0.7} />
      </mesh>
      {/* Back curtain */}
      <mesh position={[0, 2.3, -0.8]} castShadow>
        <boxGeometry args={[2.8, 1.9, 0.08]} />
        <meshStandardMaterial color="#8B0000" roughness={0.6} />
      </mesh>
      {/* Side curtains */}
      {[-1.35, 1.35].map((x, i) => (
        <mesh key={i} position={[x, 2.3, 0.1]} castShadow>
          <boxGeometry args={[0.1, 1.9, 0.8]} />
          <meshStandardMaterial color="#8B0000" roughness={0.6} />
        </mesh>
      ))}
      {/* Gold fringe on canopy */}
      <mesh position={[0, 3.1, 0.4]}>
        <boxGeometry args={[3.1, 0.08, 0.02]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Gold cord decorations */}
      {[-1.2, 1.2].map((x, i) => (
        <mesh key={i} position={[x, 2.8, 0.3]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
      ))}

      <Text
        position={[0, 3.5, 0]}
        fontSize={0.15}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        Venerável Mestre
      </Text>
    </group>
  );

  // Vigilante Throne with 2 steps (1V) or 1 step (2V)
  const VigilanteThrone = ({
    position,
    title,
    name,
    steps,
    rotation = 0,
    symbol,
  }: {
    position: [number, number, number];
    title: string;
    name: string;
    steps: number;
    rotation?: number;
    symbol: string;
  }) => (
    <group position={position} rotation={[0, rotation, 0]} onClick={() => onClick?.(name)}>
      {/* Steps */}
      {Array.from({ length: steps }, (_, i) => (
        <mesh key={i} position={[0, 0.1 + i * 0.2, (steps - i) * 0.4]} castShadow>
          <boxGeometry args={[2.5 - i * 0.3, 0.2, 1.5 - i * 0.2]} />
          <meshStandardMaterial color="#e8e8e8" roughness={0.3} />
        </mesh>
      ))}

      {/* Chair */}
      <mesh position={[0, 0.2 + steps * 0.2, 0]} castShadow>
        <boxGeometry args={[0.9, 0.25, 0.7]} />
        <meshStandardMaterial color="#2a1810" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.35 + steps * 0.2, 0.05]} castShadow>
        <boxGeometry args={[0.85, 0.06, 0.6]} />
        <meshStandardMaterial color="#8B0000" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.65 + steps * 0.2, -0.32]} castShadow>
        <boxGeometry args={[0.9, 0.6, 0.1]} />
        <meshStandardMaterial color="#8B0000" roughness={0.6} />
      </mesh>
      {/* Armrests */}
      {[-0.42, 0.42].map((x, i) => (
        <mesh key={i} position={[x, 0.45 + steps * 0.2, -0.05]} castShadow>
          <boxGeometry args={[0.06, 0.15, 0.45]} />
          <meshStandardMaterial color="#2a1810" roughness={0.7} />
        </mesh>
      ))}

      {/* Desk in front */}
      <mesh position={[0, 0.35 + steps * 0.2, 0.8]} castShadow>
        <boxGeometry args={[1.6, 0.6, 0.4]} />
        <meshStandardMaterial color="#3a2515" roughness={0.7} />
      </mesh>

      {/* Symbol on desk */}
      <Text
        position={[0, 0.35 + steps * 0.2, 1.02]}
        fontSize={0.12}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        {symbol}
      </Text>

      {/* Three-branch candelabrum */}
      <group position={[0.5, 0.7 + steps * 0.2, 0.8]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.06, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
        {[-0.05, 0, 0.05].map((x, i) => (
          <group key={i} position={[x, 0.15, 0]}>
            <mesh position={[0, 0.05, 0]} castShadow>
              <cylinderGeometry args={[0.01, 0.01, 0.08, 8]} />
              <meshStandardMaterial color="#fffaf0" roughness={0.9} />
            </mesh>
            <pointLight position={[0, 0.12, 0]} intensity={0.1} color="#ff6600" distance={1} />
          </group>
        ))}
      </group>

      {/* Jewel (Rough stone for 1V, Cubic for 2V) */}
      {name === 'throne-1v' && (
        <group position={[-0.5, 0.75 + steps * 0.2, 0.8]}>
          <mesh castShadow>
            <boxGeometry args={[0.12, 0.12, 0.12]} />
            <meshStandardMaterial color="#808080" roughness={0.9} />
          </mesh>
        </group>
      )}
      {name === 'throne-2v' && (
        <group position={[-0.5, 0.75 + steps * 0.2, 0.8]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color="#a0a0a0" roughness={0.4} />
          </mesh>
        </group>
      )}

      <Text
        position={[0, 1.5 + steps * 0.2, 0]}
        fontSize={0.1}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
        rotation={[0, -rotation, 0]}
      >
        {title}
      </Text>
    </group>
  );

  return (
    <group>
      {/* Venerável Mestre (East - Oriente) */}
      <VMThrone />

      {/* 1º Vigilante (West-North, near passage, 2 steps) */}
      <VigilanteThrone
        position={[-3, 0, 9]}
        title="1º Vigilante"
        name="throne-1v"
        steps={2}
        rotation={Math.PI}
        symbol="⊥" // Level symbol
      />

      {/* 2º Vigilante (South, middle of South column, 1 step) */}
      <VigilanteThrone
        position={[5.5, 0, 0]}
        title="2º Vigilante"
        name="throne-2v"
        steps={1}
        rotation={-Math.PI / 2}
        symbol="↓" // Plumb symbol
      />
    </group>
  );
}
