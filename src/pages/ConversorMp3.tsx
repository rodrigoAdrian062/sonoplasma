import { useEffect } from 'react';
import { ArrowLeft, ExternalLink, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const CVMP3_URL = 'https://cvmp3.com/pt/';

type BrowserOption = {
  id: 'chrome' | 'edge' | 'firefox';
  name: string;
  color: string;
  logo: string;
  scheme?: string;
};

const BROWSERS: BrowserOption[] = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    color: '#4285F4',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg',
    scheme: 'googlechrome://',
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    color: '#0078D7',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Microsoft_Edge_logo_%282019%29.svg',
    scheme: 'microsoft-edge:',
  },
  {
    id: 'firefox',
    name: 'Mozilla Firefox',
    color: '#FF7139',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Firefox_logo%2C_2019.svg',
    scheme: 'firefox://',
  },
];

export default function ConversorMp3() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Conversor MP3 | Sonoplasma';
  }, []);

  const openIn = (b: BrowserOption) => {
    // Tenta abrir com esquema do navegador; fallback abre em nova aba padrão
    try {
      if (b.scheme) {
        const url =
          b.id === 'edge'
            ? `${b.scheme}${CVMP3_URL}`
            : `${b.scheme}${CVMP3_URL.replace(/^https?:\/\//, '')}`;
        window.location.href = url;
        // Fallback após 800ms se o esquema não abrir
        setTimeout(() => {
          window.open(CVMP3_URL, '_blank', 'noopener,noreferrer');
        }, 800);
        return;
      }
    } catch {
      /* noop */
    }
    window.open(CVMP3_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-gold" />
            <h1 className="text-xl font-semibold">Conversor MP3</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Card className="border-gold/30 bg-card p-6">
          <h2 className="text-lg font-semibold mb-2">
            Converter vídeos do YouTube para MP3
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Escolha em qual navegador deseja abrir o serviço{' '}
            <span className="text-gold">cvmp3.com</span>. A página será aberta em
            uma nova aba.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {BROWSERS.map((b) => (
              <button
                key={b.id}
                onClick={() => openIn(b)}
                className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-secondary/40 p-5 transition-all hover:scale-[1.02] hover:border-gold/60 hover:bg-secondary"
                style={{ boxShadow: `inset 0 0 0 1px ${b.color}20` }}
              >
                <img
                  src={b.logo}
                  alt={b.name}
                  className="h-16 w-16 transition-transform group-hover:scale-110"
                  loading="lazy"
                />
                <span className="text-sm font-medium">{b.name}</span>
                <span
                  className="inline-flex items-center gap-1 text-xs"
                  style={{ color: b.color }}
                >
                  Abrir <ExternalLink className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">Observação:</strong> a
              abertura direta em um navegador específico depende de o mesmo
              estar instalado no dispositivo. Caso não abra, a página será
              aberta em uma nova aba do navegador atual.
            </p>
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full border-gold/40 text-gold hover:bg-gold/10"
              onClick={() => window.open(CVMP3_URL, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir no navegador atual
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
