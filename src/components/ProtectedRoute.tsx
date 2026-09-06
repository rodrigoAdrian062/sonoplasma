import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

// Login desativado: o acesso é direto, sem tela de entrada.
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}
