import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signIn } = useAuth();
  const { settings } = useSettings();
  useThemeColor(settings?.cor_tema);

  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !senha.trim()) {
      toast.error('Preencha nome e senha');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert nome to email format for Supabase auth
      const email = `${nome.trim().toLowerCase()}@sistema.local`;
      
      const { error } = await signIn(email, senha);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Nome ou senha incorretos');
        } else {
          toast.error('Erro ao fazer login');
        }
      } else {
        toast.success('Bem-vindo!');
        navigate('/', { replace: true });
      }
    } catch (err) {
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
      <Card className="w-full max-w-sm border-border/50 shadow-xl">
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
