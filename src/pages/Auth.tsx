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
        navigate('/', { replace: true });
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Eye of Providence Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg
          viewBox="0 0 400 400"
          className="w-[600px] h-[600px] opacity-[0.03] animate-[pulse_8s_ease-in-out_infinite]"
          fill="none"
          stroke="currentColor"
        >
          {/* Outer radiating lines */}
          <g className="stroke-gold" strokeWidth="0.5">
            {[...Array(24)].map((_, i) => (
              <line
                key={i}
                x1="200"
                y1="200"
                x2={200 + 180 * Math.cos((i * 15 * Math.PI) / 180)}
                y2={200 + 180 * Math.sin((i * 15 * Math.PI) / 180)}
                opacity="0.5"
              />
            ))}
          </g>
          
          {/* Triangle */}
          <path
            d="M200 80 L320 280 L80 280 Z"
            className="stroke-gold"
            strokeWidth="2"
            fill="none"
          />
          
          {/* Inner triangle */}
          <path
            d="M200 120 L280 250 L120 250 Z"
            className="stroke-gold"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />
          
          {/* Eye outer */}
          <ellipse
            cx="200"
            cy="200"
            rx="50"
            ry="30"
            className="stroke-gold"
            strokeWidth="2"
            fill="none"
          />
          
          {/* Eye inner circle (iris) - follows mouse */}
          <g style={{ transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`, transition: 'transform 0.15s ease-out' }}>
            <circle
              cx="200"
              cy="200"
              r="18"
              className="stroke-gold fill-gold/10"
              strokeWidth="1.5"
            />
            
            {/* Pupil */}
            <circle
              cx="200"
              cy="200"
              r="8"
              className="fill-gold/30"
            />
            
            {/* Eye highlight */}
            <circle
              cx="196"
              cy="196"
              r="3"
              className="fill-gold/50"
            />
          </g>
          
          {/* Eyebrow arc */}
          <path
            d="M145 175 Q200 140 255 175"
            className="stroke-gold"
            strokeWidth="2"
            fill="none"
          />
          
          {/* Lower eye curve */}
          <path
            d="M150 200 Q200 240 250 200"
            className="stroke-gold"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />
        </svg>
      </div>
      
      {/* Subtle corner decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 opacity-[0.02]">
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-gold" strokeWidth="0.5" fill="none">
          <path d="M0 50 L50 0 L50 50 Z" />
          <path d="M10 50 L50 10 L50 50 Z" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-32 h-32 opacity-[0.02] rotate-180">
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-gold" strokeWidth="0.5" fill="none">
          <path d="M0 50 L50 0 L50 50 Z" />
          <path d="M10 50 L50 10 L50 50 Z" />
        </svg>
      </div>

      <Card
        className={cn(
          "w-full max-w-sm border-border/50 shadow-xl transition-all",
          shake && "animate-[shake_0.5s_ease-in-out]",
          errorMessage && "border-destructive/50"
        )}
      >
        <CardHeader className="text-center space-y-4">
          {/* Dynamic Logo with Masonic Animation */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer rotating rays */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 animate-[spin_20s_linear_infinite]">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 left-1/2 w-0.5 h-16 bg-gradient-to-t from-gold/0 via-gold/30 to-gold/0 origin-bottom"
                      style={{
                        transform: `translateX(-50%) rotate(${i * 30}deg)`,
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Inner pulsing glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-gold/10 animate-[pulse_3s_ease-in-out_infinite] blur-xl" />
              </div>
              
              {/* Triangle frame (Masonic symbol) */}
              <div className="absolute inset-0 flex items-center justify-center animate-[pulse_4s_ease-in-out_infinite]">
                <svg
                  viewBox="0 0 100 100"
                  className="w-36 h-36 -mt-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                >
                  <path
                    d="M50 15 L85 80 L15 80 Z"
                    className="stroke-gold/30"
                    strokeDasharray="4 2"
                  />
                </svg>
              </div>
              
              {/* Logo container with glow effect */}
              <div className="relative z-10">
                {settings?.logo_url ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gold/20 rounded-xl blur-md animate-[pulse_2s_ease-in-out_infinite]" />
                    <img
                      src={settings.logo_url}
                      alt="Logotipo"
                      className="relative w-24 h-24 object-contain rounded-xl animate-[float_6s_ease-in-out_infinite]"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gold/30 rounded-xl blur-lg animate-[pulse_2s_ease-in-out_infinite]" />
                    <div className="relative p-5 bg-gold/10 rounded-xl backdrop-blur-sm border border-gold/20 animate-[float_6s_ease-in-out_infinite]">
                      <Sparkles className="text-gold drop-shadow-[0_0_10px_rgba(var(--gold),0.5)]" size={56} />
                    </div>
                  </div>
                )}
              </div>
            </div>
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
