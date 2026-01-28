import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InfoPanelProps {
  selectedElement: string | null;
  onClose: () => void;
}

const elementInfo: Record<string, { title: string; description: string; symbolism: string }> = {
  'floor': {
    title: 'Pavimento Mosaico',
    description: 'Piso xadrez em disposição oblíqua/diagonal que cobre todo o Ocidente do Templo, incluindo o Átrio. Os ladrilhos brancos e pretos são dispostos em ângulo de 45 graus.',
    symbolism: 'Representa a dualidade da existência: luz e trevas, bem e mal, matéria e espírito. A disposição harmoniosa simboliza que sobre o solo terrestre, apesar das diferenças entre os homens, deve existir absoluta harmonia. A Orla Denteada que o contorna simboliza a união dos Maçons e a proteção dos planos sigilosos da Obra.',
  },
  'pillar-j': {
    title: 'Coluna Jakin (J)',
    description: 'Coluna vestibular bronzeada à direita de quem entra no Templo. Possui base com folhas de papiro/lótus, fuste oco e afilado, capitel com folhas de açucena, rede e romãs, e globo no topo.',
    symbolism: 'Jakin significa "Ele estabelecerá". Marca o trópico de Capricórnio. Junto com a Coluna B, representa os obeliscos do Templo de Jerusalém e os solstícios.',
  },
  'pillar-b': {
    title: 'Coluna Boaz (B)',
    description: 'Coluna vestibular bronzeada à esquerda de quem entra no Templo. Segue o mesmo padrão arquitetônico da Coluna J.',
    symbolism: 'Boaz significa "Nele está a força". Marca o trópico de Câncer. As colunas vestibulares lembram a antiguíssima tradição das celebrações solsticiais.',
  },
  'altar': {
    title: 'Altar do Venerável Mestre',
    description: 'Mesa principal retangular, fechada na frente e laterais, sobre a qual ficam o Malhete (símbolo de autoridade), a Espada Flamejante, e o candelabro de três braços com as Luzes Litúrgicas.',
    symbolism: 'A face frontal ostenta o Esquadro, joia distintiva do Venerável Mestre. Os candelabros de três braços representam a Luz do esclarecimento e da razão.',
  },
  'altar-juramentos': {
    title: 'Altar dos Juramentos',
    description: 'Pequeno móvel de superfície triangular situado entre a divisa do Oriente e os degraus do Sólio. Sobre ele ficam as Três Grandes Luzes Emblemáticas: o Livro da Lei aberto, o Esquadro e o Compasso.',
    symbolism: 'Extensão do Altar-Mor. O Círculo entre Paralelas Tangenciais gravado na face frontal lembra que a consciência religiosa de cada Irmão é inviolável, e representa os trópicos onde o Sol não transgride.',
  },
  'throne-vm': {
    title: 'Trono da Sabedoria',
    description: 'Assento exclusivo do Venerável Mestre ou Grão-Mestre, situado sobre um plano de três degraus no Oriente. O dossel encarnado (vermelho) com franjas douradas cobre o Trono sem encobrir o Retábulo.',
    symbolism: 'Representa a Sabedoria e a autoridade democrática. A Cátedra possui espaldar alto esculpido com motivos maçônicos. O dossel vermelho é a cor tradicional do REAA.',
  },
  'throne-1v': {
    title: '1º Vigilante',
    description: 'Situado na Coluna do Norte, próximo à faixa de passagem no Ocidente. Ocupa uma mesa com dois degraus e porta a joia do Nível (Esquadro com Prumo pendente).',
    symbolism: 'O Nível representa a igualdade entre os homens. Junto ao 1º Vigilante fica a Pedra Bruta, primeira Joia Fixa, simbolizando o trabalho de aperfeiçoamento.',
  },
  'throne-2v': {
    title: '2º Vigilante',
    description: 'Situado no Sul, no meio da Coluna do Sul, de frente para o Equador. Ocupa uma mesa com um degrau e porta a joia do Prumo.',
    symbolism: 'O Prumo representa a retidão e a verticalidade moral. Junto ao 2º Vigilante fica a Pedra Cúbica, segunda Joia Fixa, com a Régua Prumo em "T" invertido.',
  },
  'benches': {
    title: 'Assentos das Colunas',
    description: 'Cadeiras confortáveis com mesas dispostas nas Colunas do Norte e do Sul. Os Aprendizes sentam-se ao Norte e os Companheiros ao Sul.',
    symbolism: 'Representam a oficina de trabalho onde os obreiros se aperfeiçoam. A disposição permite circulação horária em torno do Painel do Grau.',
  },
  'rope-81': {
    title: 'Corda de 81 Nós',
    description: 'Encontra-se no alto das paredes do Templo. O nó central fica sobre o Trono do Venerável, com 40 nós de cada lado, terminando em duas borlas (Temperança e Coragem) junto à porta.',
    symbolism: '81 é o quadrado de 9, que é o quadrado de 3 (número perfeito). O nó central representa a Unidade Indivisível (Deus). Os 40 nós representam a penitência e expectativa. A abertura da Corda na porta simboliza que a Ordem está aberta às novas ideias.',
  },
  'orador': {
    title: 'Orador',
    description: 'Ocupa mesa a noroeste dentro do Oriente, próximo à Balaustrada. Porta a joia do Livro Aberto e Rutilante.',
    symbolism: 'Guardião da Lei e da Justiça. Sobre sua mesa ficam o compêndio das leis maçônicas vigentes.',
  },
  'secretario': {
    title: 'Secretário',
    description: 'Ocupa mesa a sudeste dentro do Oriente, de frente para o Orador. Porta a joia de duas Penas Cruzadas.',
    symbolism: 'Responsável pelos registros e atas da Loja.',
  },
  'tesoureiro': {
    title: 'Tesoureiro',
    description: 'Ocupa mesa na Coluna do Norte, fora da Balaustrada, próximo ao Orador. Porta a joia de duas Chaves Cruzadas.',
    symbolism: 'Guardião das finanças e do tronco de solidariedade.',
  },
  'chanceler': {
    title: 'Chanceler',
    description: 'Ocupa mesa na Coluna do Sul, fora da Balaustrada, próximo ao Secretário. Porta a joia do Timbre ou Selo.',
    symbolism: 'Responsável pela autenticação dos documentos da Loja.',
  },
  'altar-perfumes': {
    title: 'Altar dos Perfumes',
    description: 'Pequeno móvel entre o Altar do Venerável e a mesa do Secretário. Aproximadamente 70 cm de altura.',
    symbolism: 'Reminiscência da consagração do Templo. Comprova que o espaço de trabalho se tornou digno para as práticas litúrgicas.',
  },
  'sea-bronze': {
    title: 'Mar de Bronze',
    description: 'Móvel situado a sudoeste da Loja com uma bilha (jarra) bronzeada e uma bacia artística. Acompanha uma toalha branca.',
    symbolism: 'Utilizado para purificação das mãos do iniciando durante a Cerimônia de Iniciação. A alvura da toalha após o uso comprova a pureza das mãos.',
  },
  'grade-panel': {
    title: 'Painel do Grau de Aprendiz',
    description: 'Colocado ao centro do Ocidente, entre as Colunas do Norte e do Sul, emoldurado pela Orla Denteada com quatro borlas nos cantos.',
    symbolism: 'Condensa de forma velada todo o processo iniciático do grau. Contém as Colunas J e B, os três degraus, o Delta com o Olho que Tudo Vê, Sol, Lua, Pedra Bruta e Cúbica.',
  },
  'lights-east': {
    title: 'Luzes do Oriente',
    description: 'Candelabro de sete braços e castiçais que iluminam a parte oriental do Templo.',
    symbolism: 'A Luz simboliza o esclarecimento e a razão. Quanto maior a evolução iniciática, mais luzes são acesas.',
  },
};

