import { useState, useMemo, useEffect, useRef } from 'react';
import { MasonicFooter } from '@/components/MasonicFooter';
import sectionBanner from '@/assets/section-banner.png';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Loader2, Presentation, BookOpen, Wand2, Download } from 'lucide-react';
import { prefetchAudios } from '@/lib/audioCache';
import { matchAudiosForStage } from '@/lib/autoMatchAudios';
import { toast } from 'sonner';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { SortableStageCard } from '@/components/SortableStageCard';
import { CrossSectionDropSidebar } from '@/components/CrossSectionDropSidebar';
import { ControlBar } from '@/components/ControlBar';
import { lazy, Suspense } from 'react';
// Modal pesado — carregado sob demanda ao editar/criar etapa.
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { CeremonyIcon } from '@/components/icons/CeremonyIcon';
import { useStages } from '@/hooks/useStages';
import { useSections } from '@/hooks/useSections';
import { useStageAudios, useAllStageAudios } from '@/hooks/useStageAudios';
import { useUniversalAudioPlayer, useAudioProgress } from '@/hooks/useUniversalAudioPlayer';
import { useSettings } from '@/hooks/useSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useUiToggles } from '@/hooks/useUiToggles';
import { CeremonyStage, CeremonyStageInsert, CeremonyStageUpdate } from '@/types/ceremony';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Music, Play, Square } from 'lucide-react';

const PresentationMode = lazy(() =>
  import('@/components/PresentationMode').then((m) => ({ default: m.PresentationMode }))
);
const StageEditModal = lazy(() =>
  import('@/components/StageEditModal').then((m) => ({ default: m.StageEditModal }))
);


