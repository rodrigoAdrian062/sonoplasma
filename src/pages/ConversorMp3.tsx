import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Download, SplitSquareHorizontal, X } from 'lucide-react';
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
  const [split, setSplit] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    document.title = 'Conversor MP3 | Sonoplasma';
  }, []);

  // Detecta bloqueio de iframe (X-Frame-Options / CSP) — se não carregar em 4s marca erro
  useEffect(() => {
    if (!split) return;
    setIframeError(false);
    const t = setTimeout(() => {
      const el = document.getElementById('cvmp3-iframe') as HTMLIFrameElement | null;
      try {
        // Se conseguir acessar contentDocument sem erro e vier vazio, provavelmente bloqueado
        if (el && !el.contentWindow?.location.href) {
          setIframeError(true);
        }
      } catch {
        // Acesso cross-origin normal = iframe carregou de outra origem → OK
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [split]);

  const openIn = (b: BrowserOption) => {
    try {
      if (b.scheme) {
        const url =
          b.id === 'edge'
            ? `${b.scheme}${CVMP3_URL}`
            : `${b.scheme}${CVMP3_URL.replace(/^https?:\/\//, '')}`;
        window.location.href = url;
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Download className="h-5 w-5 text-gold" />
            <h1 className="text-xl font-semibold">Conversor MP3</h1>
          </div>
          <Button
            variant={split ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSplit((v) => !v)}
            className={split ? 'bg-gold text-background hover:bg-gold/90' : 'border-gold/40 text-gold hover:bg-gold/10'}
          >
            {split ? (
              <>
                <X className="mr-2 h-4 w-4" /> Fechar tela dividida
              </>
            ) : (
              <>
                <SplitSquareHorizontal className="mr-2 h-4 w-4" /> Abrir aqui (tela dividida)
              </>
            )}
          </Button>
        </div>
      </header>

      <main className={`flex-1 ${split ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 p-4' : 'mx-auto w-full max-w-4xl px-4 py-8'}`}>
        <Card className="border-gold/30 bg-card p-6 h-fit">
          <h2 className="text-lg font-semibold mb-2">
            Converter vídeos do YouTube para MP3
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Abra o serviço <span className="text-gold">cvmp3.com</span> aqui mesmo em tela dividida, ou em outro navegador.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {BROWSERS.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setSelectedBrowser(b.id);
                  setSplit(true);
                }}
                className={`group flex flex-col items-center gap-3 rounded-xl border p-5 transition-all hover:scale-[1.02] hover:bg-secondary ${
                  selectedBrowser === b.id && split
                    ? 'border-gold bg-secondary'
                    : 'border-border bg-secondary/40 hover:border-gold/60'
                }`}
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
                  {selectedBrowser === b.id && split ? 'Ativo' : 'Abrir aqui'}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">Dica:</strong> em tela dividida, o conversor abre embutido à direita. Se o site bloquear a incorporação, use um dos navegadores acima.
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-gold/40 text-gold hover:bg-gold/10"
              onClick={() => window.open(CVMP3_URL, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir em nova aba
            </Button>
            {!split && (
              <Button
                className="flex-1 bg-gold text-background hover:bg-gold/90"
                onClick={() => setSplit(true)}
              >
                <SplitSquareHorizontal className="mr-2 h-4 w-4" />
                Abrir aqui
              </Button>
            )}
          </div>
        </Card>

        {split && (
          <Card className="border-gold/30 bg-card p-0 overflow-hidden flex flex-col min-h-[70vh]">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-secondary/40 gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground truncate">
                cvmp3.com/pt/
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Abrir em:</span>
                {BROWSERS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => openIn(b)}
                    title={`Abrir no ${b.name}`}
                    aria-label={`Abrir no ${b.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/60 transition hover:scale-110 hover:border-gold/60"
                    style={{ boxShadow: `inset 0 0 0 1px ${b.color}30` }}
                  >
                    <img src={b.logo} alt={b.name} className="h-4 w-4" loading="lazy" />
                  </button>
                ))}
                <div className="mx-1 h-4 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const el = document.getElementById('cvmp3-iframe') as HTMLIFrameElement | null;
                    if (el) el.src = el.src;
                  }}
                  className="h-7 text-xs"
                >
                  Recarregar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(CVMP3_URL, '_blank', 'noopener,noreferrer')}
                  className="h-7 text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {iframeError ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  O site bloqueou a exibição incorporada. Abra em nova aba ou em outro navegador.
                </p>
                <Button
                  className="bg-gold text-background hover:bg-gold/90"
                  onClick={() => window.open(CVMP3_URL, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir em nova aba
                </Button>
              </div>
            ) : (
              <iframe
                id="cvmp3-iframe"
                src={CVMP3_URL}
                title="Conversor cvmp3"
                className="flex-1 w-full border-0 bg-white"
                referrerPolicy="no-referrer"
                allow="clipboard-write; downloads"
              />
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