// Add zodiac information
const zodiacInfo: Record<string, { title: string; description: string; symbolism: string }> = {
  'zodiac-áries': { title: 'Áries ♈', description: 'Primeira constelação do Zodíaco, marca o início da primavera.', symbolism: 'Representa o início da jornada iniciática, a infância do Aprendiz.' },
  'zodiac-touro': { title: 'Touro ♉', description: 'Segunda constelação do Zodíaco.', symbolism: 'Força e determinação no caminho do aperfeiçoamento.' },
  'zodiac-gêmeos': { title: 'Gêmeos ♊', description: 'Terceira constelação do Zodíaco.', symbolism: 'Dualidade e aprendizado através do diálogo.' },
  'zodiac-câncer': { title: 'Câncer ♋', description: 'Quarta constelação, no solstício de verão.', symbolism: 'Representa o Trópico de Câncer, marcado pela Coluna B.' },
  'zodiac-leão': { title: 'Leão ♌', description: 'Quinta constelação do Zodíaco.', symbolism: 'Coragem e nobreza de caráter.' },
  'zodiac-virgem': { title: 'Virgem ♍', description: 'Sexta constelação, última do hemisfério norte.', symbolism: 'Pureza e discernimento, conclusão da fase do Aprendiz.' },
  'zodiac-libra': { title: 'Libra ♎', description: 'Sétima constelação, início do outono.', symbolism: 'Equilíbrio e justiça, início da jornada do Companheiro.' },
  'zodiac-escorpião': { title: 'Escorpião ♏', description: 'Oitava constelação do Zodíaco.', symbolism: 'Transformação e renascimento.' },
  'zodiac-sagitário': { title: 'Sagitário ♐', description: 'Nona constelação do Zodíaco.', symbolism: 'Busca pela verdade e conhecimento superior.' },
  'zodiac-capricórnio': { title: 'Capricórnio ♑', description: 'Décima constelação, no solstício de inverno.', symbolism: 'Representa o Trópico de Capricórnio, marcado pela Coluna J.' },
  'zodiac-aquário': { title: 'Aquário ♒', description: 'Décima primeira constelação.', symbolism: 'Fraternidade universal e humanismo.' },
  'zodiac-peixes': { title: 'Peixes ♓', description: 'Décima segunda constelação, conclusão do ciclo.', symbolism: 'Transcendência e conclusão da jornada do Mestre.' },
};

export function InfoPanel({ selectedElement, onClose }: InfoPanelProps) {
  if (!selectedElement) return null;

  // Combine element and zodiac info
  const allInfo = { ...elementInfo, ...zodiacInfo };
  const info = allInfo[selectedElement];
  
  if (!info) return null;

  return (
    <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg p-4 max-w-sm shadow-lg border border-border">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-primary">{info.title}</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-3 text-sm">
        <div>
          <h4 className="font-medium text-foreground mb-1">Descrição:</h4>
          <p className="text-muted-foreground">{info.description}</p>
        </div>
        
        <div>
          <h4 className="font-medium text-foreground mb-1">Simbolismo (REAA):</h4>
          <p className="text-muted-foreground">{info.symbolism}</p>
        </div>
      </div>
    </div>
  );
}
