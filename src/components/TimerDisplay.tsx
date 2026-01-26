import { useMemo } from 'react';

interface TimerDisplayProps {
  seconds: number;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TimerDisplay({ seconds, isActive = false, size = 'md' }: TimerDisplayProps) {
  const formatted = useMemo(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [seconds]);

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div
      className={`
        font-display font-medium tracking-wider
        ${sizeClasses[size]}
        ${isActive ? 'text-gold animate-pulse-gold' : 'text-muted-foreground'}
        transition-colors duration-300
      `}
    >
      {formatted}
    </div>
  );
}
