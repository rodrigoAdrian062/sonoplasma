import { Text, useTexture } from '@react-three/drei';

export function Walls() {
  // Load the lodge emblem texture
  const emblemTexture = useTexture('/images/brasao-loja.png');
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

      {/* Delta/Triangle with All-Seeing Eye on East Wall - CENTER */}
      <group position={[0, wallHeight / 2 + 1.5, -roomLength / 2 + 0.3]}>
        {/* Triangle background - larger and more prominent */}
        <mesh rotation={[0, 0, 0]}>
          <coneGeometry args={[1.5, 2.2, 3]} />
          <meshStandardMaterial 
            color="#d4af37" 
            roughness={0.3} 
            metalness={0.7}
          />
        </mesh>
        {/* Rays of light emanating from triangle */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          return (
            <mesh 
              key={i} 
              position={[Math.cos(angle) * 1.8, Math.sin(angle) * 1.8 - 0.3, -0.1]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[0.5, 0.08, 0.02]} />
              <meshStandardMaterial 
                color="#ffd700" 
                emissive="#ff9900"
                emissiveIntensity={0.3}
              />
            </mesh>
          );
        })}
        {/* Eye - white part */}
        <mesh position={[0, -0.3, 0.15]}>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial 
            color="#ffffff" 
            emissive="#ffd700"
            emissiveIntensity={0.4}
          />
        </mesh>
        {/* Eye - iris */}
        <mesh position={[0, -0.3, 0.45]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Light from the eye */}
        <pointLight position={[0, -0.3, 0.5]} intensity={0.8} color="#ffd700" distance={5} />
        
        {/* Text label */}
        <Text
          position={[0, -1.5, 0.2]}
          fontSize={0.15}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          Delta Luminoso
        </Text>
      </group>

      {/* Lodge Emblem on NORTH Wall (lateral) */}
      <mesh position={[-roomWidth / 2 + 0.25, wallHeight / 2, -5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial 
          map={emblemTexture} 
          transparent 
          roughness={0.5}
        />
      </mesh>

      {/* Lodge Emblem on SOUTH Wall (lateral) */}
      <mesh position={[roomWidth / 2 - 0.25, wallHeight / 2, -5]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial 
          map={emblemTexture} 
          transparent 
          roughness={0.5}
        />
      </mesh>

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
