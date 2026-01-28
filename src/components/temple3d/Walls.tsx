import { Text } from '@react-three/drei';

export function Walls() {
  const wallHeight = 8;
  const roomWidth = 16;
  const roomLength = 28;

  return (
    <group>
      {/* East Wall (behind VM) - Light blue */}
      <mesh position={[0, wallHeight / 2, -roomLength / 2]} castShadow receiveShadow>
        <boxGeometry args={[roomWidth, wallHeight, 0.3]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.6} />
      </mesh>

      {/* Red backdrop behind altar */}
      <mesh position={[0, wallHeight / 2 + 0.5, -roomLength / 2 + 0.2]}>
        <boxGeometry args={[4, 3, 0.1]} />
        <meshStandardMaterial color="#8B0000" roughness={0.8} />
      </mesh>

      {/* Delta/Triangle with All-Seeing Eye on East Wall */}
      <group position={[0, wallHeight - 1.5, -roomLength / 2 + 0.3]}>
        {/* Triangle background */}
        <mesh rotation={[0, 0, 0]}>
          <coneGeometry args={[1.2, 1.8, 3]} />
          <meshStandardMaterial 
            color="#d4af37" 
            roughness={0.3} 
            metalness={0.7}
          />
        </mesh>
        {/* Eye in center */}
        <mesh position={[0, -0.2, 0.1]}>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshStandardMaterial 
            color="#ffffff" 
            emissive="#ffd700"
            emissiveIntensity={0.3}
          />
        </mesh>
        <mesh position={[0, -0.2, 0.25]}>
          <sphereGeometry args={[0.1, 32, 32]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>

      {/* West Wall */}
      <mesh position={[0, wallHeight / 2, roomLength / 2]} castShadow receiveShadow>
        <boxGeometry args={[roomWidth, wallHeight, 0.3]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.6} />
      </mesh>

      {/* Door frame on West Wall */}
      <mesh position={[0, 2.5, roomLength / 2 - 0.1]}>
        <boxGeometry args={[3, 5, 0.2]} />
        <meshStandardMaterial color="#4a3728" roughness={0.7} />
      </mesh>

      {/* North Wall */}
      <mesh position={[-roomWidth / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, wallHeight, roomLength]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.6} />
      </mesh>

      {/* South Wall */}
      <mesh position={[roomWidth / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, wallHeight, roomLength]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.6} />
      </mesh>

      {/* White decorative molding on top of walls */}
      {[
        { pos: [0, wallHeight, -roomLength / 2], size: [roomWidth + 0.5, 0.4, 0.6] },
        { pos: [0, wallHeight, roomLength / 2], size: [roomWidth + 0.5, 0.4, 0.6] },
        { pos: [-roomWidth / 2, wallHeight, 0], size: [0.6, 0.4, roomLength] },
        { pos: [roomWidth / 2, wallHeight, 0], size: [0.6, 0.4, roomLength] },
      ].map((molding, i) => (
        <mesh key={i} position={molding.pos as [number, number, number]}>
          <boxGeometry args={molding.size as [number, number, number]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
        </mesh>
      ))}

      {/* Gold trim below molding */}
      {[
        { pos: [0, wallHeight - 0.3, -roomLength / 2 + 0.2], size: [roomWidth, 0.15, 0.1] },
        { pos: [0, wallHeight - 0.3, roomLength / 2 - 0.2], size: [roomWidth, 0.15, 0.1] },
        { pos: [-roomWidth / 2 + 0.2, wallHeight - 0.3, 0], size: [0.1, 0.15, roomLength] },
        { pos: [roomWidth / 2 - 0.2, wallHeight - 0.3, 0], size: [0.1, 0.15, roomLength] },
      ].map((trim, i) => (
        <mesh key={`trim-${i}`} position={trim.pos as [number, number, number]}>
          <boxGeometry args={trim.size as [number, number, number]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} />
        </mesh>
      ))}

      {/* Decorative gold elements on walls */}
      {[-8, -4, 0, 4, 8].map((z, i) => (
        <group key={`decor-north-${i}`}>
          {/* North wall decoration */}
          <mesh position={[-roomWidth / 2 + 0.2, 5, z]}>
            <boxGeometry args={[0.1, 1.5, 0.8]} />
            <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* South wall decoration */}
          <mesh position={[roomWidth / 2 - 0.2, 5, z]}>
            <boxGeometry args={[0.1, 1.5, 0.8]} />
            <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
