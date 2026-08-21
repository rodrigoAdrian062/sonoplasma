# Plano de Implementação - Correção do Modo Oculto

O objetivo é corrigir o funcionamento do modo oculto nas etapas, garantindo que o estado seja refletido corretamente na interface ao ativar/desativar e que o feedback visual seja claro para o usuário.

## Alterações Propostas

### Backend & Hooks
- Revisar `useStages.ts` para garantir que a propriedade `oculto` seja gerenciada corretamente na mutação `updateStage`.
- Adicionar uma mutação específica `toggleStageVisibility` no hook `useStages` para facilitar o controle e invalidação de cache.

### Componentes de Interface
- **StageCard.tsx**:
    - Atualizar a lógica do botão de ocultar para usar o novo hook/mutação.
    - Melhorar o feedback visual quando a etapa está oculta (ex: opacidade reduzida ou badge "Oculto").
    - Garantir que o toast e o ícone (`Eye`/`EyeOff`) reflitam o estado real do banco de dados imediatamente.
- **PresentationMode.tsx**:
    - Garantir que a filtragem de `visibleStages` seja reativa às mudanças de estado.

## Detalhes Técnicos
- Utilizar `queryClient.invalidateQueries` para garantir que a lista de etapas seja atualizada em todos os componentes após a alteração.
- Sincronizar o estado local com o resultado da mutação do Supabase.

## Verificação
- Testar a alternância do modo oculto no `StageCard`.
- Verificar se a etapa desaparece/aparece corretamente no `PresentationMode` sem necessidade de recarregar a página.
- Validar se o estado persiste após o refresh.
