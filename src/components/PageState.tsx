import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageStateProps {
  variant: 'loading' | 'error' | 'empty';
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function PageState({
  variant,
  title,
  description,
  icon: Icon,
  action,
  className,
}: PageStateProps) {
  const StateIcon = variant === 'loading' ? Loader2 : Icon || AlertTriangle;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-card/40 px-6 py-10 text-center',
        className,
      )}
    >
      <StateIcon
        aria-hidden="true"
        className={cn(
          'h-8 w-8 text-gold',
          variant === 'loading' && 'animate-spin',
          variant === 'error' && 'text-destructive',
          variant === 'empty' && 'opacity-70',
        )}
      />
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
