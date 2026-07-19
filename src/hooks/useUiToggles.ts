import { useEffect, useState, useCallback } from 'react';

/**
 * Toggles de visibilidade de botões/atalhos da UI.
 * Persistido em localStorage e reativo entre componentes/abas.
 */
export type UiToggleKey =
  | 'btn_apresentar'
  | 'btn_roteiro'
  | 'nav_biblioteca'
  | 'nav_roteiros'
  | 'nav_youtube'
  | 'nav_spotify';

const STORAGE_KEY = 'sonoplastia:uiToggles';
const EVENT = 'sonoplastia:uiToggles:changed';

const DEFAULTS: Record<UiToggleKey, boolean> = {
  btn_apresentar: true,
  btn_roteiro: true,
  nav_biblioteca: true,
  nav_roteiros: true,
  nav_youtube: true,
  nav_spotify: true,
};

function read(): Record<UiToggleKey, boolean> {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(next: Record<UiToggleKey, boolean>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useUiToggles() {
  const [state, setState] = useState<Record<UiToggleKey, boolean>>(() => read());

  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setToggle = useCallback((key: UiToggleKey, value: boolean) => {
    const next = { ...read(), [key]: value };
    write(next);
    setState(next);
  }, []);

  return { toggles: state, setToggle };
}

export function useUiToggle(key: UiToggleKey): boolean {
  const { toggles } = useUiToggles();
  return toggles[key];
}
