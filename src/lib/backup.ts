import { supabase } from '@/integrations/supabase/client';

export interface BackupData {
  formato: string;
  versao: number;
  exportado_em: string;
  secoes: any[];
  etapas: any[];
  etapa_audios: any[];
  pastas: any[];
  biblioteca: any[];
  faixas: any[];
}

const BACKUP_FORMAT = 'sonoplasma-backup';
const BACKUP_VERSION = 1;

/** Exporta todos os dados do usuário atual para um objeto JSON. */
export async function exportBackup(): Promise<BackupData> {
  const [secoes, etapas, etapaAudios, pastas, biblioteca, faixas] = await Promise.all([
    supabase.from('sonoplastia_secoes').select('*'),
    supabase.from('sonoplastia_etapas').select('*'),
    supabase.from('sonoplastia_etapa_audios').select('*'),
    supabase.from('sonoplastia_audios_pastas').select('*'),
    supabase.from('sonoplastia_audios_biblioteca').select('*'),
    supabase.from('sonoplastia_faixas').select('*'),
  ]);

  const err = secoes.error || etapas.error || etapaAudios.error || pastas.error || biblioteca.error || faixas.error;
  if (err) throw err;

  return {
    formato: BACKUP_FORMAT,
    versao: BACKUP_VERSION,
    exportado_em: new Date().toISOString(),
    secoes: secoes.data || [],
    etapas: etapas.data || [],
    etapa_audios: etapaAudios.data || [],
    pastas: pastas.data || [],
    biblioteca: biblioteca.data || [],
    faixas: faixas.data || [],
  };
}

/** Baixa o backup como arquivo .json. */
export function downloadBackup(data: BackupData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `backup-sonoplasma-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function stripMeta(row: Record<string, any>): any {
  const { id, created_at, updated_at, owner_id, user_id, ...rest } = row;
  return rest;
}

export interface ImportResult {
  secoes: number;
  etapas: number;
  audios: number;
  pastas: number;
  biblioteca: number;
  faixas: number;
}

/**
 * Importa um backup, recriando registros com novos IDs e religando as referências.
 * Não apaga dados existentes — o backup é adicionado ao que já existe.
 */
export async function importBackup(data: BackupData): Promise<ImportResult> {
  if (data?.formato !== BACKUP_FORMAT) {
    throw new Error('Arquivo de backup inválido.');
  }

  const result: ImportResult = { secoes: 0, etapas: 0, audios: 0, pastas: 0, biblioteca: 0, faixas: 0 };

  // Seções
  const secaoMap = new Map<string, string>();
  for (const s of data.secoes || []) {
    const { data: ins, error } = await supabase
      .from('sonoplastia_secoes')
      .insert(stripMeta(s))
      .select('id')
      .single();
    if (error) throw error;
    secaoMap.set(s.id, ins.id);
    result.secoes++;
  }

  // Etapas (religa secao_id)
  const etapaMap = new Map<string, string>();
  for (const e of data.etapas || []) {
    const payload: any = stripMeta(e);
    if (e.secao_id) payload.secao_id = secaoMap.get(e.secao_id) ?? null;
    const { data: ins, error } = await supabase
      .from('sonoplastia_etapas')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    etapaMap.set(e.id, ins.id);
    result.etapas++;
  }

  // Áudios das etapas (religa etapa_id)
  for (const a of data.etapa_audios || []) {
    const payload: any = stripMeta(a);
    if (a.etapa_id) {
      const newId = etapaMap.get(a.etapa_id);
      if (!newId) continue;
      payload.etapa_id = newId;
    }
    const { error } = await supabase.from('sonoplastia_etapa_audios').insert(payload);
    if (error) throw error;
    result.audios++;
  }

  // Pastas da biblioteca
  const pastaMap = new Map<string, string>();
  for (const p of data.pastas || []) {
    const payload: any = stripMeta(p);
    // Insere primeiro sem pai para permitir backups em qualquer ordem.
    payload.parent_id = null;
    const { data: ins, error } = await supabase
      .from('sonoplastia_audios_pastas')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    pastaMap.set(p.id, ins.id);
    result.pastas++;
  }

  for (const p of data.pastas || []) {
    if (!p.parent_id) continue;
    const newParentId = pastaMap.get(p.parent_id);
    const newId = pastaMap.get(p.id);
    if (!newParentId || !newId) continue;
    const { error } = await supabase
      .from('sonoplastia_audios_pastas')
      .update({ parent_id: newParentId })
      .eq('id', newId);
    if (error) throw error;
  }

  // Biblioteca (religa pasta_id)
  for (const b of data.biblioteca || []) {
    const payload: any = stripMeta(b);
    if (b.pasta_id) payload.pasta_id = pastaMap.get(b.pasta_id) ?? null;
    const { error } = await supabase.from('sonoplastia_audios_biblioteca').insert(payload);
    if (error) throw error;
    result.biblioteca++;
  }

  // Faixas comemorativas
  for (const f of data.faixas || []) {
    const { error } = await supabase.from('sonoplastia_faixas').insert(stripMeta(f));
    if (error) throw error;
    result.faixas++;
  }

  return result;
}
