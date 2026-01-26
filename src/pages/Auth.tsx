import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, LogIn, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
              <div className="p-5 bg-gold/10 rounded-xl">
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
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
                className={cn(errorMessage && "border-destructive/50 focus:border-destructive")}
              />
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
