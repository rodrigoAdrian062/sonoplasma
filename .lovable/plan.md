# Plano: Funcionalidade de Clonar Seção

O usuário deseja a capacidade de clonar uma seção inteira (incluindo todas as suas etapas e áudios associados). Vou implementar essa funcionalidade no backend (via hook) e no frontend (botão na listagem de seções).

## Alterações Propostas

### 1. Hook `useSections`
- Adicionar uma mutação `cloneSection` ao hook `src/hooks/useSections.ts`.
- A lógica de clonagem envolverá:
    1. Buscar os dados da seção original.
    2. Criar uma nova seção com os mesmos dados (nome sufixado com " (cópia)").
    3. Buscar todas as etapas da seção original.
    4. Para cada etapa:
        a. Criar uma nova etapa na nova seção.
        b. Buscar os áudios associados à etapa original.
        c. Criar novos registros de áudios para a nova etapa.

### 2. Componente `Index` (Listagem de Seções)
- Adicionar um botão de "Clonar" (ícone `Copy`) em cada card de seção na página inicial (`src/pages/Index.tsx`).
- O botão disparará a mutação `cloneSection`.
- Adicionar um estado de carregamento visual durante a clonagem.

### 3. Componente `SectionCard` (Se houver necessidade)
- Verificar se o componente `src/components/SectionCard.tsx` (usado em outros contextos) também precisa do botão de clonagem. A julgar pela UI, o lugar principal é a `Index.tsx`.

## Detalhes Técnicos
- Utilizarei transações ou operações em lote do Supabase onde possível para garantir integridade.
- O ícone `Copy` da biblioteca `lucide-react` será usado para o botão.
- A ordem das seções clonadas será colocada ao final da lista por padrão.

Nenhuma alteração no esquema do banco de dados é necessária, apenas novas operações CRUD.
