# Plano de Verificação e Correção de Áudio e Volume

Este plano foca na verificação completa do sistema de áudio, volumes e correções de bugs relatados, garantindo a independência entre a música de fundo e o player principal, além de estabilizar o comportamento do volume e controles.

## Tarefas Principais

### 1. Independência de Volume e Controles
- [ ] **BackgroundMusicContext.tsx**: Garantir que a lógica de "ducking" (baixar volume quando o principal toca) use o volume independente da música de fundo e não afete o volume global.
- [ ] **AudioPlayerContext.tsx**: Verificar se a função de fade-out está restaurando corretamente o volume do player após a conclusão, sem interferir no estado global.
- [ ] **VolumeControl.tsx**: Validar se os controles de volume (scroll do mouse) estão incrementando corretamente de 1 em 1 e respeitando os limites configurados.

### 2. Estabilização de Reprodução
- [ ] **BackgroundMusicContext.tsx**: Corrigir a transição entre faixas (crossfade) para evitar picos de volume ou silêncio.
- [ ] **AudioPlayerContext.tsx**: Validar a inicialização do `AudioContext` em dispositivos móveis (tablets) para evitar o erro de áudio suspenso.
- [ ] **YouTube/Spotify**: Verificar se a extração de ID e o carregamento dos frames estão estáveis e se o volume inicial (startVolume) é respeitado.

### 3. Melhorias na UI de Volume e Áudio
- [ ] **BackgroundMusicPlayer.tsx**: Garantir que o scroll no volume não cause rolagem na página ou na lista de músicas.
- [ ] **PresentationMode.tsx**: Verificar a exibição dos indicadores de volume e a sincronia com as etapas.

## Detalhes Técnicos
- Uso de `localStorage` com chaves prefixadas para persistência isolada (`sonoplastia:volume`, `bg-music-volume-v1`).
- Incrementos de volume baseados em `Math.round(currentVolume * 100 + step) / 100` para precisão decimal.
- Verificação de `origin` em links de YouTube para evitar bloqueios de CORS.
- Garantir que `AudioContext.resume()` seja chamado em eventos de interação do usuário (`touchstart`, `mousedown`).
