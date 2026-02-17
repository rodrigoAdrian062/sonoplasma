import { useState } from 'react';
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
import { Loader2, FolderPlus, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { slugify } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import masonicBanner from '@/assets/masonic-banner.png';

const Index = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  useThemeColor(settings?.cor_tema);
  
  const { stages, isLoading: stagesLoading } = useStages();
  const { sections, isLoading: sectionsLoading, createSection, updateSection, deleteSection } = useSections();

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

  const getStageCount = (sectionId: string) => {
    return stages.filter(s => s.secao_id === sectionId).length;
  };

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
        {/* Banner decorativo */}
        <div className="relative mb-6 rounded-2xl overflow-hidden border border-gold/20 shadow-lg shadow-gold/5">
          <img 
            src={masonicBanner} 
            alt="Sonoplastia Cerimonial" 
            className="w-full h-32 sm:h-44 object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6">
            <h2 className="font-display text-lg sm:text-2xl font-bold text-gold drop-shadow-lg">
              Seções do Cerimonial
            </h2>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-6">Nenhuma seção cadastrada</p>
            <Button
              onClick={() => setIsNewSectionModal(true)}
              className="bg-gold hover:bg-gold/90 text-background gap-2"
            >
              <FolderPlus size={18} />
              Criar primeira seção
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {sections.map((section, index) => {
              const stageCount = getStageCount(section.id);
              return (
                <div
                  key={section.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div
                    className="group bg-card/50 hover:bg-card border border-border/50 hover:border-gold/20 rounded-xl p-4 sm:p-5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-gold/5"
                    onClick={() => navigate(`/secao/${slugify(section.nome)}-${section.id.slice(0, 8)}`)}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 bg-gold/10 group-hover:bg-gold/20 rounded-xl transition-colors duration-300">
                        {section.icone_url ? (
                          <img src={section.icone_url} alt={section.nome} className="w-6 h-6 object-cover rounded" />
                        ) : (
                          <CeremonyIcon
                            name={section.icone || 'folder'}
                            size={24}
                            className="text-gold"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base sm:text-lg font-semibold text-foreground truncate group-hover:text-gold transition-colors duration-300">
                          {section.nome}
                        </h3>
                        {section.descricao && (
                          <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                            {section.descricao}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {stageCount} {stageCount === 1 ? 'etapa' : 'etapas'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSection(section)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Editar seção"
                        >
                          <Edit2 size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteSectionData(section)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Excluir seção"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                      <ChevronRight size={20} className="text-muted-foreground group-hover:text-gold transition-colors shrink-0" />
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
