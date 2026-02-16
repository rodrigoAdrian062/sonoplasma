import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AnimatedFlameProps {
  position?: [number, number, number];
  scale?: number;
  intensity?: number;
  lightDistance?: number;
  lightIntensity?: number;
}

const flameVertexShader = `
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Flicker displacement - stronger at top
    float heightFactor = smoothstep(0.0, 1.0, uv.y);
    float flicker = sin(uTime * 6.0 + uSeed) * 0.08 * heightFactor;
    float sway = sin(uTime * 3.5 + uSeed * 2.0) * 0.04 * heightFactor;
    float turbulence = sin(uTime * 12.0 + pos.y * 8.0 + uSeed) * 0.025 * heightFactor;
    
    pos.x += flicker + turbulence;
    pos.z += sway;
    
    // Vertical stretch
    float stretch = 1.0 + sin(uTime * 7.0 + uSeed) * 0.12;
    pos.y *= stretch;
    
    vDisplacement = heightFactor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const flameFragmentShader = `
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    // Radial distance from center
    float dist = length(vUv - vec2(0.5, 0.3));
    
    // Core: white-hot center
    vec3 coreColor = vec3(1.0, 1.0, 0.95);
    // Inner: bright yellow
    vec3 innerColor = vec3(1.0, 0.85, 0.2);
    // Outer: orange-red
    vec3 outerColor = vec3(1.0, 0.35, 0.05);
    
    // Mix based on UV height and distance
    float t = vUv.y;
    vec3 color = mix(coreColor, innerColor, smoothstep(0.0, 0.4, t));
    color = mix(color, outerColor, smoothstep(0.35, 0.9, t));
    
    // Alpha: soft edges, fade at top
    float alpha = 1.0 - smoothstep(0.15, 0.55, dist);
    alpha *= 1.0 - smoothstep(0.5, 1.0, t);
    alpha *= 0.9 + sin(uTime * 10.0 + uSeed) * 0.1;
    
    // Boost brightness for bloom
    color *= 1.5;
    
    gl_FragColor = vec4(color, alpha * 0.85);
  }
`;

export function AnimatedFlame({
  position = [0, 0, 0],
  scale = 1,
  intensity = 1,
  lightDistance = 3,
  lightIntensity = 0.8,
}: AnimatedFlameProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const seed = useMemo(() => Math.random() * 100, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSeed: { value: seed },
  }), [seed]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = t;
    }
    if (lightRef.current) {
      lightRef.current.intensity = lightIntensity * (0.85 + Math.sin(t * 8 + seed) * 0.15);
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* Outer flame glow */}
      <mesh>
        <coneGeometry args={[0.04 * intensity, 0.14 * intensity, 12, 1, true]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={flameVertexShader}
          fragmentShader={flameFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Tiny bright core */}
      <mesh position={[0, -0.02 * intensity, 0]}>
        <sphereGeometry args={[0.012 * intensity, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 0.02, 0]}
        intensity={lightIntensity}
        color="#ff8800"
        distance={lightDistance}
      />
    </group>
  );
}
