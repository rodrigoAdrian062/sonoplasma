import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { AccessPermissionKey, hasPermission, type UserAccess } from '@/lib/access';

interface AccessGateProps {
  userAccess: UserAccess;
  permission: AccessPermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  description?: string;
}

export function AccessGate({
  userAccess,
  permission,
  children,
  fallback,
  title = 'Recurso exclusivo do plano Premium',
  description = 'Este recurso está bloqueado para o seu plano atual.',
}: AccessGateProps) {
  if (hasPermission(userAccess, permission)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
      <div className="mb-3 flex items-center gap-2 text-foreground">
        <Lock className="h-4 w-4 text-gold" />
        <span className="font-medium">{title}</span>
      </div>
      <p className="mb-3">{description}</p>
      <Button type="button" variant="outline" size="sm" className="border-gold/50 text-gold hover:bg-gold/10">
        Solicitar acesso
      </Button>
    </div>
  );
}
