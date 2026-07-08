import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, UserPlus, Loader2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function UserManagement() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<string[]>([]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const uname = username.trim().toLowerCase();

    if (!/^[a-z0-9_.-]{3,30}$/.test(uname)) {
      toast.error('Usuário inválido (3-30 caracteres: letras, números, _ . -)');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { username: uname, password },
      });

      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || 'Erro ao criar acesso');
        return;
      }

      toast.success(`Acesso "${uname}" criado com sucesso!`);
      setCreated((prev) => [uname, ...prev]);
      setUsername('');
      setPassword('');
    } catch {
      toast.error('Erro ao criar acesso');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4 text-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Apenas o Plenitude pode acessar esta área.</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="text-gold" /> Criar acesso
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie um usuário e senha para outra pessoa ter o próprio espaço.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-lg"
        >
          <div className="space-y-2">
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: loja01"
              autoCapitalize="none"
              autoComplete="off"
              className="bg-secondary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                autoComplete="new-password"
                className="bg-secondary pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" /> Criar acesso
              </>
            )}
          </Button>
        </form>

        {created.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Criados nesta sessão</h2>
            <ul className="space-y-1">
              {created.map((u) => (
                <li
                  key={u}
                  className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-sm text-foreground"
                >
                  {u}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
