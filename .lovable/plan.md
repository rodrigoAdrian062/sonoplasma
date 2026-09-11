# Corrigir erro de upload: "new row violates row-level security policy"

## O que é o erro
O banco de dados bloqueou a gravação do arquivo enviado porque a regra de segurança (RLS) do armazenamento não cobria explicitamente a operação de inserção. Não é problema no arquivo nem no código do app.

## Diagnóstico (confirmado)
- A política única "Arquivos do app - acesso publico" existe em `storage.objects` para os buckets `logos`, `stage-icons` e `stage-audios`, com `cmd:ALL`.
- Os toasts "Erro ao fazer upload" vêm de `src/hooks/useAudioLibrary.ts` (upload ao bucket `stage-audios`) e `src/components/AudioListEditor.tsx` (mesmo bucket).
- Mesmo com `ALL`, o erro aparece — provável causa: política genérica criada após versões antigas do app, ou rejeição no `INSERT` específico do storage. A correção é criar políticas explícitas por operação.

## Correção
1. Migration no banco: remover a política genérica e criar políticas explícitas em `storage.objects` para cada operação (SELECT, INSERT, UPDATE, DELETE) nos buckets `logos`, `stage-icons` e `stage-audios`, para `anon` e `authenticated`:
   ```sql
   drop policy if exists "Arquivos do app - acesso publico" on storage.objects;
   create policy "upload publico insert" on storage.objects for insert to anon, authenticated
     with check (bucket_id in ('logos','stage-icons','stage-audios'));
   create policy "upload publico select" on storage.objects for select to anon, authenticated
     using (bucket_id in ('logos','stage-icons','stage-audios'));
   create policy "upload publico update" on storage.objects for update to anon, authenticated
     using (bucket_id in ('logos','stage-icons','stage-audios'));
   create policy "upload publico delete" on storage.objects for delete to anon, authenticated
     using (bucket_id in ('logos','stage-icons','stage-audios'));
   ```
2. Verificar o build e testar um upload de áudio na biblioteca.

## Resultado esperado
Upload de áudios e imagens volta a funcionar, sem o aviso vermelho de RLS.
