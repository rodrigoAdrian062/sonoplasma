import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InfoPanelProps {
  selectedElement: string | null;
  onClose: () => void;
}

const elementInfo: Record<string, { title: string; description: string; symbolism: string }> = {
  'floor': {
    title: 'Pavimento Mosaico',
    description: 'O piso xadrez preto e branco que cobre o chão do templo.',
    symbolism: 'Representa a dualidade da existência: luz e trevas, bem e mal, dia e noite. Simboliza que na vida terrena estamos constantemente entre opostos e devemos buscar o equilíbrio.',
  },
  'pillar-j': {
    title: 'Coluna Jaquim (J)',
    description: 'A coluna ao Sul da entrada do templo, à direita de quem entra.',
    symbolism: 'Significa "Ele estabelecerá". Representa a força, a estabilidade e a firmeza. O globo terrestre no topo simboliza a universalidade da Maçonaria.',
  },
  'pillar-b': {
    title: 'Coluna Boaz (B)',
    description: 'A coluna ao Norte da entrada do templo, à esquerda de quem entra.',
    symbolism: 'Significa "Nele está a força". Representa a sabedoria e a inteligência. Juntas, as duas colunas representam a entrada para o conhecimento sagrado.',
  },
  'altar': {
    title: 'Altar dos Juramentos',
    description: 'O altar central onde repousam o Volume da Lei Sagrada, o Esquadro e o Compasso.',
    symbolism: 'É o ponto focal do templo, onde são prestados os juramentos. O Esquadro representa a retidão moral, o Compasso simboliza os limites que devemos impor às nossas paixões.',
  },
  'throne-vm': {
    title: 'Trono do Venerável Mestre',
    description: 'Localizado no Oriente (Leste), é o assento mais elevado do templo.',
    symbolism: 'O Venerável Mestre representa a sabedoria e dirige os trabalhos. O Oriente simboliza de onde vem a luz do conhecimento, assim como o sol nasce no leste.',
  },
  'throne-1v': {
    title: 'Trono do 1º Vigilante',
    description: 'Localizado no Ocidente (Oeste), é o segundo cargo mais importante.',
    symbolism: 'O 1º Vigilante representa a força. Assim como o sol se põe no oeste, ele encerra os trabalhos e paga os obreiros.',
  },
  'throne-2v': {
    title: 'Trono do 2º Vigilante',
    description: 'Localizado no Sul, supervisiona os trabalhos durante o período de descanso.',
    symbolism: 'O 2º Vigilante representa a beleza. Ele observa o sol ao meio-dia e chama os obreiros do descanso para o trabalho.',
  },
  'light-wisdom': {
    title: 'Luz da Sabedoria',
    description: 'Uma das três grandes luzes que iluminam o templo, posicionada próxima ao Venerável Mestre.',
    symbolism: 'Representa a sabedoria necessária para inventar e criar. É atribuída ao Venerável Mestre.',
  },
  'light-strength': {
    title: 'Luz da Força',
    description: 'Posicionada próxima ao 1º Vigilante no Ocidente.',
    symbolism: 'Representa a força necessária para sustentar e manter. É atribuída ao 1º Vigilante.',
  },
  'light-beauty': {
    title: 'Luz da Beleza',
    description: 'Posicionada próxima ao 2º Vigilante no Sul.',
    symbolism: 'Representa a beleza que adorna toda grande obra. É atribuída ao 2º Vigilante.',
  },
};

export function InfoPanel({ selectedElement, onClose }: InfoPanelProps) {
  if (!selectedElement || !elementInfo[selectedElement]) {
    return null;
  }

  const info = elementInfo[selectedElement];

  return (
    <div className="absolute top-4 left-4 max-w-sm bg-background/95 backdrop-blur-sm rounded-lg border border-gold/30 shadow-xl overflow-hidden animate-fade-in">
      <div className="bg-gold/10 px-4 py-3 flex items-center justify-between border-b border-gold/20">
        <h3 className="font-display text-lg text-gold font-semibold">{info.title}</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X size={18} />
        </Button>
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">{info.description}</p>
        </div>
        
        <div>
          <h4 className="text-xs font-semibold text-gold uppercase tracking-wider mb-1">
            Simbolismo
          </h4>
          <p className="text-sm text-foreground">{info.symbolism}</p>
        </div>
      </div>
    </div>
  );
}
