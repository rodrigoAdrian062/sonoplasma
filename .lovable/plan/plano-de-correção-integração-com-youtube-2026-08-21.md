# Plano de Correção: Integração com YouTube

O usuário relatou que a verificação de músicas do YouTube não está funcionando. Após análise, identifiquei que a função `toEmbedUrl` no arquivo `src/lib/embedUrl.ts` possui uma lógica de extração de ID do YouTube que falha em alguns casos comuns, e a função de busca de títulos `fetchLinkTitle` pode estar sendo bloqueada por CORS ou falhando silenciosamente.

## Alterações Propostas

### 1. Robustez na Extração de ID do YouTube
- Atualizar `src/lib/embedUrl.ts` para usar uma expressão regular mais abrangente na função `ytId`, garantindo suporte a URLs de `shorts`, `live`, `watch?v=`, `youtu.be`, etc.
- Garantir que a normalização de URLs no frontend e backend (`src/hooks/useAudioLibrary.ts`, `src/components/library/BulkAddLinksDialog.tsx`) seja consistente.

### 2. Melhoria na Busca de Títulos (Metadata)
- Adicionar logs de erro em `src/lib/fetchLinkTitle.ts` para facilitar o diagnóstico de falhas na API `noembed.com`.
- Implementar um fallback manual caso o título não possa ser buscado, usando o ID do vídeo como parte do nome.

### 3. Ajustes na UI da Biblioteca do YouTube
- Em `src/pages/YoutubeLibrary.tsx`, garantir que o botão "Adicionar" mostre um estado de carregamento claro enquanto o título está sendo buscado.
- Corrigir a lógica de `isYouTubeUrl` para ser mais flexível.

### 4. Verificação de Segurança e RLS
- Garantir que as permissões de banco de dados (`sonoplastia_audios_biblioteca`) permitam a inserção de registros com o tipo `youtube`.

## Detalhes Técnicos
- Refatorar a regex em `src/lib/embedUrl.ts` para: `/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/`.
- Sincronizar a lógica de `normalizeAudioUrl` em `src/hooks/useAudioLibrary.ts` com a detecção de streaming.
- Validar a política de CSP se houver bloqueios ao carregar o IFrame do YouTube.

Nenhuma alteração de texto visível ou lógica de negócio ritualística será modificada, focando apenas na correção técnica da integração.
