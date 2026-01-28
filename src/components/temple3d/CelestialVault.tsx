import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function CelestialVault() {
  const starsRef = useRef<THREE.Points>(null);

  // Slowly rotate the celestial vault
  useFrame((state, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.01;
    }
  });

  // Generate star positions
  const starCount = 500;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    // Distribute stars on a dome
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.4; // Only top hemisphere
    const radius = 25;

    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.cos(phi) + 5; // Offset up
    starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    // Random star colors (white, blue, yellow)
    const colorType = Math.random();
    if (colorType < 0.6) {
      // White
      starColors[i * 3] = 1;
      starColors[i * 3 + 1] = 1;
      starColors[i * 3 + 2] = 1;
    } else if (colorType < 0.8) {
      // Blue
      starColors[i * 3] = 0.7;
      starColors[i * 3 + 1] = 0.8;
      starColors[i * 3 + 2] = 1;
    } else {
      // Yellow/Gold
      starColors[i * 3] = 1;
      starColors[i * 3 + 1] = 0.9;
      starColors[i * 3 + 2] = 0.6;
    }
  }

  return (
    <group>
      {/* Dome background */}
      <mesh position={[0, 5, 0]}>
        <sphereGeometry args={[26, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial 
          color="#0a0a20" 
          side={THREE.BackSide}
        />
      </mesh>

      {/* Stars */}
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
          size={0.15}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation={true}
        />
      </points>

      {/* Moon */}
      <mesh position={[-8, 18, -8]}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial 
          color="#f5f5dc" 
          emissive="#f5f5dc"
          emissiveIntensity={0.3}
          roughness={0.8}
        />
      </mesh>

      {/* Sun */}
      <mesh position={[8, 18, -8]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial 
          color="#ffd700" 
          emissive="#ff8c00"
          emissiveIntensity={0.5}
          roughness={0.5}
        />
      </mesh>
      <pointLight position={[8, 18, -8]} intensity={2} color="#ffd700" distance={30} />
    </group>
  );
}
