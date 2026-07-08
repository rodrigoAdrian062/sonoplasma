# Plenitude como Sistema-Mãe (multi-usuário)

Transformar o Plenitude no sistema-mãe: login/senha real, o Plenitude cria novos acessos, e cada pessoa tem seu próprio espaço isolado. As seções/etapas/áudios de hoje ficam como **modelo compartilhado** (todos veem, só o Plenitude edita). Novos usuários começam com espaço **vazio**. Login por **usuário + senha** (sem e-mail). Por enquanto o Plenitude apenas **cria** acessos.

## Como vai funcionar

```text
  Plenitude (super admin)
    ├── vê modelo compartilhado + edita
    ├── botão "Criar acesso" (usuário + senha)
    └── cada acesso criado = espaço próprio

  Usuário comum "loja01"
    ├── vê o modelo compartilhado (só leitura)
    └── cria e gerencia as próprias seções/etapas/áudios
```

- Login continua com "nome" e senha. Internamente cada nome vira um e-mail técnico `nome@plenitude.app`, invisível para o usuário.
- Só o Plenitude enxerga e usa o botão de criar acessos.
- Dados de hoje = modelo base (sem dono). Aparecem para todos; só o Plenitude altera.
- Cada novo usuário só vê/edita o que ele mesmo criar, além do modelo.

## Banco de dados (migração)

1. Enum `app_role` (`super_admin`, `user`) e tabela `user_roles` + função `has_role` (padrão seguro, sem recursão).
2. Tabela `profiles` (user_id, username) para mapear nome ↔ conta.
3. Adicionar coluna `owner_id uuid` (nula) em todas as tabelas de dados: `sonoplastia_secoes`, `sonoplastia_etapas`, `sonoplastia_etapa_audios`, `sonoplastia_audios_biblioteca`, `sonoplastia_audios_pastas`, `sonoplastia_configuracoes`, `sonoplastia_execucoes`. `owner_id = NULL` significa modelo compartilhado.
4. Trigger que preenche `owner_id = auth.uid()` automaticamente ao inserir.
5. Recriar RLS de cada tabela:
   - Ver: `owner_id IS NULL` (modelo) **ou** `owner_id = auth.uid()` (meu).
   - Criar/editar/excluir: apenas `owner_id = auth.uid()`; o super admin também pode editar o modelo (`owner_id IS NULL`).
   - GRANTs para `authenticated` e `service_role`.
6. Trigger em signup que cria `profiles` e define o papel `user`.

## Backend (edge function)

- `create-user`: recebe usuário + senha, valida que quem chama é `super_admin`, cria a conta com o Admin API (e-mail técnico, já confirmado), grava `profiles` e papel `user`. Só o Plenitude consegue usar.

## Conta do Plenitude

- Criar a conta real do Plenitude (`plenitude@plenitude.app` / senha atual `353959`) e atribuir o papel `super_admin`, mantendo o login "plenitude".

## Frontend

- `Auth.tsx`: trocar a checagem fixa por login real (`signIn`) convertendo nome → e-mail técnico. Mensagens de erro em pt-BR.
- Novo hook `useUserRole` para saber se é super admin.
- Nova página/rota `/usuarios` (ou botão no cabeçalho), visível só para o Plenitude, com formulário "Criar acesso" (usuário + senha) chamando a edge function.
- Ajustes pontuais nos hooks de dados onde hoje se assume um único registro global (ex.: `useSettings` usa `maybeSingle`) para funcionar por usuário.
- Botão de sair já existente é mantido.

## Detalhes técnicos

- Papéis ficam em `user_roles` (nunca no profile), com `has_role` `security definer` para evitar recursão de RLS.
- `owner_id` é preenchido por trigger, então a maioria das telas não precisa mudar as queries — a RLS filtra automaticamente.
- E-mails técnicos usam um domínio fixo interno; o usuário nunca vê e-mail.
- Autoconfirmação de e-mail ligada para contas criadas pelo Admin API (sem envio de e-mail).
