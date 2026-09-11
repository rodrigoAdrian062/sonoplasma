# Corrigir o erro "new row violates row-level security policy"

## Situação atual (verificada agora)

Consultei as regras do banco e do armazenamento:

- As três pastas de arquivos (imagens do topo, ícones e áudios) estão públicas e têm uma regra de acesso liberada para visitantes e usuários logados.
- Todas as tabelas do sistema (seções, etapas, áudios, biblioteca, configurações) também estão liberadas.
- As tabelas de **perfis** e **papéis de usuário** só permitem leitura — nenhuma gravação direta pelo app.

Ou seja: com as regras como estão hoje, enviar imagem ou áudio deveria funcionar. Por isso não vou afirmar uma causa sem antes reproduzir o erro. A mensagem pode ser antiga (de antes do ajuste das regras) ou vir de uma tela específica que ainda grava em algo bloqueado.

## O que vou fazer

1. **Reproduzir o erro** no app rodando: tentar enviar uma imagem e um áudio e capturar a mensagem exata e a origem dela.
2. **Corrigir conforme o resultado**:
   - Se o bloqueio for no envio de arquivos: criar regras explícitas de enviar, ler, atualizar e excluir para cada uma das três pastas, em vez da regra genérica atual.
   - Se o bloqueio for em perfis/papéis: passar essa gravação para a função protegida do servidor, que já tem permissão, em vez de gravar direto do app.
3. **Melhorar a mensagem** mostrada na tela: em vez do texto técnico em inglês, algo claro como "Sem permissão para enviar este arquivo. Entre novamente e tente de novo."
4. Testar novamente envio de imagem, ícone e áudio até funcionar.

## Detalhes técnicos

- Verificado: `pg_policies` em `storage.objects` (1 política PERMISSIVE ALL para `anon, authenticated` nos buckets `logos`, `stage-icons`, `stage-audios`), políticas de `public.*` (ALL true), e privilégios INSERT/SELECT presentes para `anon`/`authenticated` em `storage.objects`.
- `profiles` e `user_roles` não têm políticas de INSERT/UPDATE/DELETE — gravações nessas tabelas só via edge functions (`create-user`, `update-user`, `delete-user`).
- Reprodução com Playwright em `http://localhost:8080`, capturando console e respostas de rede do endpoint de storage.
- Eventual migração: políticas separadas por comando em `storage.objects` por bucket; nenhuma alteração destrutiva.
- Tratamento de erro nos pontos de upload: `EditableBanner.tsx`, `IconPicker.tsx`, `SettingsModal.tsx`, `AudioListEditor.tsx`, `useAudioLibrary.ts`.
