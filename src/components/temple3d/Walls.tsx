import { Text } from '@react-three/drei';

export function Walls() {
  const wallHeight = 10;
  const roomWidth = 20;
  const roomLength = 30;

  return (
    <group>
      {/* East Wall (behind VM) */}
      <mesh position={[0, wallHeight / 2, -roomLength / 2]} castShadow receiveShadow>
        <boxGeometry args={[roomWidth, wallHeight, 0.3]} />
        <meshStandardMaterial color="#1a237e" roughness={0.8} />
      </mesh>

      {/* Delta/Triangle with Eye on East Wall */}
      <group position={[0, 7, -14.7]}>
        {/* Triangle outline */}
        <mesh>
          <coneGeometry args={[2, 3, 3]} />
          <meshStandardMaterial 
            color="#d4af37" 
            roughness={0.3} 
            metalness={0.7}
            wireframe={true}
          />
        </mesh>
        {/* Eye in center */}
        <mesh position={[0, -0.3, 0.1]}>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial 
            color="#ffffff" 
            emissive="#ffd700"
            emissiveIntensity={0.3}
          />
        </mesh>
        <mesh position={[0, -0.3, 0.35]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>

      {/* Letter G below Delta */}
      <Text
        position={[0, 4.5, -14.7]}
        fontSize={1}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        G
      </Text>

      {/* West Wall */}
      <mesh position={[0, wallHeight / 2, roomLength / 2]} castShadow receiveShadow>
        <boxGeometry args={[roomWidth, wallHeight, 0.3]} />
        <meshStandardMaterial color="#1a237e" roughness={0.8} />
      </mesh>

      {/* North Wall */}
      <mesh position={[-roomWidth / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, wallHeight, roomLength]} />
        <meshStandardMaterial color="#1a237e" roughness={0.8} />
      </mesh>

      {/* South Wall */}
      <mesh position={[roomWidth / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, wallHeight, roomLength]} />
        <meshStandardMaterial color="#1a237e" roughness={0.8} />
      </mesh>

      {/* Decorative molding on top of walls */}
      {[
        { pos: [0, wallHeight, -roomLength / 2], size: [roomWidth + 0.5, 0.3, 0.5] },
        { pos: [0, wallHeight, roomLength / 2], size: [roomWidth + 0.5, 0.3, 0.5] },
        { pos: [-roomWidth / 2, wallHeight, 0], size: [0.5, 0.3, roomLength] },
        { pos: [roomWidth / 2, wallHeight, 0], size: [0.5, 0.3, roomLength] },
      ].map((molding, i) => (
        <mesh key={i} position={molding.pos as [number, number, number]}>
          <boxGeometry args={molding.size as [number, number, number]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.6} />
        </mesh>
      ))}

      {/* Windows/Symbols on walls */}
      {/* North Wall symbols */}
      {[-8, 0, 8].map((z, i) => (
        <mesh key={`north-${i}`} position={[-9.8, 5, z]}>
          <planeGeometry args={[1.5, 2]} />
          <meshStandardMaterial 
            color="#87CEEB" 
            emissive="#87CEEB"
            emissiveIntensity={0.2}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}

      {/* South Wall symbols */}
      {[-8, 0, 8].map((z, i) => (
        <mesh key={`south-${i}`} position={[9.8, 5, z]}>
          <planeGeometry args={[1.5, 2]} />
          <meshStandardMaterial 
            color="#87CEEB" 
            emissive="#87CEEB"
            emissiveIntensity={0.2}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}
