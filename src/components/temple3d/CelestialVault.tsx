import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export function CelestialVault() {
  const starsRef = useRef<THREE.Group>(null);

  // Slow rotation for celestial effect
  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });

  const roomWidth = 16;
  const roomLength = 28;
  const vaultHeight = 10;

  // Create starry texture for vault (REAA: based on Northern Hemisphere star map)
  const createVaultTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Deep blue celestial background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a1628');
    gradient.addColorStop(0.5, '#1a2a4a');
    gradient.addColorStop(1, '#0a1628');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Random stars
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2 + 0.5;
      const brightness = Math.random() * 155 + 100;
      
      ctx.fillStyle = `rgba(255, 255, ${brightness}, ${0.5 + Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  return (
    <group>
      {/* Arched vault/dome ceiling */}
      <mesh position={[0, vaultHeight, 0]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[12, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial 
          map={createVaultTexture()}
          side={THREE.BackSide}
          roughness={0.9}
        />
      </mesh>

      {/* Rotating star group */}
      <group ref={starsRef} position={[0, vaultHeight - 1, 0]}>
        {/* Three stars of Orion's Belt (Principal Stars for Apprentice) */}
        {[-0.5, 0, 0.5].map((x, i) => (
          <mesh key={`orion-${i}`} position={[x, 1, -2]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial 
              color="#ffffff" 
              emissive="#ffffff"
              emissiveIntensity={0.8}
            />
            <pointLight intensity={0.3} color="#ffffff" distance={3} />
          </mesh>
        ))}

        {/* Pleiades (7 stars - for Masters) */}
        {[
          [1.5, 0.8, 1], [1.7, 0.9, 0.8], [1.6, 0.7, 1.2],
          [1.8, 0.85, 1.1], [1.4, 0.75, 0.9], [1.55, 0.95, 1.05], [1.65, 0.8, 0.85]
        ].map((pos, i) => (
          <mesh key={`pleiades-${i}`} position={pos as [number, number, number]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial 
              color="#aaddff" 
              emissive="#aaddff"
              emissiveIntensity={0.6}
            />
          </mesh>
        ))}

        {/* Hyades (5 stars - for Companions) */}
        {[
          [-1.5, 0.6, 1.5], [-1.3, 0.7, 1.3], [-1.6, 0.65, 1.7],
          [-1.4, 0.8, 1.4], [-1.55, 0.55, 1.6]
        ].map((pos, i) => (
          <mesh key={`hyades-${i}`} position={pos as [number, number, number]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial 
              color="#ffddaa" 
              emissive="#ffddaa"
              emissiveIntensity={0.5}
            />
          </mesh>
        ))}

        {/* Ursa Major (Big Dipper) - North */}
        {[
          [-2, 1.2, -1], [-1.8, 1.3, -0.8], [-1.5, 1.25, -0.6], [-1.2, 1.2, -0.4],
          [-1, 1.15, -0.1], [-0.7, 1.1, 0.2], [-0.8, 1.3, 0.1]
        ].map((pos, i) => (
          <mesh key={`ursa-${i}`} position={pos as [number, number, number]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial 
              color="#ffffff" 
              emissive="#ffffff"
              emissiveIntensity={0.4}
            />
          </mesh>
        ))}

        {/* Aldebarã (Royal Star) */}
        <mesh position={[-1.4, 0.5, 1.4]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial 
            color="#ff8844" 
            emissive="#ff8844"
            emissiveIntensity={0.7}
          />
          <pointLight intensity={0.2} color="#ff8844" distance={2} />
        </mesh>

        {/* Arcturus */}
        <mesh position={[2, 1, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial 
            color="#ffaa44" 
            emissive="#ffaa44"
            emissiveIntensity={0.6}
          />
        </mesh>

        {/* Fomalhaut (Royal Star) - South */}
        <mesh position={[0, 0.3, 3]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial 
            color="#aaccff" 
            emissive="#aaccff"
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>

      {/* Sun (East - Oriente) with rays */}
      <group position={[0, vaultHeight - 2, -roomLength / 2 + 2]}>
        <mesh>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial 
            color="#ffd700" 
            emissive="#ff9900"
            emissiveIntensity={0.8}
          />
        </mesh>
        <pointLight intensity={1.5} color="#ffd700" distance={8} />
        {/* Sun rays */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          return (
            <mesh 
              key={i} 
              position={[Math.cos(angle) * 0.9, Math.sin(angle) * 0.9, 0]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[0.4, 0.08, 0.02]} />
              <meshStandardMaterial 
                color="#ffd700" 
                emissive="#ff9900"
                emissiveIntensity={0.5}
              />
            </mesh>
          );
        })}
        <Text
          position={[0, -1, 0]}
          fontSize={0.15}
          color="#d4af37"
          anchorX="center"
          anchorY="middle"
        >
          Sol
        </Text>
      </group>

      {/* Moon (West - Ocidente) - Crescent */}
      <group position={[0, vaultHeight - 2.5, roomLength / 2 - 2]}>
        <mesh>
          <sphereGeometry args={[0.45, 32, 32]} />
          <meshStandardMaterial 
            color="#e8e8e8" 
            emissive="#aaaacc"
            emissiveIntensity={0.3}
          />
        </mesh>
        {/* Shadow to create crescent effect */}
        <mesh position={[0.2, 0, 0.1]}>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial color="#0a1628" />
        </mesh>
        <pointLight intensity={0.3} color="#aaaacc" distance={4} />
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.15}
          color="#c0c0c0"
          anchorX="center"
          anchorY="middle"
        >
          Lua
        </Text>
      </group>

      {/* Blazing Star (Estrela Flamejante) at center - Pythagorean symbol */}
      <group position={[0, vaultHeight - 1.5, 0]}>
        {/* Five-pointed star */}
        {Array.from({ length: 5 }, (_, i) => {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          return (
            <mesh 
              key={i} 
              position={[Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4]}
              rotation={[Math.PI / 2, 0, angle + Math.PI / 2]}
            >
              <coneGeometry args={[0.15, 0.5, 3]} />
              <meshStandardMaterial 
                color="#ffd700" 
                emissive="#ffaa00"
                emissiveIntensity={0.6}
              />
            </mesh>
          );
        })}
        {/* Center */}
        <mesh>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial 
            color="#ffd700" 
            emissive="#ffaa00"
            emissiveIntensity={0.5}
          />
        </mesh>
        {/* Letter G */}
        <Text
          position={[0, 0, 0.25]}
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          G
        </Text>
        <pointLight intensity={0.8} color="#ffd700" distance={5} />
      </group>

      {/* Jupiter (East, planet) */}
      <mesh position={[2, vaultHeight - 2.5, -roomLength / 2 + 4]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial 
          color="#cc9966" 
          emissive="#aa8844"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Mercury (near Sun) */}
      <mesh position={[1, vaultHeight - 2.2, -roomLength / 2 + 3]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color="#888888" 
          emissive="#666666"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Saturn (near Orion) */}
      <mesh position={[-1, vaultHeight - 1.5, -3]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color="#ddcc88" 
          emissive="#bbaa66"
          emissiveIntensity={0.3}
        />
        {/* Saturn's ring */}
        <mesh rotation={[0.5, 0, 0]}>
          <torusGeometry args={[0.25, 0.02, 8, 32]} />
          <meshStandardMaterial 
            color="#ccbb77" 
            emissive="#aa9955"
            emissiveIntensity={0.2}
          />
        </mesh>
      </mesh>
    </group>
  );
}
