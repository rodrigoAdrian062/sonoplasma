import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AudioLibraryItem, AudioLibraryInsert } from '@/types/audioLibrary';
import { toast } from '@/hooks/use-toast';

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
      toast({ title: 'Erro ao adicionar áudio', description: error.message, variant: 'destructive' });
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

  const uploadAndAddAudio = async (file: File, name: string) => {
    const fileName = `library-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
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
