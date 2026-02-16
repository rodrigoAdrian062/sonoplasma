import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export function CelestialVault() {
  const starsRef = useRef<THREE.Group>(null);
  const blazingStarRef = useRef<THREE.Group>(null);

  // Slow rotation for celestial effect + pulsing blazing star
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (starsRef.current) {
      starsRef.current.rotation.y = t * 0.008;
    }
    if (blazingStarRef.current) {
      const scale = 1 + Math.sin(t * 1.5) * 0.08;
      blazingStarRef.current.scale.set(scale, scale, scale);
    }
  });

  const roomWidth = 16;
  const roomLength = 28;
  const vaultHeight = 10;

  // Create enhanced starry vault texture with Milky Way
  const vaultTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Deep celestial background with gradient
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, '#0d1b3e');
    gradient.addColorStop(0.4, '#0a1628');
    gradient.addColorStop(0.7, '#081020');
    gradient.addColorStop(1, '#050a15');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Milky Way band
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-0.3);
    const milkyGrad = ctx.createLinearGradient(-canvas.width, 0, canvas.width, 0);
    milkyGrad.addColorStop(0, 'rgba(100, 120, 180, 0)');
    milkyGrad.addColorStop(0.3, 'rgba(100, 120, 180, 0.08)');
    milkyGrad.addColorStop(0.5, 'rgba(120, 140, 200, 0.12)');
    milkyGrad.addColorStop(0.7, 'rgba(100, 120, 180, 0.08)');
    milkyGrad.addColorStop(1, 'rgba(100, 120, 180, 0)');
    ctx.fillStyle = milkyGrad;
    ctx.fillRect(-canvas.width, -80, canvas.width * 2, 160);
    ctx.restore();

    // Dense star field
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2.5 + 0.3;
      const brightness = Math.floor(Math.random() * 155 + 100);
      const blueShift = Math.floor(Math.random() * 50);
      
      ctx.fillStyle = `rgba(${255 - blueShift}, ${255 - blueShift / 2}, ${brightness + blueShift}, ${0.4 + Math.random() * 0.6})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      // Star glow for brighter stars
      if (size > 1.5) {
        ctx.fillStyle = `rgba(200, 220, 255, 0.1)`;
        ctx.beginPath();
        ctx.arc(x, y, size * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Nebula patches
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const nebGrad = ctx.createRadialGradient(x, y, 0, x, y, 60 + Math.random() * 40);
      const hue = Math.random() * 60 + 200; // Blue-purple range
      nebGrad.addColorStop(0, `hsla(${hue}, 40%, 30%, 0.06)`);
      nebGrad.addColorStop(1, `hsla(${hue}, 40%, 20%, 0)`);
      ctx.fillStyle = nebGrad;
      ctx.fillRect(x - 100, y - 100, 200, 200);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  return (
    <group>
      {/* Arched vault/dome ceiling */}
      <mesh position={[0, vaultHeight, 0]}>
        <sphereGeometry args={[12, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial 
          map={vaultTexture}
          side={THREE.BackSide}
          roughness={0.95}
        />
      </mesh>

      {/* Rotating star group */}
      <group ref={starsRef} position={[0, vaultHeight - 1, 0]}>
        {/* Three stars of Orion's Belt */}
        {[-0.5, 0, 0.5].map((x, i) => (
          <group key={`orion-${i}`}>
            <mesh position={[x, 1, -2]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshStandardMaterial 
                color="#ffffff" 
                emissive="#ffffff"
                emissiveIntensity={1}
              />
            </mesh>
            {/* Star glow */}
            <pointLight position={[x, 1, -2]} intensity={0.4} color="#ffffff" distance={3} />
          </group>
        ))}

        {/* Pleiades (7 stars) */}
        {[
          [1.5, 0.8, 1], [1.7, 0.9, 0.8], [1.6, 0.7, 1.2],
          [1.8, 0.85, 1.1], [1.4, 0.75, 0.9], [1.55, 0.95, 1.05], [1.65, 0.8, 0.85]
        ].map((pos, i) => (
          <mesh key={`pleiades-${i}`} position={pos as [number, number, number]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial 
              color="#aaddff" 
              emissive="#aaddff"
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}

        {/* Hyades (5 stars) */}
        {[
          [-1.5, 0.6, 1.5], [-1.3, 0.7, 1.3], [-1.6, 0.65, 1.7],
          [-1.4, 0.8, 1.4], [-1.55, 0.55, 1.6]
        ].map((pos, i) => (
          <mesh key={`hyades-${i}`} position={pos as [number, number, number]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial 
              color="#ffddaa" 
              emissive="#ffddaa"
              emissiveIntensity={0.6}
            />
          </mesh>
        ))}

        {/* Ursa Major */}
        {[
          [-2, 1.2, -1], [-1.8, 1.3, -0.8], [-1.5, 1.25, -0.6], [-1.2, 1.2, -0.4],
          [-1, 1.15, -0.1], [-0.7, 1.1, 0.2], [-0.8, 1.3, 0.1]
        ].map((pos, i) => (
          <mesh key={`ursa-${i}`} position={pos as [number, number, number]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial 
              color="#ffffff" 
              emissive="#ffffff"
              emissiveIntensity={0.5}
            />
          </mesh>
        ))}

        {/* Aldebarã (Royal Star) */}
        <mesh position={[-1.4, 0.5, 1.4]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial 
            color="#ff8844" 
            emissive="#ff8844"
            emissiveIntensity={0.8}
          />
          <pointLight intensity={0.3} color="#ff8844" distance={2} />
        </mesh>

        {/* Arcturus */}
        <mesh position={[2, 1, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial 
            color="#ffaa44" 
            emissive="#ffaa44"
            emissiveIntensity={0.7}
          />
        </mesh>

        {/* Fomalhaut */}
        <mesh position={[0, 0.3, 3]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial 
            color="#aaccff" 
            emissive="#aaccff"
            emissiveIntensity={0.7}
          />
        </mesh>
      </group>

      {/* Sun (East) with enhanced rays */}
      <group position={[0, vaultHeight - 2, -roomLength / 2 + 2]}>
        <mesh>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial 
            color="#ffd700" 
            emissive="#ff9900"
            emissiveIntensity={1.2}
          />
        </mesh>
        <pointLight intensity={2} color="#ffd700" distance={10} />
        {/* Sun corona glow */}
        <mesh>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial 
            color="#ffd700" 
            transparent
            opacity={0.15}
            emissive="#ff9900"
            emissiveIntensity={0.5}
          />
        </mesh>
        {/* Sun rays */}
        {Array.from({ length: 16 }, (_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const len = i % 2 === 0 ? 0.5 : 0.3;
          return (
            <mesh 
              key={i} 
              position={[Math.cos(angle) * 1, Math.sin(angle) * 1, 0]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[len, 0.06, 0.02]} />
              <meshStandardMaterial 
                color="#ffd700" 
                emissive="#ff9900"
                emissiveIntensity={0.6}
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

      {/* Moon (West) - Enhanced Crescent */}
      <group position={[0, vaultHeight - 2.5, roomLength / 2 - 2]}>
        <mesh>
          <sphereGeometry args={[0.45, 32, 32]} />
          <meshStandardMaterial 
            color="#e8e8e8" 
            emissive="#8888bb"
            emissiveIntensity={0.4}
          />
        </mesh>
        {/* Moon glow */}
        <mesh>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial 
            color="#aaaacc" 
            transparent
            opacity={0.08}
            emissive="#aaaacc"
            emissiveIntensity={0.3}
          />
        </mesh>
        <mesh position={[0.2, 0, 0.1]}>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial color="#0a1628" />
        </mesh>
        <pointLight intensity={0.5} color="#aaaacc" distance={5} />
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

      {/* Blazing Star (Estrela Flamejante) - Enhanced with pulsing */}
      <group ref={blazingStarRef} position={[0, vaultHeight - 1.5, 0]}>
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
                emissiveIntensity={0.8}
              />
            </mesh>
          );
        })}
        {/* Center glow */}
        <mesh>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial 
            color="#ffd700" 
            emissive="#ffaa00"
            emissiveIntensity={0.7}
          />
        </mesh>
        {/* Outer glow ring */}
        <mesh>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial 
            color="#ffd700" 
            transparent
            opacity={0.06}
            emissive="#ffaa00"
            emissiveIntensity={0.3}
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
        <pointLight intensity={1.2} color="#ffd700" distance={6} />
      </group>

      {/* Planets */}
      {/* Jupiter */}
      <mesh position={[2, vaultHeight - 2.5, -roomLength / 2 + 4]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial 
          color="#cc9966" 
          emissive="#aa8844"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Mercury */}
      <mesh position={[1, vaultHeight - 2.2, -roomLength / 2 + 3]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color="#888888" 
          emissive="#666666"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Saturn with ring */}
      <mesh position={[-1, vaultHeight - 1.5, -3]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color="#ddcc88" 
          emissive="#bbaa66"
          emissiveIntensity={0.4}
        />
        <mesh rotation={[0.5, 0, 0]}>
          <torusGeometry args={[0.25, 0.02, 8, 32]} />
          <meshStandardMaterial 
            color="#ccbb77" 
            emissive="#aa9955"
            emissiveIntensity={0.3}
          />
        </mesh>
      </mesh>

      {/* Venus */}
      <mesh position={[-2, vaultHeight - 2.3, -roomLength / 2 + 5]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color="#ffffcc" 
          emissive="#ffffaa"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Mars */}
      <mesh position={[3, vaultHeight - 2, 2]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color="#cc4422" 
          emissive="#aa3311"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}
