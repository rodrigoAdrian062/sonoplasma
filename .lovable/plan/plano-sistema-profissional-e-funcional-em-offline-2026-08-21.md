# Plano: Sistema Profissional e Funcional em Offline

Este plano visa tornar o aplicativo "Sonoplasma" totalmente funcional sem conexão à internet, garantindo que rituais e execuções de áudio não sejam interrompidos por falhas de rede.

## Objetivos
1. Garantir que a interface do usuário (UI) e os dados básicos (seções, etapas) estejam disponíveis offline.
2. Fornecer indicadores claros de conectividade e estado de sincronização.
3. Facilitar a instalação do aplicativo como PWA para acesso rápido e cache de assets.
4. Otimizar o cache de áudio para arquivos locais (Supabase Storage).

## Etapas de Implementação

### 1. Melhoria na Estratégia do Service Worker
- Ajustar `vite.config.ts` para garantir que assets críticos (fontes, scripts, estilos) sejam cacheados via `CacheFirst`.
- Melhorar o fallback para rotas (página offline amigável se necessário, embora o PWA deva carregar o app completo).

### 2. Persistência de Dados em Cache (IndexDB/LocalStorage)
- Configurar o `QueryClient` no `src/App.tsx` para usar o `persistQueryClient`. Isso permitirá que as seções e etapas carregadas anteriormente fiquem disponíveis instantaneamente mesmo sem rede.
- Adicionar uma camada de persistência para as configurações de "áudio preparado" e volumes por etapa.

### 3. Interface de Conectividade
- Criar um componente `OfflineIndicator` discreto no cabeçalho.
- Exibir um aviso claro quando o usuário tentar realizar ações que exigem internet (como adicionar novos links do YouTube ou sincronizar com o banco de dados).

### 4. Otimização do Cache de Áudio (Já iniciado, agora refinado)
- Adicionar um botão "Baixar Seção Inteira" que pré-carrega todos os áudios (não-YouTube/Spotify) de uma seção para o cache local.
- Melhorar o `isAudioCached` para ser mais reativo e preciso.

### 5. Experiência de Instalação
- Melhorar o `InstallPWA` para ser mais visível em dispositivos móveis.

## Detalhes Técnicos

- **TanStack Query Persister**: Uso de `createSyncStoragePersister` para manter os dados das queries no `localStorage`.
- **Service Worker**: Refinamento de `runtimeCaching` no `vite-plugin-pwa`.
- **Audio Cache API**: Reforço da lógica em `src/lib/audioCache.ts` para gerenciar melhor as cotas de armazenamento.

---
**Nota**: Serviços externos como YouTube e Spotify **não podem** funcionar offline devido a restrições técnicas das APIs oficiais (IFrames e autenticação remota). O foco offline é total para arquivos de áudio hospedados (MP3/WAV no backend).
