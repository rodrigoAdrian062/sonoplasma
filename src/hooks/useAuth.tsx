import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { clearAudioBlobCache } from '@/lib/audioCache';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUserId = session?.user?.id ?? null;
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Bug fix: ao logar em outro aparelho/navegador (ou trocar de conta),
        // o React Query mantinha dados em cache do estado anterior e a UI só
        // atualizava após F5. Invalidamos/limpamos ao mudar de usuário.
        if (event === 'SIGNED_IN' && newUserId !== lastUserIdRef.current) {
          lastUserIdRef.current = newUserId;
          queryClient.invalidateQueries();
        } else if (event === 'SIGNED_OUT') {
          lastUserIdRef.current = null;
          queryClient.clear();
        } else if (event === 'INITIAL_SESSION') {
          lastUserIdRef.current = newUserId;
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      lastUserIdRef.current = session?.user?.id ?? null;
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, username?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: username ? { username } : undefined,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Bug corrigido: cache de áudio (blob URLs + Cache Storage) persistia
    // entre contas, causando vazamento em dispositivos compartilhados.
    try { clearAudioBlobCache(); } catch { /* noop */ }
    try {
      if (typeof caches !== 'undefined') await caches.delete('sonoplastia-audio-v1');
    } catch { /* noop */ }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
