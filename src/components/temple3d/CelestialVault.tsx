import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function CelestialVault() {
  const starsRef = useRef<THREE.Points>(null);

  // Slowly rotate the stars
  useFrame((state, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.005;
    }
  });

  // Generate star positions for the curved ceiling
  const starCount = 200;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    // Distribute stars on a dome (curved ceiling)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.25; // Only top part
    const radius = 12;

    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta) * 0.8;
    starPositions[i * 3 + 1] = radius * Math.cos(phi) + 3;
    starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) * 1.2;

    // White/golden stars
    const brightness = 0.8 + Math.random() * 0.2;
    starColors[i * 3] = brightness;
    starColors[i * 3 + 1] = brightness;
    starColors[i * 3 + 2] = brightness * 0.9;
  }

  return (
    <group>
      {/* Curved white ceiling (dome) */}
      <mesh position={[0, 4, 0]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[14, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2.5]} />
        <meshStandardMaterial 
          color="#f0f5ff"
          roughness={0.8}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Decorative white ribs on ceiling */}
      {[...Array(8)].map((_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        return (
          <mesh 
            key={i} 
            position={[0, 8, 0]}
            rotation={[0, angle, 0]}
          >
            <torusGeometry args={[10, 0.15, 8, 32, Math.PI / 3]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </mesh>
        );
      })}

      {/* Stars on ceiling */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={starCount}
            array={starPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={starCount}
            array={starColors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation={true}
        />
      </points>

      {/* Central ceiling light */}
      <mesh position={[0, 10, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#fffacd" />
      </mesh>
      <pointLight position={[0, 10, 0]} intensity={2} color="#fffacd" distance={20} />
    </group>
  );
}
