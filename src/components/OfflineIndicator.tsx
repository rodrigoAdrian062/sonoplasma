import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-500",
            isOnline 
              ? "text-emerald-500/60 bg-emerald-500/5 hover:text-emerald-500 hover:bg-emerald-500/10" 
              : "text-amber-500 bg-amber-500/15 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse"
          )}
        >
          {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span className={cn("hidden sm:inline", !isOnline && "inline")}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {isOnline 
          ? 'Conectado à internet' 
          : 'Modo Offline: Apenas áudios locais disponíveis'}
      </TooltipContent>
    </Tooltip>
  );
}
