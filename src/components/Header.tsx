import { Sparkles } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold/10 rounded-lg">
            <Sparkles className="text-gold" size={24} />
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-foreground tracking-wide">
              Sonoplastia Cerimonial
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sistema de Ambientação Musical
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
