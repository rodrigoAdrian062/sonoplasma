import { Text } from '@react-three/drei';

interface OfficerDesksProps {
  onClick?: (name: string) => void;
}

export function OfficerDesks({ onClick }: OfficerDesksProps) {
  // Individual officer desk with chair
  const OfficerDesk = ({
    position,
    rotation,
    title,
    name,
    symbol,
  }: {
    position: [number, number, number];
    rotation: number;
    title: string;
    name: string;
    symbol?: string;
  }) => (
    <group position={position} rotation={[0, rotation, 0]} onClick={() => onClick?.(name)}>
      {/* Desk */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.2, 0.08, 0.5]} />
        <meshStandardMaterial color="#3a2515" roughness={0.7} />
      </mesh>
      
      {/* Desk front panel */}
      <mesh position={[0, 0.2, 0.23]} castShadow>
        <boxGeometry args={[1.2, 0.4, 0.04]} />
        <meshStandardMaterial color="#2a1810" roughness={0.8} />
      </mesh>

      {/* Desk legs */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 0.2, -0.2]} castShadow>
          <boxGeometry args={[0.06, 0.4, 0.06]} />
          <meshStandardMaterial color="#2a1810" roughness={0.8} />
        </mesh>
      ))}

      {/* Chair */}
      <mesh position={[0, 0.25, -0.5]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.4]} />
        <meshStandardMaterial color="#8B0000" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.5, -0.68]} castShadow>
        <boxGeometry args={[0.5, 0.45, 0.06]} />
        <meshStandardMaterial color="#8B0000" roughness={0.6} />
      </mesh>

      {/* Three-branch candelabrum */}
      <group position={[0.4, 0.5, 0]}>
        {/* Base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.08, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Stem */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Three arms */}
        {[-0.06, 0, 0.06].map((x, i) => (
          <group key={i} position={[x, 0.18, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.015, 0.02, 0.06, 8]} />
              <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
            </mesh>
            {/* Candle */}
            <mesh position={[0, 0.08, 0]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.1, 8]} />
              <meshStandardMaterial color="#fffaf0" roughness={0.9} />
            </mesh>
            {/* Flame */}
            <pointLight position={[0, 0.15, 0]} intensity={0.15} color="#ff6600" distance={1.5} />
          </group>
        ))}
      </group>

      {/* Symbol on desk front */}
      {symbol && (
        <Text
          position={[0, 0.2, 0.26]}
          fontSize={0.12}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          {symbol}
        </Text>
      )}

      {/* Title label */}
      <Text
        position={[0, 0.9, 0]}
        fontSize={0.08}
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
      {/* === ORIENTE (atrás da balaustrada) === */}
      
      {/* Orador - Norte do Oriente, de frente para o Sul */}
      <OfficerDesk
        position={[-5, 0, -9]}
        rotation={Math.PI / 2}
        title="Orador"
        name="orador"
        symbol="📖"
      />

      {/* Secretário - Sul do Oriente, de frente para o Norte */}
      <OfficerDesk
        position={[5, 0, -9]}
        rotation={-Math.PI / 2}
        title="Secretário"
        name="secretario"
        symbol="✒"
      />

      {/* Altar dos Perfumes (entre VM e Secretário) */}
      <group position={[2.5, 0, -11]} onClick={() => onClick?.('altar-perfumes')}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, 0.7, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.18, 0.2, 0.1, 16]} />
          <meshStandardMaterial color="#2a1810" roughness={0.7} />
        </mesh>
        <Text
          position={[0, 1.1, 0]}
          fontSize={0.06}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          Altar dos Perfumes
        </Text>
      </group>

      {/* === COLUNA DO NORTE (fora da balaustrada) === */}
      
      {/* Tesoureiro - Norte, próximo à balaustrada */}
      <OfficerDesk
        position={[-5.5, 0, -5]}
        rotation={Math.PI / 2}
        title="Tesoureiro"
        name="tesoureiro"
        symbol="🔑"
      />

      {/* Hospitaleiro - Norte, mais ao Ocidente */}
      <OfficerDesk
        position={[-5.5, 0, -2]}
        rotation={Math.PI / 2}
        title="Hospitaleiro"
        name="hospitaleiro"
        symbol="💝"
      />

      {/* === COLUNA DO SUL (fora da balaustrada) === */}

      {/* Chanceler - Sul, próximo à balaustrada */}
      <OfficerDesk
        position={[5.5, 0, -5]}
        rotation={-Math.PI / 2}
        title="Chanceler"
        name="chanceler"
        symbol="⚜"
      />

      {/* === CENTRO DO TEMPLO === */}

      {/* Mestre de Cerimônias - centro, próximo ao Ocidente */}
      <OfficerDesk
        position={[0, 0, 6]}
        rotation={Math.PI}
        title="M∴ de Cerimônias"
        name="mestre-cerimonias"
        symbol="🗡"
      />

      {/* 1º Diácono - próximo ao 1º Vigilante (Ocidente) */}
      <OfficerDesk
        position={[-3, 0, 8]}
        rotation={Math.PI}
        title="1º Diácono"
        name="1-diacono"
      />

      {/* 2º Diácono - próximo ao 2º Vigilante (Sul) */}
      <OfficerDesk
        position={[5.5, 0, 3]}
        rotation={-Math.PI / 2}
        title="2º Diácono"
        name="2-diacono"
      />

      {/* Cobridor (Guarda do Templo) - na porta, Ocidente */}
      <OfficerDesk
        position={[3, 0, 12]}
        rotation={Math.PI}
        title="Cobridor"
        name="cobridor"
        symbol="⚔"
      />

      {/* Guarda do Templo Interno - dentro da porta */}
      <OfficerDesk
        position={[-3, 0, 12]}
        rotation={Math.PI}
        title="Guarda Interno"
        name="guarda-interno"
        symbol="🛡"
      />
    </group>
  );
}
