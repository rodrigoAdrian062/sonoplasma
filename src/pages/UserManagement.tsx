import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ACCESS_PERMISSION_KEYS, buildPermissions, normalizePermissions, type AccessPlan, type AccessPermissionKey } from '@/lib/access';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, UserPlus, Loader2, Eye, EyeOff, ShieldAlert, Users, Trash2, Pencil, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface ManagedUser {
  user_id: string;
  username: string;
  password: string | null;
  created_at: string;
  plan: AccessPlan;
  permissions: Record<AccessPermissionKey, boolean>;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingAccess, setSavingAccess] = useState<Record<string, boolean>>({});

  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['managed-users'],
    enabled: isSuperAdmin && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(String(data.error));
      if (!Array.isArray(data?.users)) throw new Error('A resposta do servidor não contém a lista de usuários.');

      return data.users.map((item: any) => ({
        user_id: item.user_id,
        username: item.username,
        password: item.password ?? null,
        created_at: item.created_at,
        plan: (item.plan as AccessPlan | undefined) ?? 'free',
        permissions: normalizePermissions(item.permissions ?? buildPermissions((item.plan as AccessPlan | undefined) ?? 'free')),
      })) as ManagedUser[];
    },
  });

  useEffect(() => {
    if (!users.length) return;
  }, [users]);

  const updateUserAccess = async (managedUser: ManagedUser) => {
    setSavingAccess((prev) => ({ ...prev, [managedUser.user_id]: true }));
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: managedUser.plan,
          permissions: managedUser.permissions,
        })
        .eq('user_id', managedUser.user_id);

      if (error) throw error;
      toast.success(`Acesso de "${managedUser.username}" atualizado!`);
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
    } catch {
      toast.error('Erro ao atualizar permissão do usuário');
    } finally {
      setSavingAccess((prev) => ({ ...prev, [managedUser.user_id]: false }));
    }
  };

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
      setUsername('');
      setPassword('');
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
    } catch {
      toast.error('Erro ao criar acesso');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (u: ManagedUser) => {
    if (editPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setSavingEdit(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: { user_id: u.user_id, password: editPassword },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || 'Erro ao salvar');
        return;
      }
      toast.success('Senha atualizada!');
      setEditingId(null);
      setEditPassword('');
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: deleteTarget.user_id },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || 'Erro ao excluir');
        return;
      }
      toast.success(`Acesso "${deleteTarget.username}" excluído`);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
    } catch {
      toast.error('Erro ao excluir');
    } finally {
      setDeleting(false);
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
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="text-gold" /> Acessos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie usuários e senhas para outras pessoas terem o próprio espaço.
          </p>
        </div>

        {/* Create form */}
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-lg"
        >
          <h2 className="flex items-center gap-2 font-medium text-foreground">
            <UserPlus size={18} className="text-gold" /> Criar acesso
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</>
            ) : (
              <><UserPlus className="mr-2 h-4 w-4" /> Criar acesso</>
            )}
          </Button>
        </form>

        {/* List */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Acessos criados ({users.length})
          </h2>

          {usersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
            </div>
          ) : users.length === 0 ? (
            usersError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
                <p className="text-sm text-destructive">
                  Não foi possível carregar os usuários: {usersError instanceof Error ? usersError.message : 'erro desconhecido'}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetchUsers()}>
                  Tentar novamente
                </Button>
              </div>
            ) : (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Nenhum acesso criado ainda.
            </p>
            )
          ) : (
            <ul className="space-y-2">
              {users.map((u) => {
                const isEditing = editingId === u.user_id;
                const pwVisible = visiblePasswords[u.user_id];
                return (
                  <li
                    key={u.user_id}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{u.username}</p>
                        {isEditing ? (
                          <div className="mt-2 flex items-center gap-2">
                            <Input
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder="nova senha"
                              className="h-8 bg-secondary text-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={() => handleSaveEdit(u)}
                              disabled={savingEdit}
                            >
                              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={() => { setEditingId(null); setEditPassword(''); }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Senha: <span className="font-mono">{pwVisible ? (u.password || '—') : '••••••'}</span>
                              <button
                                type="button"
                                onClick={() => setVisiblePasswords((p) => ({ ...p, [u.user_id]: !p[u.user_id] }))}
                                className="ml-2 align-middle text-muted-foreground hover:text-foreground"
                              >
                                {pwVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {(['free', 'premium', 'admin'] as const).map((plan) => (
                                <button
                                  key={plan}
                                  type="button"
                                  onClick={async () => {
                                    const nextUser = { ...u, plan };
                                    const nextPermissions = plan === 'admin'
                                      ? buildPermissions('admin')
                                      : plan === 'premium'
                                        ? buildPermissions('premium')
                                        : buildPermissions('free');
                                    await updateUserAccess({ ...nextUser, permissions: nextPermissions });
                                  }}
                                  className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors ${u.plan === plan ? 'border-gold bg-gold/10 text-gold' : 'border-border bg-secondary text-muted-foreground hover:text-foreground'}`}
                                >
                                  {plan}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {ACCESS_PERMISSION_KEYS.map((permissionKey) => (
                                <label key={permissionKey} className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-2 py-1.5 text-[11px] text-muted-foreground">
                                  <input
                                    type="checkbox"
                                    checked={!!u.permissions[permissionKey]}
                                    onChange={async () => {
                                      const nextPermissions = {
                                        ...u.permissions,
                                        [permissionKey]: !u.permissions[permissionKey],
                                      };
                                      await updateUserAccess({ ...u, permissions: nextPermissions });
                                    }}
                                  />
                                  {permissionKey}
                                </label>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => { setEditingId(u.user_id); setEditPassword(''); }}
                            title="Editar senha"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(u)}
                            title="Excluir acesso"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir acesso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o acesso "{deleteTarget?.username}"? Essa pessoa perderá o login e não poderá mais entrar. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
