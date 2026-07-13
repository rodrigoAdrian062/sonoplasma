import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';

interface FocusModeContextValue {
  focusMode: boolean;
  toggleFocusMode: () => void;
  setFocusMode: (v: boolean) => void;
}

const FocusModeContext = createContext<FocusModeContextValue | undefined>(undefined);

export function FocusModeProvider({ children }: { children: ReactNode }) {
  // Modo foco ativado automaticamente ao entrar no app
  const [focusMode, setFocusMode] = useState(true);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev;
      if (next) {
        toast.success('Modo foco ativado', {
          description: 'Alertas e controles extras reduzidos. A tela permanece ativa.',
        });
      } else {
        toast('Modo foco desativado', {
          description: 'Controles e alertas normais restaurados.',
        });
      }
      return next;
    });
  }, []);

  // Mensagem na tela ao entrar no app com o modo foco ativo
  useEffect(() => {
    const t = setTimeout(() => {
      toast.success('Você entrou no modo foco', {
        description: 'Mantendo apenas o essencial na tela. Toque no botão para desativar.',
        duration: 5000,
      });
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // Wake Lock + Media Session enquanto o modo foco estiver ativo (em todo o sistema)
  useEffect(() => {
    if (!focusMode) return;
    let wakeLock: any = null;
    let released = false;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        /* ignora se não suportado */
      }
    };
    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !released) requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLock) {
        try { wakeLock.release(); } catch { /* ignora */ }
      }
    };
  }, [focusMode]);

  return (
    <FocusModeContext.Provider value={{ focusMode, toggleFocusMode, setFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  const ctx = useContext(FocusModeContext);
  if (!ctx) throw new Error('useFocusMode deve ser usado dentro de FocusModeProvider');
  return ctx;
}
