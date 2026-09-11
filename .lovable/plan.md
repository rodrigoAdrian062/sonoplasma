# Corrigir o erro ao entrar

## O que está acontecendo

O sistema tem apenas duas contas cadastradas. A principal é **plenitude**, e ela conseguiu entrar hoje às 03:01. As tentativas seguintes foram recusadas com "credenciais inválidas" — ou seja, o nome de usuário ou a senha digitados não correspondem a nenhuma conta existente. Não é falha de conexão nem do app.

Como o cadastro na tela de entrada foi removido, qualquer nome diferente de "plenitude" é recusado.

## O que eu vou fazer

1. Definir uma senha nova e conhecida para a conta **plenitude**, para você entrar com certeza.
   - Usuário: `plenitude`
   - Senha temporária: `Plenitude@2026`
2. Deixar uma mensagem de erro mais clara na tela de entrada, dizendo "usuário ou senha incorretos" em vez do texto técnico atual.

Depois de entrar, você pode trocar essa senha e criar outros acessos na página de usuários.

## Detalhes técnicos

- Atualização da senha do usuário `plenitude@plenitude.app` via API de administração de autenticação (não é migração de banco).
- Ajuste do tratamento de erro em `src/pages/Auth.tsx` para traduzir `invalid_credentials`.
