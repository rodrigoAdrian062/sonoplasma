# Plano: Adicionar Áudios da Biblioteca aos Sons Rápidos

O objetivo é permitir que o usuário adicione qualquer áudio diretamente da página da Biblioteca de Áudio para o painel de "Sons Rápidos", facilitando a organização dos efeitos sonoros.

## Alterações Técnicas

### 1. Componente `QuickSoundsPanel`
- Exportar uma função auxiliar ou criar um evento customizado para que outros componentes possam disparar a adição de um som.
- Como o `QuickSoundsPanel` gerencia seu próprio estado sincronizado com `localStorage`, a forma mais simples e robusta de integração externa (sem refatorar todo o estado para um Contexto global) é usar um Evento Customizado do DOM.

### 2. Página `AudioLibrary` (`src/pages/AudioLibrary.tsx`)
- Adicionar uma nova opção no menu de contexto (dropdown) de cada linha de áudio: "Adicionar aos Sons Rápidos".
- Esta opção só será exibida para áudios que não sejam links do YouTube ou Spotify (limitação técnica atual dos Sons Rápidos).
- Ao clicar, disparar o evento customizado que o `QuickSoundsPanel` estará escutando.

## Detalhes de Implementação

- **Evento**: `sonoplastia:addQuickSound`
- **Payload**: `{ nome: string, url: string }`
- **Segurança**: Verificar o limite de 20 slots antes de adicionar.

### Passos:
1. Modificar `src/components/QuickSoundsPanel.tsx`:
   - Adicionar `useEffect` para escutar o evento `sonoplastia:addQuickSound`.
   - Implementar a lógica de adição (verificar duplicatas e limite de slots).
2. Modificar `src/pages/AudioLibrary.tsx`:
   - No loop de renderização dos áudios (`VirtualAudioList`), adicionar um botão ou item de menu para "Sons Rápidos".
   - Disparar o evento ao clicar.
