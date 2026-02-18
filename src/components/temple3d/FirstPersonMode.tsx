import { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

interface FirstPersonModeProps {
  enabled: boolean;
  onLock?: () => void;
  onUnlock?: () => void;
}

export function FirstPersonMode({ enabled, onLock, onUnlock }: FirstPersonModeProps) {
  const controlsRef = useRef<any>(null);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const SPEED = 8;
  const PLAYER_HEIGHT = 1.7;

  // Keyboard listeners
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true;
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = false;
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      keys.current = { forward: false, backward: false, left: false, right: false };
    };
  }, [enabled]);

  // Movement loop
  useFrame((state, delta) => {
    if (!enabled || !controlsRef.current?.isLocked) return;

    const camera = state.camera;
    
    // Get forward/right direction from camera
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // Calculate movement
    direction.current.set(0, 0, 0);
    if (keys.current.forward) direction.current.add(forward);
    if (keys.current.backward) direction.current.sub(forward);
    if (keys.current.right) direction.current.add(right);
    if (keys.current.left) direction.current.sub(right);
    direction.current.normalize();

    // Apply velocity with damping
    velocity.current.lerp(
      direction.current.multiplyScalar(SPEED),
      0.15
    );

    camera.position.add(velocity.current.clone().multiplyScalar(delta));
    
    // Keep player at walking height and within temple bounds
    camera.position.y = PLAYER_HEIGHT;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -9, 9);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -16, 18);
  });

  if (!enabled) return null;

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={() => onLock?.()}
      onUnlock={() => onUnlock?.()}
    />
  );
}