const SectionDetail = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  useThemeColor(settings?.cor_tema);

  const { stages, isLoading: stagesLoading, createStage, updateStage, deleteStage, reorderStages, copyStageToSection } = useStages();
  const { sections, isLoading: sectionsLoading } = useSections();
  const { saveAudios } = useStageAudios();
  const { audiosByStageId } = useAllStageAudios();
  const { audios: libraryAudios } = useAudioLibrary();
  const {
    currentStageId,
    currentUrl,

    status,
    volume,
    eq,
    play,
    pause,
    resume,
    stop,
    setVolume,
    seekForward,
    seekBackward,
    seekTo,
    setEQ,
    setOnTrackEnded,
  } = useUniversalAudioPlayer();
  const { currentTime, duration } = useAudioProgress();

  const [editingStage, setEditingStage] = useState<CeremonyStage | null>(null);
  const [isNewStageModal, setIsNewStageModal] = useState(false);
  const [deleteStageData, setDeleteStageData] = useState<CeremonyStage | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const { toggles } = useUiToggles();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const pendingNavRef = useRef<(() => void) | null>(null);

  const isAudioActive = status === 'playing' || status === 'paused';

  const requestExit = (proceed: () => void) => {
    if (status === 'playing' || status === 'paused') {
      pendingNavRef.current = proceed;
      setShowExitDialog(true);
    } else {
      proceed();
    }
  };

  const handleBack = () => requestExit(() => navigate('/'));

  const handleKeepPlaying = () => {
    setShowExitDialog(false);
    const proceed = pendingNavRef.current;
    pendingNavRef.current = null;
    proceed?.();
  };

  const handleStopAndExit = () => {
    setShowExitDialog(false);
    stop();
    const proceed = pendingNavRef.current;
    pendingNavRef.current = null;
    proceed?.();
  };

  const handleDismissExit = () => {
    setShowExitDialog(false);
    pendingNavRef.current = null;
  };

  // Intercept browser back button while audio is active
  useEffect(() => {
    if (!isAudioActive) return;

    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      // Re-trap so the user stays until they choose
      window.history.pushState(null, '', window.location.href);
      pendingNavRef.current = () => navigate('/');
      setShowExitDialog(true);
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isAudioActive, navigate]);

  const section = useMemo(() => {
    // sectionId can be "slug-shortid" format, extract the short ID (last 8 chars after last dash)
    const idPart = sectionId?.split('-').pop() || sectionId;
    return sections.find(s => s.id.startsWith(idPart || '')) || sections.find(s => s.id === sectionId);
  }, [sections, sectionId]);
  const sectionStages = useMemo(() => stages.filter(s => s.secao_id === section?.id), [stages, section]);

  const activeStage = useMemo(() => {
    return stages.find(s => s.id === currentStageId) || null;
  }, [stages, currentStageId]);

  // Fila linear de todas as músicas da seção (por ordem de etapa e de áudio)
  const sectionQueue = useMemo(() => {
    const queue: Array<{ stageId: string; url: string }> = [];
    sectionStages.forEach((stage) => {
      (audiosByStageId[stage.id] || []).forEach((audio) => {
        queue.push({ stageId: stage.id, url: audio.audio_url });
      });
    });
    return queue;
  }, [sectionStages, audiosByStageId]);

  // Bug corrigido: a fila era dependência do efeito, então cada refetch da
  // biblioteca desregistrava o callback e reinstalava — se uma faixa terminava
  // exatamente nessa janela, a reprodução contínua parava. Agora usamos um ref
  // que sempre reflete a fila atual, e registramos o callback só uma vez por
  // mudança da flag "reproducao_continua".
  const sectionQueueRef = useRef(sectionQueue);
  useEffect(() => { sectionQueueRef.current = sectionQueue; }, [sectionQueue]);
  useEffect(() => {
    if (!section?.reproducao_continua) {
      setOnTrackEnded(null);
      return;
    }
    setOnTrackEnded((endedStageId, endedUrl) => {
      const q = sectionQueueRef.current;
      const idx = q.findIndex(
        (item) => item.stageId === endedStageId && item.url === endedUrl
      );
      if (idx === -1 || idx + 1 >= q.length) return false;
      const next = q[idx + 1];
      play(next.stageId, next.url);
      return true;
    });
    return () => setOnTrackEnded(null);
  }, [section?.reproducao_continua, play, setOnTrackEnded]);






  // Update page title with section name
  useEffect(() => {
    if (section) {
      document.title = section.nome;
    }
    return () => {
      document.title = settings?.nome_app || 'Sonoplastia Cerimonial';
    };
  }, [section, settings]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handlePlay = (stage: CeremonyStage, audioUrl?: string) => {
    if (audioUrl) play(stage.id, audioUrl);
  };

  const handleSaveStage = async (
    data: CeremonyStageInsert | CeremonyStageUpdate,
    audios?: Array<{ nome: string; audio_url: string }>
  ) => {
    if (editingStage) {
      updateStage.mutate({ id: editingStage.id, ...data });
      if (audios) saveAudios.mutate({ etapa_id: editingStage.id, audios });
    } else {
      const insertData: CeremonyStageInsert = {
        nome_simbolico: data.nome_simbolico || 'Nova Etapa',
        descricao: data.descricao,
        tempo_padrao: data.tempo_padrao,
        icone: data.icone,
        ordem: sectionStages.length + 1,
        ativo: true,
        secao_id: section?.id || null,
      };
      createStage.mutate(insertData, {
        onSuccess: (newStage) => {
          if (audios && audios.length > 0) {
            saveAudios.mutate({ etapa_id: newStage.id, audios });
          }
        },
      });
    }
  };

  const TARGET_PER_STAGE = 6;
  const handleAutoFillAll = async () => {
    if (sectionStages.length === 0) { toast.info('Nenhuma etapa nesta seção'); return; }
    if (libraryAudios.length === 0) { toast.error('Biblioteca de áudios está vazia'); return; }
    setIsAutoFilling(true);
    const toastId = toast.loading('Preenchendo etapas com IA...');
    let totalAdded = 0;
    let stagesUpdated = 0;
    try {
      for (const stage of sectionStages) {
        const existing = audiosByStageId[stage.id] || [];
        const need = TARGET_PER_STAGE - existing.length;
        if (need <= 0) continue;

        const existingUrls = new Set(existing.map((a) => a.audio_url));
        const isYt = (u: string) => {
          const s = (u || '').toLowerCase();
          return s.includes('youtube.com') || s.includes('youtu.be');
        };
        const availableAll = libraryAudios.filter((a) => !existingUrls.has(a.audio_url));
        if (availableAll.length === 0) continue;

        // Intercala Arquivos e YouTube para garantir que ambos apareçam
        // dentro do limite enviado à IA (evita YouTube ser cortado).
        const localOnly = availableAll.filter((a) => !isYt(a.audio_url));
        const ytOnly = availableAll.filter((a) => isYt(a.audio_url));
        const available: typeof availableAll = [];
        const maxLen = Math.max(localOnly.length, ytOnly.length);
        for (let i = 0; i < maxLen; i++) {
          if (localOnly[i]) available.push(localOnly[i]);
          if (ytOnly[i]) available.push(ytOnly[i]);
        }

        // 1) Tenta IA (biblioteca inclui Arquivos + YouTube)
        const picks: Array<{ nome: string; audio_url: string }> = [];
        try {
          const { data, error } = await supabaseClient.functions.invoke('suggest-audios', {
            body: {
              stageTitle: stage.nome_simbolico,
              stageDescription: stage.descricao || '',
              userHint: '',
              limit: need,
              library: available.map((a) => ({ nome: a.nome, audio_url: a.audio_url })),
            },
          });
          if (!error) {
            const indices: number[] = Array.isArray(data?.indices) ? data.indices : [];
            for (const i of indices) {
              const a = available[i];
              if (a && !picks.some((p) => p.audio_url === a.audio_url)) {
                picks.push({ nome: a.nome, audio_url: a.audio_url });
                if (picks.length >= need) break;
              }
            }
          }
        } catch { /* fallback abaixo */ }

        // 2) Completa com matcher local (nome). Roda 2x: Arquivos e YouTube.
        if (picks.length < need) {
          const usedUrls = new Set(picks.map((p) => p.audio_url));
          const localMatch = matchAudiosForStage(
            stage,
            localOnly.filter((a) => !usedUrls.has(a.audio_url)),
            Math.ceil((need - picks.length) / 2),
          );
          const ytMatch = matchAudiosForStage(
            stage,
            ytOnly.filter((a) => !usedUrls.has(a.audio_url)),
            need - picks.length - localMatch.length,
          );
          for (const r of [...localMatch, ...ytMatch]) {
            picks.push({ nome: r.audio.nome, audio_url: r.audio.audio_url });
          }
        }

        // 3) Ainda faltando? completa aleatoriamente intercalando fontes
        if (picks.length < need) {
          const usedUrls = new Set(picks.map((p) => p.audio_url));
          for (const a of available) {
            if (usedUrls.has(a.audio_url)) continue;
            picks.push({ nome: a.nome, audio_url: a.audio_url });
            usedUrls.add(a.audio_url);
            if (picks.length >= need) break;
          }
        }

        if (picks.length === 0) continue;

        const merged = [
          ...existing.map((a) => ({ nome: a.nome, audio_url: a.audio_url })),
          ...picks,
        ].slice(0, 10);

        await saveAudios.mutateAsync({ etapa_id: stage.id, audios: merged });
        totalAdded += picks.length;
        stagesUpdated += 1;
      }
      toast.success(`${stagesUpdated} etapa(s) preenchida(s) — ${totalAdded} áudio(s) (Arquivos + YouTube)`, { id: toastId });
    } catch (e: any) {
      toast.error(`Erro ao preencher: ${e?.message || 'desconhecido'}`, { id: toastId });
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleDeleteStage = () => {
    if (deleteStageData) {
      if (currentStageId === deleteStageData.id) stop();
      deleteStage.mutate(deleteStageData.id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    // Drop em outra seção → copiar etapa
    if (overId.startsWith('copysection:')) {
      const targetSectionId = overId.slice('copysection:'.length);
      copyStageToSection.mutate({ stageId: String(active.id), targetSectionId });
      return;
    }
    // Reordenar dentro da seção
    if (active.id !== over.id) {
      const oldIndex = sectionStages.findIndex((s) => s.id === active.id);
      const newIndex = sectionStages.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(sectionStages, oldIndex, newIndex);
      const orderedIds = reordered.map((s) => s.id);
      reorderStages.mutate(orderedIds);
    }
  };

  const stageCountsBySection = useMemo(() => {
    const counts: Record<string, number> = {};
    stages.forEach((s) => {
      if (s.secao_id) counts[s.secao_id] = (counts[s.secao_id] ?? 0) + 1;
    });
    return counts;
  }, [stages]);

  const isLoading = stagesLoading || sectionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Seção não encontrada</p>
          <Button onClick={() => navigate('/')} variant="outline">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const handlePresentationPlay = (stageId: string, audioUrl: string) => {
    play(stageId, audioUrl);
  };

  const handleDownloadSection = async () => {
    if (sectionStages.length === 0) return;
    setIsDownloading(true);
    const toastId = toast.loading('Preparando áudios para uso offline...');
    
    try {
      const allUrls: string[] = [];
      sectionStages.forEach(stage => {
        const audios = audiosByStageId[stage.id] || [];
        audios.forEach(a => allUrls.push(a.audio_url));
      });
      
      // Filtra apenas URLs que podem ser cacheadas (não YouTube)
      const cacheableUrls = allUrls.filter(url => 
        url && !url.includes('youtube.com') && !url.includes('youtu.be')
      );
      
      if (cacheableUrls.length === 0) {
        toast.info('Nenhum áudio local encontrado nesta seção para download.', { id: toastId });
        return;
      }

      prefetchAudios(cacheableUrls);
      toast.success(`${cacheableUrls.length} áudios sendo salvos para offline.`, { id: toastId });
    } catch (error) {
      toast.error('Erro ao baixar áudios.', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isPresentationMode) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <PresentationMode
          stages={sectionStages}
          audiosByStageId={audiosByStageId}
          currentStageId={currentStageId}
          currentUrl={currentUrl}
          secaoId={section?.id}
          secaoNome={section?.nome}

          status={status}
          volume={volume}
          currentTime={currentTime}
          duration={duration}
          onVolumeChange={setVolume}
          onPlay={handlePresentationPlay}
          onPause={pause}
          onResume={resume}
          onStop={stop}
          onClose={() => setIsPresentationMode(false)}
          onSeekForward={() => seekForward()}
          onSeekBackward={() => seekBackward()}
          onSeekTo={seekTo}
          settings={settings}
          eq={eq}
          onEQChange={setEQ}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0"
              aria-label="Voltar para as seções"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </Button>
            <div className="p-2 bg-gold/10 rounded-lg shrink-0">
              <CeremonyIcon name={section.icone || 'folder'} size={22} className="text-gold" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg sm:text-2xl font-semibold text-foreground truncate">
                {section.nome}
              </h1>
              {section.descricao && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {section.descricao}
                </p>
              )}
            </div>
            {toggles.btn_apresentar && sectionStages.length > 0 && (
              <Button
                onClick={() => setIsPresentationMode(true)}
                size="sm"
                className="gap-1.5 bg-secondary hover:bg-gold/20 text-muted-foreground hover:text-gold border border-border hover:border-gold/30 shrink-0"
                variant="outline"
              >
                <Presentation size={16} />
                <span className="hidden sm:inline">Apresentar</span>
              </Button>
            )}


            <Button
              onClick={() => setIsNewStageModal(true)}
              size="sm"
              className="gap-1.5 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 hover:border-gold/50 shrink-0"
              variant="outline"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nova Etapa</span>
            </Button>
          </div>
        </div>
      </header>

      <ControlBar
        volume={volume}
        onVolumeChange={setVolume}
        activeStage={activeStage ? { symbolicName: activeStage.nome_simbolico } : null}
        isPlaying={status === 'playing'}
        currentTime={currentTime}
        duration={duration}
        onSeekTo={seekTo}
        eq={eq}
        onEQChange={setEQ}
      />

      <main className="container px-3 sm:px-4 py-4 sm:py-6">
        {/* Banner da seção */}
        <div className="relative mb-5 rounded-2xl overflow-hidden border border-gold/20 shadow-lg shadow-gold/5">
          <img 
            src={sectionBanner} 
            alt={section.nome} 
            className="w-full h-28 sm:h-36 object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-5 flex items-center gap-3">
            <div className="p-2 bg-gold/20 backdrop-blur-sm rounded-lg border border-gold/30">
              <CeremonyIcon name={section.icone || 'folder'} size={20} className="text-gold" />
            </div>
            <h2 className="font-display text-base sm:text-xl font-bold text-gold drop-shadow-lg">
              {section.nome}
            </h2>
          </div>
        </div>





        {sectionStages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhuma etapa nesta seção</p>
            <Button
              onClick={() => setIsNewStageModal(true)}
              className="gap-2 bg-gold hover:bg-gold/90 text-background"
            >
              <Plus size={18} />
              Criar primeira etapa
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionStages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2 max-w-3xl mx-auto w-full text-sm">
                {sectionStages.map((stage, index) => (
                  <div key={stage.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.03}s` }}>
                    <SortableStageCard
                      stage={stage}
                      audios={audiosByStageId[stage.id] || []}
                      stageNumber={index + 1}

                      isPlaying={currentStageId === stage.id && status === 'playing'}
                      isPaused={currentStageId === stage.id && status === 'paused'}
                      currentTime={currentStageId === stage.id ? currentTime : 0}
                      duration={currentStageId === stage.id ? duration : 0}
                      onPlay={(audioUrl) => handlePlay(stage, audioUrl)}
                      onPause={pause}
                      onResume={resume}
                      onStop={stop}
                      onEdit={() => setEditingStage(stage)}
                      onDelete={() => setDeleteStageData(stage)}
                      onSeekForward={() => seekForward()}
                      onSeekBackward={() => seekBackward()}
                      onSeekTo={seekTo}
                      continuousPlayback={!!(section as any)?.reproducao_continua}
                      sections={sections}
                      currentSectionId={section.id}
                      onCopyToSection={(targetSectionId) =>
                        copyStageToSection.mutate({ stageId: stage.id, targetSectionId })
                      }
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
            <CrossSectionDropSidebar
              sections={sections}
              currentSectionId={section.id}
              stageCounts={stageCountsBySection}
            />
          </DndContext>
        )}

        <MasonicFooter />
      </main>

      {(editingStage || isNewStageModal) && (
        <Suspense fallback={null}>
          <StageEditModal
            stage={editingStage}
            isOpen={!!editingStage || isNewStageModal}
            onClose={() => {
              setEditingStage(null);
              setIsNewStageModal(false);
            }}
            onSave={handleSaveStage}
            isNew={isNewStageModal}
            sections={sections}
            defaultSectionId={section?.id}
          />
        </Suspense>
      )}

      <DeleteConfirmModal
        isOpen={!!deleteStageData}
        onClose={() => setDeleteStageData(null)}
        onConfirm={handleDeleteStage}
        stageName={deleteStageData?.nome_simbolico || ''}
      />

      <AlertDialog open={showExitDialog} onOpenChange={(open) => { if (!open) handleDismissExit(); }}>
        <AlertDialogContent className="bg-card border-gold/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-gold">
              <Music size={18} />
              Áudio em reprodução
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activeStage?.nome_simbolico ? (
                <>Ainda há um áudio ativo: <strong className="text-foreground">{activeStage.nome_simbolico}</strong>. Deseja continuar ouvindo ao sair ou parar o som?</>
              ) : (
                <>Ainda há um áudio ativo. Deseja continuar ouvindo ao sair ou parar o som?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleDismissExit}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleStopAndExit}>
              <Square size={16} className="mr-1" /> Parar e sair
            </Button>
            <Button className="bg-gold text-background hover:bg-gold/90" onClick={handleKeepPlaying}>
              <Play size={16} className="mr-1" /> Continuar ouvindo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SectionDetail;
