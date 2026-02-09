import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Auth() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signIn } = useAuth();
  const { settings } = useSettings();
  useThemeColor(settings?.cor_tema);

  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  // Track mouse movement for eye following effect
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Calculate offset from center (normalized to -1 to 1)
    const deltaX = (e.clientX - centerX) / centerX;
    const deltaY = (e.clientY - centerY) / centerY;
    
    // Limit the movement to a subtle range (max 8px)
    const maxOffset = 8;
    setEyeOffset({
      x: deltaX * maxOffset,
      y: deltaY * maxOffset * 0.6, // Less vertical movement
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Clear error when user types
  useEffect(() => {
    if (errorMessage) {
      setErrorMessage(null);
    }
  }, [nome, senha]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!nome.trim() || !senha.trim()) {
      setErrorMessage('Preencha nome e senha');
      triggerShake();
      toast.error('Preencha nome e senha');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert nome to email format for Supabase auth
      const email = `${nome.trim().toLowerCase()}@sistema.local`;
      
      const { error } = await signIn(email, senha);

      if (error) {
        const msg = error.message.includes('Invalid login credentials')
          ? 'Nome ou senha incorretos'
          : 'Erro ao fazer login';
        setErrorMessage(msg);
        triggerShake();
        toast.error(msg);
      } else {
        toast.success('Bem-vindo!');
        // Navigation is handled by the useEffect that watches user state
      }
    } catch (err) {
      setErrorMessage('Erro ao processar solicitação');
      triggerShake();
      toast.error('Erro ao processar solicitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  // Generate random particles
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: Math.random() * 10 + 15,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating Golden Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-gold"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.left}%`,
              bottom: '-20px',
              opacity: particle.opacity,
              animation: `floatUp ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
              boxShadow: `0 0 ${particle.size * 2}px hsl(var(--gold) / 0.5)`,
            }}
          />
        ))}
      </div>

      {/* Decorative pillars - Left side */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-64 opacity-[0.02]">
        <svg viewBox="0 0 30 200" className="w-full h-full" fill="none" stroke="currentColor">
          {/* Pillar column */}
          <rect x="5" y="20" width="20" height="160" className="stroke-gold" strokeWidth="1" />
          {/* Pillar capital */}
          <path d="M2 20 L28 20 L25 30 L5 30 Z" className="stroke-gold fill-gold/10" strokeWidth="1" />
          {/* Pillar base */}
          <path d="M2 180 L28 180 L25 170 L5 170 Z" className="stroke-gold fill-gold/10" strokeWidth="1" />
          {/* Letter J */}
          <text x="15" y="110" textAnchor="middle" className="fill-gold" fontSize="12" fontFamily="serif">J</text>
        </svg>
      </div>

      {/* Decorative pillars - Right side */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-64 opacity-[0.02]">
        <svg viewBox="0 0 30 200" className="w-full h-full" fill="none" stroke="currentColor">
          {/* Pillar column */}
          <rect x="5" y="20" width="20" height="160" className="stroke-gold" strokeWidth="1" />
          {/* Pillar capital */}
          <path d="M2 20 L28 20 L25 30 L5 30 Z" className="stroke-gold fill-gold/10" strokeWidth="1" />
          {/* Pillar base */}
          <path d="M2 180 L28 180 L25 170 L5 170 Z" className="stroke-gold fill-gold/10" strokeWidth="1" />
          {/* Letter B */}
          <text x="15" y="110" textAnchor="middle" className="fill-gold" fontSize="12" fontFamily="serif">B</text>
        </svg>
      </div>

      {/* Acacia branch - Top Right */}
      <div className="absolute top-16 right-16 w-32 h-40 opacity-[0.03] animate-[float_8s_ease-in-out_infinite]">
        <svg viewBox="0 0 80 100" className="w-full h-full" fill="none" stroke="currentColor">
          {/* Main stem */}
          <path
            d="M40 95 Q42 70 40 50 Q38 30 42 10"
            className="stroke-gold"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Left leaves */}
          <ellipse cx="28" cy="20" rx="10" ry="5" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(-30 28 20)" />
          <ellipse cx="25" cy="35" rx="10" ry="5" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(-40 25 35)" />
          <ellipse cx="26" cy="50" rx="9" ry="4" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(-35 26 50)" />
          <ellipse cx="28" cy="65" rx="8" ry="4" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(-30 28 65)" />
          <ellipse cx="30" cy="78" rx="7" ry="3" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(-25 30 78)" />
          {/* Right leaves */}
          <ellipse cx="52" cy="20" rx="10" ry="5" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(30 52 20)" />
          <ellipse cx="55" cy="35" rx="10" ry="5" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(40 55 35)" />
          <ellipse cx="54" cy="50" rx="9" ry="4" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(35 54 50)" />
          <ellipse cx="52" cy="65" rx="8" ry="4" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(30 52 65)" />
          <ellipse cx="50" cy="78" rx="7" ry="3" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(25 50 78)" />
          {/* Small leaf details */}
          <path d="M28 20 L40 25" className="stroke-gold/50" strokeWidth="0.5" />
          <path d="M25 35 L40 38" className="stroke-gold/50" strokeWidth="0.5" />
          <path d="M26 50 L40 52" className="stroke-gold/50" strokeWidth="0.5" />
          <path d="M52 20 L40 25" className="stroke-gold/50" strokeWidth="0.5" />
          <path d="M55 35 L40 38" className="stroke-gold/50" strokeWidth="0.5" />
          <path d="M54 50 L40 52" className="stroke-gold/50" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Acacia branch - Bottom Left (mirrored) */}
      <div className="absolute bottom-20 left-16 w-32 h-40 opacity-[0.03] -scale-x-100 animate-[float_8s_ease-in-out_infinite_1s]">
        <svg viewBox="0 0 80 100" className="w-full h-full" fill="none" stroke="currentColor">
          {/* Main stem */}
          <path
            d="M40 95 Q42 70 40 50 Q38 30 42 10"
            className="stroke-gold"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Left leaves */}
          <ellipse cx="28" cy="20" rx="10" ry="5" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(-30 28 20)" />
          <ellipse cx="25" cy="35" rx="10" ry="5" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(-40 25 35)" />
          <ellipse cx="26" cy="50" rx="9" ry="4" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(-35 26 50)" />
          <ellipse cx="28" cy="65" rx="8" ry="4" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(-30 28 65)" />
          {/* Right leaves */}
          <ellipse cx="52" cy="20" rx="10" ry="5" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(30 52 20)" />
          <ellipse cx="55" cy="35" rx="10" ry="5" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(40 55 35)" />
          <ellipse cx="54" cy="50" rx="9" ry="4" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(35 54 50)" />
          <ellipse cx="52" cy="65" rx="8" ry="4" className="stroke-gold fill-gold/5" strokeWidth="0.8" transform="rotate(30 52 65)" />
        </svg>
      </div>

      {/* Mosaic floor pattern hint at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-16 opacity-[0.015] overflow-hidden">
        <div className="flex flex-wrap">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 ${i % 2 === (Math.floor(i / 10) % 2) ? 'bg-gold' : 'bg-transparent'}`}
            />
          ))}
        </div>
      </div>

      <Card
        className={cn(
          "w-full max-w-sm border-border/50 shadow-xl transition-all",
          shake && "animate-[shake_0.5s_ease-in-out]",
          errorMessage && "border-destructive/50"
        )}
      >
        <CardHeader className="text-center space-y-4">
          {/* Dynamic Logo */}
          <div className="flex justify-center">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt="Logotipo"
                className="w-24 h-24 object-contain rounded-xl"
              />
            ) : (
              <div className="p-5 bg-gold/10 rounded-xl border border-gold/20">
                <Sparkles className="text-gold" size={56} />
              </div>
            )}
          </div>
          
          <div>
            <CardTitle className="text-2xl font-display">
              {settings?.nome_app || 'Sonoplastia Cerimonial'}
            </CardTitle>
            {settings?.subtitulo_app && (
              <CardDescription className="mt-1">
                {settings.subtitulo_app}
              </CardDescription>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message Banner */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-fade-in">
                <AlertCircle size={18} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Digite seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                className={cn(errorMessage && "border-destructive/50 focus:border-destructive")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={cn(
                    "pr-10",
                    errorMessage && "border-destructive/50 focus:border-destructive"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gold hover:bg-gold-glow text-background"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Credenciais fornecidas pelo administrador
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
