import { useMemo } from 'react';
import * as THREE from 'three';

interface RopeOfNodesProps {
  onClick?: () => void;
}

export function RopeOfNodes({ onClick }: RopeOfNodesProps) {
  const wallHeight = 8;
  const roomWidth = 16;
  const roomLength = 28;
  const ropeHeight = wallHeight - 0.5;

  // Create the rope path along walls (with 81 nodes)
  const ropePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 80; // Total segments for 81 nodes

    // Start from west wall (left of door) to south wall
    // Door is at center of west wall (z = roomLength/2)

    // Left side of door going to south corner
    const doorWidth = 1.5;
    const startZ = roomLength / 2 - doorWidth;
    const southWallX = roomWidth / 2 - 0.4;
    const northWallX = -roomWidth / 2 + 0.4;
    const eastWallZ = -roomLength / 2 + 0.4;
    const westWallZ = roomLength / 2 - 0.4;

    // Path: West (left of door) -> South -> East -> North -> West (right of door)
    // Total perimeter divided among 80 segments

    // Calculate total perimeter length
    const westLeftLength = westWallZ - startZ; // Left of door
    const southLength = southWallX - northWallX; // Full south wall
    const eastLength = westWallZ - eastWallZ; // Full east wall
    const northLength = southWallX - northWallX; // Full north wall
    const westRightLength = westWallZ - (roomLength / 2 + doorWidth); // Right of door

    // For simplicity, distribute nodes evenly along the perimeter
    // Starting from left borla at door

    // Left borla
    points.push(new THREE.Vector3(northWallX + 2, ropeHeight, westWallZ));

    // Along south wall (going east)
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const x = THREE.MathUtils.lerp(northWallX + 2, southWallX - 0.5, t);
      points.push(new THREE.Vector3(x, ropeHeight, westWallZ - 0.3));
    }

    // Around SE corner and along east wall
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const z = THREE.MathUtils.lerp(westWallZ - 0.5, eastWallZ + 0.5, t);
      points.push(new THREE.Vector3(southWallX - 0.3, ropeHeight, z));
    }

    // Around NE corner and along north wall
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const x = THREE.MathUtils.lerp(southWallX - 0.5, northWallX + 0.5, t);
      points.push(new THREE.Vector3(x, ropeHeight, eastWallZ + 0.3));
    }

    // Along west wall (back to door - right side)
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const z = THREE.MathUtils.lerp(eastWallZ + 0.5, westWallZ, t);
      points.push(new THREE.Vector3(northWallX + 0.3, ropeHeight, z));
    }

    // Right borla
    points.push(new THREE.Vector3(southWallX - 2, ropeHeight, westWallZ));

    return points;
  }, []);

  // Calculate node positions (81 nodes)
  const nodePositions = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const totalNodes = 81;
    
    // South wall nodes (20 nodes)
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const x = THREE.MathUtils.lerp(-5, 5, t);
      positions.push(new THREE.Vector3(roomWidth / 2 - 0.35, ropeHeight, x));
    }

    // East wall nodes (21 nodes - includes central node 41)
    for (let i = 0; i < 21; i++) {
      const t = i / 20;
      const z = THREE.MathUtils.lerp(5, -roomLength / 2 + 1, t);
      positions.push(new THREE.Vector3(roomWidth / 2 - 0.35 - (6 * t), ropeHeight, z));
    }

    // Around the east (Oriente) - the central node is at position 40 (0-indexed)
    // This represents the central node above the throne
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const x = THREE.MathUtils.lerp(0, -roomWidth / 2 + 0.35, t);
      positions.push(new THREE.Vector3(x, ropeHeight, -roomLength / 2 + 0.35));
    }

    // North wall nodes (20 nodes)
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const z = THREE.MathUtils.lerp(-roomLength / 2 + 1, roomLength / 2 - 2, t);
      positions.push(new THREE.Vector3(-roomWidth / 2 + 0.35, ropeHeight, z));
    }

    return positions;
  }, []);

  return (
    <group onClick={onClick}>
      {/* Rope line along walls */}
      <mesh position={[0, ropeHeight, 0]}>
        {/* We'll use individual segments to represent the rope */}
      </mesh>

      {/* 81 Nodes distributed along the walls */}
      {/* South wall (Coluna do Sul) - 20 nodes */}
      {Array.from({ length: 20 }, (_, i) => {
        const t = i / 19;
        const z = THREE.MathUtils.lerp(roomLength / 2 - 2, -roomLength / 2 + 4, t);
        return (
          <mesh key={`south-${i}`} position={[roomWidth / 2 - 0.25, ropeHeight, z]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#d4af37" roughness={0.4} metalness={0.6} />
          </mesh>
        );
      })}

      {/* East wall (Oriente) - 21 nodes including central node */}
      {Array.from({ length: 21 }, (_, i) => {
        const t = i / 20;
        const x = THREE.MathUtils.lerp(roomWidth / 2 - 0.5, -roomWidth / 2 + 0.5, t);
        const isCentralNode = i === 10; // Central node (41st overall)
        return (
          <mesh key={`east-${i}`} position={[x, ropeHeight, -roomLength / 2 + 0.25]}>
            <sphereGeometry args={[isCentralNode ? 0.12 : 0.08, 8, 8]} />
            <meshStandardMaterial 
              color={isCentralNode ? "#ffd700" : "#d4af37"} 
              roughness={0.3} 
              metalness={0.7}
              emissive={isCentralNode ? "#ffd700" : "#000000"}
              emissiveIntensity={isCentralNode ? 0.3 : 0}
            />
          </mesh>
        );
      })}

      {/* North wall (Coluna do Norte) - 20 nodes */}
      {Array.from({ length: 20 }, (_, i) => {
        const t = i / 19;
        const z = THREE.MathUtils.lerp(-roomLength / 2 + 4, roomLength / 2 - 2, t);
        return (
          <mesh key={`north-${i}`} position={[-roomWidth / 2 + 0.25, ropeHeight, z]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#d4af37" roughness={0.4} metalness={0.6} />
          </mesh>
        );
      })}

      {/* West wall - 20 nodes (10 each side of door) */}
      {/* Left of door (South side) */}
      {Array.from({ length: 10 }, (_, i) => {
        const t = i / 9;
        const x = THREE.MathUtils.lerp(roomWidth / 2 - 0.5, 2, t);
        return (
          <mesh key={`west-left-${i}`} position={[x, ropeHeight, roomLength / 2 - 0.25]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#d4af37" roughness={0.4} metalness={0.6} />
          </mesh>
        );
      })}

      {/* Right of door (North side) */}
      {Array.from({ length: 10 }, (_, i) => {
        const t = i / 9;
        const x = THREE.MathUtils.lerp(-2, -roomWidth / 2 + 0.5, t);
        return (
          <mesh key={`west-right-${i}`} position={[x, ropeHeight, roomLength / 2 - 0.25]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#d4af37" roughness={0.4} metalness={0.6} />
          </mesh>
        );
      })}

      {/* Left borla (Temperança) */}
      <group position={[3, ropeHeight - 0.5, roomLength / 2 - 0.1]}>
        <mesh>
          <coneGeometry args={[0.15, 0.4, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, -0.25, 0]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>

      {/* Right borla (Coragem) */}
      <group position={[-3, ropeHeight - 0.5, roomLength / 2 - 0.1]}>
        <mesh>
          <coneGeometry args={[0.15, 0.4, 16]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, -0.25, 0]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>

      {/* Rope lines connecting nodes */}
      {/* South wall rope */}
      <mesh position={[roomWidth / 2 - 0.25, ropeHeight, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, roomLength - 6, 8]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} />
      </mesh>

      {/* North wall rope */}
      <mesh position={[-roomWidth / 2 + 0.25, ropeHeight, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, roomLength - 6, 8]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} />
      </mesh>

      {/* East wall rope */}
      <mesh position={[0, ropeHeight, -roomLength / 2 + 0.25]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, roomWidth - 1, 8]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} />
      </mesh>
    </group>
  );
}
