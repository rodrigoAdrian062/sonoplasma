# Plano: Unificação do Modelo de Áudio na Música de Fundo da Apresentação

O objetivo é garantir que o sistema de música de fundo utilizado no modo apresentação utilize exatamente o mesmo modelo e comportamento (incluindo o wrapper de contexto e persistência) que o sistema global, assegurando a separação total entre os dois.

## Mudanças Propostas

### 1. Refatoração do Contexto de Áudio (`src/contexts/BackgroundMusicContext.tsx`)
- Garantir que as chaves de persistência (`localStorage`) sejam dinâmicas baseadas na `storageKey` fornecida ao provedor.
- Atualmente, algumas chaves como `VOLUME_KEY`, `AUTO_KEY`, etc., são estáticas. Elas precisam ser prefixadas ou substituídas para evitar que o volume da apresentação altere o volume global (e vice-versa).

### 2. Ajuste no Componente de Apresentação (`src/components/PresentationMode.tsx`)
- Refinar o `BackgroundMusicProvider` para garantir que ele passe todas as chaves de configuração necessárias para que a instância de "Apresentação" seja 100% isolada e funcional, seguindo o modelo do player principal.

### 3. Sincronização de Labels e UI (`src/components/BackgroundMusicPlayer.tsx`)
- Verificar se o `BackgroundMusicPlayer` reflete corretamente as configurações da instância ativa (volume, modo ducking, etc.) sem interferência da outra instância.

## Detalhes Técnicos
- Modificar o `BackgroundMusicProvider` para aceitar um objeto de `storageKeys` ou gerar chaves dinâmicas a partir de um prefixo.
- Garantir que a lógica de "Escuta do Player Principal" (para auto-ducking) funcione corretamente mesmo em instâncias separadas, observando o `useUniversalAudioPlayer`.

## Validação
- Abrir o modo apresentação e alterar o volume da música de fundo.
- Fechar e reabrir a apresentação para confirmar a persistência isolada.
- Confirmar que a música de fundo global permanece inalterada.
