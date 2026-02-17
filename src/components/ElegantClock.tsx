import { useClock } from '@/hooks/useClock';

export function ElegantClock({ size = 'md' }: {size?: 'sm' | 'md';}) {
  const { formatted } = useClock();
  const [hours, minutes, seconds] = formatted.split(':');

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 bg-card/80 border border-gold/20 rounded-xl shadow-[0_0_12px_rgba(212,175,55,0.08)]">
        <span className="text-sm font-mono font-semibold text-gold tracking-wider">
          {hours}
          <span className="animate-pulse mx-0.5 text-gold/60">:</span>
          {minutes}
          <span className="animate-pulse mx-0.5 text-gold/60">:</span>
          <span className="text-gold/70">{seconds}</span>
        </span>
      </div>);

  }

  return (
    <div className="flex items-center px-4 py-2 bg-card/60 backdrop-blur-sm border border-gold/15 rounded-2xl shadow-[0_0_20px_rgba(212,175,55,0.06)] gap-0">
      <div className="flex items-baseline gap-0.5">
        <span className="text-xl font-mono font-bold text-gold tracking-widest tabular-nums">
          {hours}
        </span>
        <span className="text-xl font-mono font-bold text-gold/40 animate-pulse">:</span>
        <span className="text-xl font-mono font-bold text-gold tracking-widest tabular-nums">
          {minutes}
        </span>
        <span className="text-xl font-mono font-bold text-gold/40 animate-pulse">:</span>
        <span className="text-base font-mono font-medium text-gold/50 tracking-widest tabular-nums">
          {seconds}
        </span>
      </div>
    </div>);

}