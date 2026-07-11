import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AudioLibraryItem, AudioLibraryInsert } from '@/types/audioLibrary';
import { toast } from '@/hooks/use-toast';

// Normaliza uma URL de áudio para comparação de duplicatas.
// Reduz YouTube/Spotify ao seu ID único; para o resto, compara a URL limpa.
function normalizeAudioUrl(url: string): string {
  const u = (url || '').trim().toLowerCase();
  const yt = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-z0-9_-]{11})/i);
  if (yt) return `yt:${yt[1]}`;
  const sp = u.match(/(?:spotify[:/])+(track|album|playlist|episode|show)[:/]([a-z0-9]+)/i);
  if (sp) return `sp:${sp[1]}:${sp[2]}`;
  return u.replace(/[?#].*$/, '').replace(/\/+$/, '');
}

export function useAudioLibrary() {
  const queryClient = useQueryClient();

  const { data: audios = [], isLoading, error } = useQuery({
    queryKey: ['audioLibrary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sonoplastia_audios_biblioteca')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AudioLibraryItem[];
    },
  });

  const addAudio = useMutation({
    mutationFn: async (audio: AudioLibraryInsert) => {
      // Detecta duplicata pela URL (ignorando faixas já enviadas por arquivo).
      if (audio.audio_url) {
        const existing = (queryClient.getQueryData(['audioLibrary']) as AudioLibraryItem[] | undefined) || [];
        const target = normalizeAudioUrl(audio.audio_url);
        const dup = existing.find((a) => a.audio_url && normalizeAudioUrl(a.audio_url) === target);
        if (dup) {
          throw new Error(`Esta música já está na biblioteca: "${dup.nome}"`);
        }
      }

      const { data, error } = await supabase
        .from('sonoplastia_audios_biblioteca')
        .insert(audio)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audioLibrary'] });
      toast({ title: 'Áudio adicionado à biblioteca' });
    },
    onError: (error) => {
      toast({ title: 'Não foi possível adicionar', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAudio = useMutation({
    mutationFn: async (id: string) => {
      // Get the audio to delete the file from storage
      const { data: audioData } = await supabase
        .from('sonoplastia_audios_biblioteca')
        .select('audio_url')
        .eq('id', id)
        .single();

      // Delete from database
      const { error } = await supabase
        .from('sonoplastia_audios_biblioteca')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Try to delete from storage if it's a storage URL
      if (audioData?.audio_url?.includes('supabase.co/storage')) {
        const pathMatch = audioData.audio_url.match(/stage-audios\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('stage-audios').remove([pathMatch[1]]);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audioLibrary'] });
      toast({ title: 'Áudio removido da biblioteca' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover áudio', description: error.message, variant: 'destructive' });
    },
  });

  const setDuration = useMutation({
    mutationFn: async ({ id, seconds }: { id: string; seconds: number }) => {
      const { error } = await supabase
        .from('sonoplastia_audios_biblioteca')
        .update({ duracao_segundos: Math.round(seconds) })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audioLibrary'] });
    },
  });

  const uploadAndAddAudio = async (file: File, name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');
    const duracao = await probeAudioDuration(URL.createObjectURL(file)).catch(() => null);
    const fileName = `${user.id}/library-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('stage-audios')
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: 'Erro ao fazer upload', description: uploadError.message, variant: 'destructive' });
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('stage-audios')
      .getPublicUrl(uploadData.path);

    return addAudio.mutateAsync({
      nome: name,
      audio_url: publicUrl,
      tamanho_bytes: file.size,
      tipo: file.type,
    });
  };

  return {
    audios,
    isLoading,
    error,
    addAudio,
    deleteAudio,
    uploadAndAddAudio,
  };
}
