import { useState, useEffect } from 'react';
import { Save, Clock, Type, FileText, Sparkles, Music, FolderOpen, X } from 'lucide-react';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { SpotifyIcon } from './icons/SpotifyIcon';

import { FolderMusicIcon } from './icons/FolderMusicIcon';

import { CeremonyStage, CeremonyStageInsert, CeremonyStageUpdate, suggestIconForName } from '@/types/ceremony';
import { CeremonySection } from '@/types/section';
import { CeremonyIcon } from './icons/CeremonyIcon';
import { IconPicker } from './IconPicker';
import { AudioDragPicker } from './AudioDragPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useStageAudios } from '@/hooks/useStageAudios';

interface AudioItem {
  nome: string;
  audio_url: string;
}

interface StageEditModalProps {
  stage: CeremonyStage | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CeremonyStageInsert | CeremonyStageUpdate, audios?: AudioItem[]) => void;
  isNew?: boolean;
  sections?: CeremonySection[];
  defaultSectionId?: string | null;
}

const TIME_PRESETS = [
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
];

export function StageEditModal({ stage, isOpen, onClose, onSave, isNew = false, sections = [], defaultSectionId }: StageEditModalProps) {
  const { audios: existingAudios } = useStageAudios(stage?.id);
  
  const [formData, setFormData] = useState({
    nome_simbolico: '',
    descricao: '',
    tempo_padrao: 0,
    icone: 'flame',
    icone_url: null as string | null,
    secao_id: null as string | null,
  });
  const [audioItems, setAudioItems] = useState<AudioItem[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  const steps = [
    { title: 'Nome e Descrição', icon: Type },
    { title: 'Ícone', icon: Sparkles },
    { title: 'Tempo', icon: Clock },
    { title: 'Áudios', icon: Music },
  ];

  useEffect(() => {
    if (stage) {
      setFormData({
        nome_simbolico: stage.nome_simbolico,
        descricao: stage.descricao || '',
        tempo_padrao: stage.tempo_padrao || 0,
        icone: stage.icone || 'flame',
        icone_url: (stage as any).icone_url || null,
        secao_id: stage.secao_id || null,
      });
      setCurrentStep(0);
    } else if (isNew) {
      setFormData({
        nome_simbolico: '',
        descricao: '',
        tempo_padrao: 180,
        icone: 'flame',
        icone_url: null,
        secao_id: defaultSectionId || null,
      });
      setAudioItems([]);
      setCurrentStep(0);
    }
  }, [stage, isNew, isOpen, defaultSectionId]);

  // Load existing audios when editing
  useEffect(() => {
    if (stage && existingAudios.length > 0) {
      setAudioItems(existingAudios.map(a => ({ nome: a.nome, audio_url: a.audio_url })));
    }
  }, [stage, existingAudios]);

  const handleNext = () => {
    if (currentStep === 0 && !formData.nome_simbolico.trim()) {
      toast.error('Digite o nome da etapa');
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (!formData.nome_simbolico.trim()) {
      toast.error('Digite o nome da etapa');
      setCurrentStep(0);
      return;
    }

    // Filter out audios without url
    const validAudios = audioItems.filter(a => a.audio_url.trim());
    
    onSave({
      nome_simbolico: formData.nome_simbolico,
      descricao: formData.descricao || null,
      tempo_padrao: formData.tempo_padrao,
      icone: formData.icone,
      icone_url: formData.icone_url,
      secao_id: formData.secao_id,
    } as any, validAudios);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0 && secs === 0) return 'Sem limite';
    if (secs === 0) return `${mins} min`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md w-[calc(100vw-2rem)] sm:w-full max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-0">
          <DialogTitle className="font-display text-lg sm:text-xl text-foreground flex items-center gap-2">
            {isNew ? (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 ring-1 ring-gold/20">
                  <Sparkles className="text-gold" size={18} />
                </span>
                Nova Etapa
              </>
            ) : (
              'Editar Etapa'
            )}
          </DialogTitle>
          <p className="text-left text-sm text-muted-foreground">
            {isNew ? 'Configure os detalhes em poucos passos.' : 'Atualize os detalhes da etapa.'}
          </p>
        </DialogHeader>

        {/* Step Indicator - always shown */}
        <div className="space-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-1">
            {steps.map((step, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Etapa ${index + 1}: ${step.title}`}
                aria-current={currentStep === index ? 'step' : undefined}
                onClick={() => {
                  if (index === 0 || formData.nome_simbolico.trim()) {
                    setCurrentStep(index);
                  }
                }}
                className={cn(
                  'flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-1.5 sm:px-3 text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
                  currentStep === index
                    ? 'bg-gold text-background font-semibold shadow-sm'
                    : index < currentStep
                    ? 'bg-gold/15 text-gold hover:bg-gold/25'
                    : 'bg-secondary/70 text-muted-foreground hover:bg-secondary'
                )}
              >
                <step.icon size={14} />
                <span className="hidden sm:inline">{step.title}</span>
                <span className="sr-only">{index + 1} de {steps.length}</span>
              </button>
            ))}
          </div>
          <div
            className="h-1 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label="Progresso de preenchimento"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={currentStep + 1}
          >
            <div
              className="h-full rounded-full bg-gold transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Passo {currentStep + 1} de {steps.length} · {steps[currentStep].title}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
          {/* Step 1: Nome e Descrição */}
          {currentStep === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Type size={14} className="text-gold" />
                  Nome da Etapa
                </Label>
                <Input
                  value={formData.nome_simbolico}
                  onChange={(e) => {
                    const nome = e.target.value;
                    const suggested = suggestIconForName(nome);
                    setFormData({ ...formData, nome_simbolico: nome, icone: suggested });
                  }}
                  placeholder="Ex: Entrada no Templo"
                  required
                  autoFocus={isNew}
                  className="bg-secondary border-border text-foreground text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText size={14} className="text-muted-foreground" />
                  Descrição (opcional)
                </Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Breve descrição da etapa..."
                  rows={2}
                  className="bg-secondary border-border text-foreground resize-none"
                />
              </div>

              {/* Section Selection */}
              {sections.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FolderOpen size={14} className="text-muted-foreground" />
                    Seção
                  </Label>
                  <Select
                    value={formData.secao_id || '__none__'}
                    onValueChange={(value) => setFormData({ ...formData, secao_id: value === '__none__' ? null : value })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Selecione uma seção" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="__none__">Sem seção</SelectItem>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Ícone */}
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <IconPicker
                selectedIcon={formData.icone}
                iconUrl={formData.icone_url}
                onIconChange={(icon) => setFormData({ ...formData, icone: icon })}
                onIconUrlChange={(url) => setFormData({ ...formData, icone_url: url })}
              />
            </div>
          )}

          {/* Step 3: Tempo */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <Label className="flex items-center gap-2">
                <Clock size={14} className="text-gold" />
                Duração da Etapa
              </Label>
              
              {/* Time Presets */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tempo_padrao: 0 })}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-sm transition-all',
                    formData.tempo_padrao === 0
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'bg-secondary border-border text-muted-foreground hover:border-gold/50'
                  )}
                >
                  Livre
                </button>
                {TIME_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, tempo_padrao: preset.value })}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-sm transition-all',
                      formData.tempo_padrao === preset.value
                        ? 'bg-gold/20 border-gold text-gold'
                        : 'bg-secondary border-border text-muted-foreground hover:border-gold/50'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Slider for custom time */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tempo personalizado</span>
                  <span className="text-lg font-semibold text-gold">
                    {formatTime(formData.tempo_padrao)}
                  </span>
                </div>
                <Slider
                  value={[formData.tempo_padrao]}
                  onValueChange={([value]) => setFormData({ ...formData, tempo_padrao: value })}
                  max={1800}
                  step={30}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>30 min</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Áudios */}
          {currentStep === 3 && (
            <div className="animate-fade-in space-y-3">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 bg-gold/5 py-4 text-sm font-medium text-gold transition-colors hover:bg-gold/10"
              >
                <Music size={18} />
                Escolher áudios (arrastar da biblioteca)
              </button>

              {audioItems.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground">
                  Nenhum áudio selecionado ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {audioItems.map((a) => {
                    const isYt = a.audio_url.includes('youtube.com') || a.audio_url.includes('youtu.be');
                    const isSp = a.audio_url.includes('open.spotify.com') || a.audio_url.startsWith('spotify:');
                    return (
                      <div
                        key={a.audio_url}
                        className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 p-2"
                      >
                        <div className="rounded-md bg-secondary p-1.5 shrink-0">
                          {isYt ? (
                            <YoutubeIcon size={14} />
                          ) : isSp ? (
                            <SpotifyIcon size={14} className="text-[#1DB954]" />
                          ) : (
                            <FolderMusicIcon size={14} />
                          )}
                        </div>

                        <span className="flex-1 truncate text-sm text-foreground">{a.nome || 'Áudio'}</span>
                        <button
                          type="button"
                          onClick={() => setAudioItems(audioItems.filter((x) => x.audio_url !== a.audio_url))}
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <AudioDragPicker
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                audios={audioItems}
                onChange={setAudioItems}
                stageTitle={formData.nome_simbolico}
                stageDescription={formData.descricao}
              />
            </div>
          )}


          {/* Preview Card */}
          {formData.nome_simbolico && (
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/50 animate-fade-in">
              <p className="text-xs text-muted-foreground mb-2">Prévia:</p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <CeremonyIcon 
                    name={formData.icone} 
                    imageUrl={formData.icone_url}
                    size={20} 
                    className="text-gold" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{formData.nome_simbolico}</p>
                  {formData.descricao && (
                    <p className="text-xs text-muted-foreground truncate">{formData.descricao}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm text-gold">{formatTime(formData.tempo_padrao)}</span>
                  {audioItems.filter(a => a.audio_url).length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {audioItems.filter(a => a.audio_url).length} áudio(s)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex-1 border-border text-muted-foreground hover:bg-secondary"
              >
                Voltar
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-border text-muted-foreground hover:bg-secondary"
              >
                Cancelar
              </Button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1 bg-gold text-background shadow-sm transition-all hover:bg-gold-glow hover:shadow-md"
              >
                Próximo
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                className="flex-1 bg-gold hover:bg-gold-glow text-background gap-2"
              >
                <Save size={18} />
                {isNew ? 'Criar Etapa' : 'Salvar'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
