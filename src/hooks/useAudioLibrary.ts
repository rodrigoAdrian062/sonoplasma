import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AudioLibraryItem, AudioLibraryInsert } from '@/types/audioLibrary';
import { probeAudioDuration } from '@/lib/audioDuration';
import { toast } from '@/hooks/use-toast';
import { mensagemUpload } from '@/lib/errorHandler';
// Normaliza uma URL de áudio para comparação de duplicatas.
// Reduz YouTube ao seu ID único; para o resto, compara a URL limpa.
import { getYouTubeVideoId } from '@/lib/embedUrl';

function normalizeAudioUrl(url: string): string {
  const u = (url || '').trim().toLowerCase();
  const ytId = getYouTubeVideoId(u);
  if (ytId) return `yt:${ytId}`;
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
    staleTime: 60_000,
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

  const setClima = useMutation({
    mutationFn: async ({ id, clima }: { id: string; clima: string | null }) => {
      const { error } = await supabase
        .from('sonoplastia_audios_biblioteca')
        .update({ clima } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audioLibrary'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao definir clima', description: error.message, variant: 'destructive' });
    },
  });

  const uploadAndAddAudio = async (file: File, name: string) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      toast({ title: 'Não foi possível enviar', description: mensagemUpload(authError), variant: 'destructive' });
      throw authError;
    }
    if (!user) {
      const error = new Error('Faça login para enviar arquivos.');
      toast({ title: 'Não foi possível enviar', description: error.message, variant: 'destructive' });
      throw error;
    }

    const duracao = await probeAudioDuration(URL.createObjectURL(file)).catch(() => null);
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const fileName = `${user.id}/library-${uniqueId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('stage-audios')
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: 'Não foi possível enviar', description: mensagemUpload(uploadError), variant: 'destructive' });
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
      duracao_segundos: duracao ? Math.round(duracao) : null,
    });
  };

  return {
    audios,
    isLoading,
    error,
    addAudio,
    deleteAudio,
    uploadAndAddAudio,
    setDuration,
    setClima,
  };
}
