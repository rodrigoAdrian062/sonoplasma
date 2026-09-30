import { useMemo, useState } from 'react';
import { MasonicFooter } from '@/components/MasonicFooter';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { SectionEditModal } from '@/components/SectionEditModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';

import { CeremonyIcon } from '@/components/icons/CeremonyIcon';
import { useStages } from '@/hooks/useStages';
import { useSections } from '@/hooks/useSections';


import { useSettings } from '@/hooks/useSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { CeremonySection, CeremonySectionInsert, CeremonySectionUpdate } from '@/types/section';
import { Loader2, FolderPlus, ChevronRight, Edit2, Trash2, Copy } from 'lucide-react';
import { slugify } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableBanner } from '@/components/EditableBanner';
import { useUserAccess } from '@/hooks/useUserAccess';
import { hasPermission } from '@/lib/access';

const Index = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { access } = useUserAccess();
  const canCreateUnlimitedSections = hasPermission(access, 'canCreateUnlimitedSections');
  useThemeColor(settings?.cor_tema);
  
  const { stages, isLoading: stagesLoading } = useStages();
  const { sections, isLoading: sectionsLoading, createSection, updateSection, deleteSection, cloneSection } = useSections();
  const sectionLimitReached = !canCreateUnlimitedSections && sections.length >= 3;

  const [editingSection, setEditingSection] = useState<CeremonySection | null>(null);
  const [isNewSectionModal, setIsNewSectionModal] = useState(false);
  const [deleteSectionData, setDeleteSectionData] = useState<CeremonySection | null>(null);


  

  const handleSaveSection = (data: CeremonySectionInsert | CeremonySectionUpdate) => {
    if (editingSection) {
      updateSection.mutate({ id: editingSection.id, ...data });
    } else {
      createSection.mutate(data as CeremonySectionInsert);
    }
  };

  const handleDeleteSection = () => {
    if (deleteSectionData) {
      deleteSection.mutate(deleteSectionData.id);
    }
  };

  // Conta etapas por seção em uma única passada, evitando O(N×M) por render.
  const stageCountBySection = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of stages) {
      if (!s.secao_id) continue;
      map[s.secao_id] = (map[s.secao_id] || 0) + 1;
    }
    return map;
  }, [stages]);
  const getStageCount = (sectionId: string) => stageCountBySection[sectionId] || 0;

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


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        onAddStage={() => {}}
        onAddSection={() => setIsNewSectionModal(true)}
      />
      
      <main className="container px-3 sm:px-4 py-4 sm:py-6 flex-1 flex flex-col">
        {/* Banner principal editável */}
        <EditableBanner />


        {sections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-6">Nenhuma seção cadastrada</p>
            <Button
              onClick={() => setIsNewSectionModal(true)}
              disabled={sectionLimitReached}
              className="bg-gold hover:bg-gold/90 text-background gap-2 disabled:opacity-60"
            >
              <FolderPlus size={18} />
              Criar primeira seção
            </Button>
            {sectionLimitReached && (
              <p className="mt-3 text-xs text-muted-foreground">Seu plano gratuito permite até 3 seções. Atualize para Premium para criar mais.</p>
            )}
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-screen-2xl gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {sections.map((section, index) => {
              const stageCount = getStageCount(section.id);
              return (
                <div
                  key={section.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir seção ${section.nome}`}
                    className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-sm p-3 sm:p-4 md:p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-xl hover:shadow-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={() => navigate(`/secao/${slugify(section.nome)}-${section.id.slice(0, 8)}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/secao/${slugify(section.nome)}-${section.id.slice(0, 8)}`);
                      }
                    }}
                  >
                    {/* Barra dourada lateral */}
                    <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-gold to-gold/20 scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-300" aria-hidden="true" />
                    {/* Brilho decorativo */}
                    <span className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gold/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />

                    <div className="flex items-start gap-2.5 sm:gap-3 md:gap-4">
                      <div className="shrink-0 p-2 sm:p-2.5 md:p-3 bg-gold/10 group-hover:bg-gold/20 rounded-lg sm:rounded-xl ring-1 ring-gold/10 group-hover:ring-gold/30 transition-all duration-300">
                        {section.icone_url ? (
                          <img src={section.icone_url} alt="" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 object-cover rounded" />
                        ) : (
                          <CeremonyIcon
                            name={section.icone || 'folder'}
                            size={22}
                            className="text-gold sm:!w-6 sm:!h-6 md:!w-[26px] md:!h-[26px]"
                            aria-hidden="true"
                          />
                        )}
                      </div>


                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base sm:text-lg font-semibold text-foreground truncate group-hover:text-gold transition-colors duration-300">
                          {section.nome}
                        </h3>
                        {section.descricao && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-0.5 sm:mt-1">
                            {section.descricao}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground group-hover:text-gold group-hover:translate-x-1 transition-all shrink-0 sm:!w-5 sm:!h-5" aria-hidden="true" />
                    </div>

                    <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2 border-t border-border/40 pt-2.5 sm:pt-3">
                      <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-muted-foreground bg-secondary/60 rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 whitespace-nowrap">
                        {stageCount} {stageCount === 1 ? 'etapa' : 'etapas'}
                      </span>
                      <div className="flex items-center gap-0.5 sm:gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSection(section)}
                          className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground hover:bg-gold/10 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-all"
                          aria-label={`Editar seção ${section.nome}`}
                        >
                          <Edit2 size={14} aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => cloneSection.mutate(section.id)}
                          disabled={cloneSection.isPending || sectionLimitReached}
                          className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-gold hover:bg-gold/10 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-all disabled:opacity-50"
                          aria-label={`Clonar seção ${section.nome}`}
                        >
                          {cloneSection.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Copy size={14} aria-hidden="true" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteSectionData(section)}
                          className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-all"
                          aria-label={`Excluir seção ${section.nome}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}


        <MasonicFooter />
      </main>

      <SectionEditModal
        section={editingSection}
        isOpen={!!editingSection || isNewSectionModal}
        onClose={() => {
          setEditingSection(null);
          setIsNewSectionModal(false);
        }}
        onSave={handleSaveSection}
        isNew={isNewSectionModal}
        existingSectionsCount={sections.length}
      />

      <DeleteConfirmModal
        isOpen={!!deleteSectionData}
        onClose={() => setDeleteSectionData(null)}
        onConfirm={handleDeleteSection}
        stageName={deleteSectionData?.nome || ''}
        title="Excluir Seção"
        description="Tem certeza que deseja excluir esta seção? Todas as etapas dentro dela também serão excluídas permanentemente."
      />
    </div>
  );
};

export default Index;
