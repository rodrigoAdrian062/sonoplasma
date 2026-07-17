
# Roteiro Sincronizado (Ritual Runner)

Uma nova aba dentro de cada Seção onde você cola o texto do ritual (ou sobe PDF/DOCX), insere marcadores `[▶ etapa]` no meio do texto, e no modo apresentação vira um teleprompter em tela cheia. Ao chegar num cue, você clica ou aperta **ESPAÇO** e a música da etapa toca.

## O que será construído

### 1. Nova aba "Roteiro" dentro da Seção
- Ao lado de "Etapas" na tela da seção, uma aba nova.
- Editor de texto grande (rich-text simples: negrito, itálico, títulos, quebras).
- Botão **"Inserir cue musical"** → mostra dropdown com todas as etapas dessa seção; ao escolher, insere um bloco dourado inline com o nome da etapa (ex: `[▶ 1. Abertura dos Trabalhos]`).
- Botão **"Importar de arquivo"** → aceita PDF (parse + OCR se escaneado) e DOCX. Extrai texto preservando parágrafos e coloca no editor.
- Botão **"Colar texto"** → apenas paste.
- Salva automaticamente.

### 2. Biblioteca de Roteiros Salvos
- Página nova `/roteiros` no menu (ou dentro de "Ajustes").
- Lista de roteiros salvos com nome, prévia e data.
- Botão **"Usar em uma seção"** → escolhe a seção e importa o texto.
- Botão **"Salvar como template"** dentro do editor de roteiro da seção.
- Roteiros comuns pré-criados: Abertura de Aprendiz, Iniciação, Elevação, Exaltação, Encerramento.

### 3. Modo Leitura (teleprompter)
- Botão **"Iniciar Leitura"** na aba Roteiro abre tela cheia estilo teleprompter.
- Texto grande centralizado (tamanho ajustável +/-).
- Rolagem manual (roda do mouse, setas ↑↓, PageUp/PageDown) ou automática com velocidade ajustável (palavras/min).
- Cues aparecem como **botões dourados grandes** embutidos no parágrafo, com brilho pulsante quando entram na área central da tela.
- **Clique no cue OU ESPAÇO** = dispara a música da etapa (mesma engine de áudio já existente).
- Ao disparar, o cue muda de cor (verde = tocando) e a próxima música fica destacada na barra lateral: "**A seguir:** Cadeia de União".
- ESC sai do modo leitura.
- Controles no rodapé: play/pause música atual, próximo cue, tamanho de fonte, velocidade de rolagem.

### 4. Integração com Modo Apresentação existente
- Novo botão no cabeçalho do modo apresentação: **"Abrir Roteiro"** — quando a seção tem roteiro, abre o teleprompter em tela cheia sobre a apresentação, mantendo o mini-player e cronômetros visíveis.
- Cues respeitam a etapa ativa: se você já está na etapa 3, os cues das etapas 1-2 aparecem "concluídos" (cinza).

## Detalhes técnicos

**Banco (nova migração):**
- `sonoplastia_roteiros` — id, secao_id (nullable, para templates), owner_id, titulo, conteudo (jsonb do editor), created_at, updated_at.
- RLS: owner_id = auth.uid(), com GRANTs para authenticated/service_role.
- Um roteiro por seção (unique secao_id when not null); templates têm secao_id null.

**Formato do conteúdo (jsonb):**
```
{ blocks: [
    { type: "paragraph", text: "..." },
    { type: "heading", level: 2, text: "..." },
    { type: "cue", etapaId: "uuid", label: "Abertura dos Trabalhos" },
    ...
]}
```

**Parse de arquivos:**
- PDF/DOCX enviados para uma edge function `parse-roteiro` que usa a lib pdf-parse (Deno) e mammoth para DOCX. Para PDFs escaneados, cai em OCR via tesseract-wasm ou avisa o usuário.
- Retorna texto quebrado em parágrafos.

**Editor:**
- Uso do `@tiptap/react` (leve, já compatível) com extensão custom para o node `cue` (inline, atomic, com dropdown ao clicar).

**Teleprompter:**
- Componente `<RoteiroReader>` full-screen, portal.
- `IntersectionObserver` para detectar cues próximos ao centro (para o pulse visual e para o ESPAÇO saber qual cue disparar).
- Reusa `useAudioPlayer` / `useCeremonyStages` já existentes para tocar a música da etapa.

**Rotas novas:**
- `/roteiros` — biblioteca de templates
- Aba "Roteiro" acessível em `/secao/:id` (nova tab do TabsList existente)

## Componentes novos
- `src/pages/RoteirosLibrary.tsx`
- `src/components/roteiro/RoteiroEditor.tsx` (Tiptap + botão inserir cue)
- `src/components/roteiro/CueNodeView.tsx` (nó custom do editor)
- `src/components/roteiro/RoteiroReader.tsx` (teleprompter full-screen)
- `src/components/roteiro/RoteiroImportDialog.tsx` (upload PDF/DOCX)
- `src/hooks/useRoteiro.ts` (CRUD + realtime)
- `supabase/functions/parse-roteiro/index.ts` (parse de arquivos)
- Migração para `sonoplastia_roteiros`

## Fora do escopo (pode virar depois)
- Disparo automático por rolagem ou por cronômetro (você preferiu manual).
- Sugestão de cues por IA (posso adicionar num próximo passo se quiser).
- Sincronização multi-dispositivo em tempo real (o operador pilota num tablet só).

---

Aprovar para eu implementar? Se preferir dividir em fases (ex: fase 1 só editor + cues manuais + teleprompter, fase 2 upload de PDF/DOCX, fase 3 biblioteca de templates), me avisa que ajusto.
