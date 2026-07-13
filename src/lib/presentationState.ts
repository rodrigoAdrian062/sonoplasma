import { useSyncExternalStore } from 'react';

let presentationActive = false;
const listeners = new Set<() => void>();

export function setPresentationActive(active: boolean) {
  presentationActive = active;
  listeners.forEach((l) => l());
}

export function useIsPresentationActive() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => presentationActive,
    () => false
  );
}
