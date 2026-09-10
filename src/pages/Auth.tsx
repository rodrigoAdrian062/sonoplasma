import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import appLogo from '@/assets/app-logo.png';

import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, AlertCircle, User, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Auth() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signIn } = useAuth();
  const { settings } = useSettings();
  useThemeColor(settings?.cor_tema);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);

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




  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const username = nome.trim().toLowerCase();
    if (!username || !senha) {
      const msg = 'Informe usuário e senha';
      setErrorMessage(msg);
      triggerShake();
      toast.error(msg);
      setIsSubmitting(false);
      return;
    }

    const email = `${username}@plenitude.app`;

    try {
      const { error } = await signIn(email, senha);

      if (error) {
        const msg = 'Usuário ou senha incorretos';
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
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
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

      <div
        className={cn(
          "relative z-10 w-full max-w-sm space-y-6 transition-all",
          shake && "animate-[shake_0.5s_ease-in-out]"
        )}
      >
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt="Logotipo"
                className="w-28 h-28 object-contain rounded-xl drop-shadow-lg"
              />
            ) : (
              <img
                src={appLogo}
                alt="Logotipo"
                width={1024}
                height={1024}
                className="w-28 h-28 object-contain drop-shadow-lg"
              />
            )}
          </div>
          
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground drop-shadow-md">
              {settings?.nome_app || 'Sonoplastia Cerimonial'}
            </h1>
            {settings?.subtitulo_app && (
              <p className="mt-1 text-sm text-muted-foreground drop-shadow-sm">
                {settings.subtitulo_app}
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-fade-in backdrop-blur-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}



          <div className="space-y-2">
            <Label htmlFor="nome" className="text-foreground/90">Nome</Label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome"
                autoComplete="username"
                className="pl-10 bg-background/60 backdrop-blur-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha" className="text-foreground/90">Senha</Label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="senha"
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                className="pl-10 pr-10 bg-background/60 backdrop-blur-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {modo === 'cadastrar' && (
            <div className="space-y-2">
              <Label htmlFor="confirmar" className="text-foreground/90">Confirmar senha</Label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmar"
                  type={showSenha ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  className="pl-10 bg-background/60 backdrop-blur-sm"
                  required
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gold hover:bg-gold-glow text-background shadow-lg shadow-gold/20"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {modo === 'cadastrar' ? 'Criando...' : 'Entrando...'}
              </>
            ) : (
              <>
                {modo === 'cadastrar' ? <Sparkles className="w-4 h-4 mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                {modo === 'cadastrar' ? 'Criar cadastro' : 'Entrar'}
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground/70 drop-shadow-sm">
          {modo === 'cadastrar'
            ? 'Escolha um nome sem espaços e uma senha de no mínimo 6 caracteres'
            : 'Credenciais fornecidas pelo administrador'}
        </p>
      </div>

    </div>
  );
}
