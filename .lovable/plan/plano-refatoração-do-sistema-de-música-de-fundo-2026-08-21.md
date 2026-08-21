# Plano: Refatoração do Sistema de Música de Fundo

O objetivo é separar a música de fundo da aplicação (global/header) da música de fundo específica do Modo Apresentação. O sistema atual de "Background Music" (VM) será removido do modo apresentação geral e substituído por uma instância local ou controlada apenas dentro da apresentação, enquanto a música de fundo global continuará existindo nas outras telas.

## Alterações propostas

### 1. Contexto Separado para Apresentação
- Criar um novo contexto `PresentationBgMusicContext.tsx` ou adicionar um estado isolado no `PresentationMode.tsx` para gerenciar as faixas de fundo exclusivas daquela sessão.
- Garantir que ao iniciar a apresentação, a música de fundo global (se estiver tocando) seja pausada e a música de fundo da apresentação assuma o controle.

### 2. Componente de UI
- Atualizar o `PresentationHeaderBgMusic.tsx` para utilizar o novo estado de música de fundo da apresentação em vez do contexto global.
- O `FloatingBackgroundMusic.tsx` continuará existindo nas páginas normais, mas será desativado/escondido durante o modo apresentação (como já é feito, mas agora garantindo a limpeza do estado).

### 3. Persistência e Arrastar Etapas
- Implementar a funcionalidade de adicionar músicas de fundo diretamente no modo apresentação (arrastando ou via seletor).
- Remover as referências do "VM" (BackgroundMusicContext atual) que são compartilhadas entre o header principal e a apresentação.

## Detalhes Técnicos
- **`src/contexts/BackgroundMusicContext.tsx`**: Manter como o player global do sistema.
- **`src/components/PresentationMode.tsx`**: Adicionar lógica para gerenciar sua própria playlist de fundo.
- **`src/components/BackgroundMusicPlayer.tsx`**: Ajustar para aceitar um `context` ou `props` como fonte de dados, permitindo reuso tanto para o global quanto para o de apresentação.

---
*Este plano foca na separação lógica solicitada pelo usuário: "remover o modo musica de fundo no modo apresentaçao e colocar um modo de musica fundo Do VM... sera apenas apresentaçao".*
