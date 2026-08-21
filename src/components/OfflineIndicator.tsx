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
              ? "text-emerald-500/40 bg-emerald-500/5 hover:text-emerald-500 hover:bg-emerald-500/10" 
              : "text-amber-500 bg-amber-500/10 border border-amber-500/20 animate-pulse"
          )}
        >
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className={cn("hidden xs:inline", !isOnline && "inline")}>
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
