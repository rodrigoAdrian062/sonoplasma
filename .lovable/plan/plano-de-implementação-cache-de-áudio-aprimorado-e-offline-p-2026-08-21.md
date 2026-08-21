# Plano de Implementação: Cache de Áudio Aprimorado e Offline Parcial

Este plano detalha as melhorias para o sistema de áudio, focando em performance (pré-carregamento), robustez offline e manutenção da regra de "apenas um áudio por vez".

## Alterações Propostas

### 1. Reforço do Cache (Service Worker)
- **Objetivo**: Garantir que os arquivos de áudio cacheados via `Cache Storage API` no frontend também sejam acessíveis pelo Service Worker quando o navegador interceptar requisições de mídia.
- **Implementação**: Ajustar a configuração do `vite-plugin-pwa` (se disponível) ou criar/estender o `sw.js` para incluir estratégias de cache específicas para áudio (CacheFirst ou StaleWhileRevalidate).

### 2. Otimização do `AudioPlayerContext`
- **Objetivo**: Melhorar a integração com o `audioCache.ts` para usar URLs de blob locais de forma transparente.
- **Implementação**:
    - Garantir que a função `play` sempre tente buscar a URL cacheada (`getPlayableAudioUrl`) antes de tentar o streaming remoto.
    - Manter a regra de um áudio por vez: ao iniciar uma nova música, o player anterior (seja HTML5, YouTube ou Spotify) é parado e limpo antes do próximo começar.

### 3. Melhoria na UI de Status
- **Objetivo**: Mostrar visualmente quando um áudio está "Pronto para offline" (cacheado).
- **Implementação**: Adicionar um pequeno indicador ou badge nos cards de música que mostre se o arquivo já está local.

### 4. Estratégia de Pré-carregamento Adaptativa
- **Objetivo**: Pré-carregar áudios de etapas futuras sem impactar a largura de banda durante a reprodução atual.
- **Implementação**: O sistema de prefetch (`usePrefetchEnabled`) priorizará downloads quando o player estiver ocioso ou em pausa.

## Detalhes Técnicos
- **Tecnologias**: Cache Storage API, Service Workers, Web Audio API.
- **Segurança**: Respeito às políticas de CORS para áudios externos.
- **Limites**: Cache limitado a 60 entradas (FIFO) para evitar consumo excessivo de disco no dispositivo.

---
*Nota: Este plano foca exclusivamente em infraestrutura e performance, sem alterar textos ou etiquetas visuais conforme solicitado.*
