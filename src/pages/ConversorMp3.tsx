import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, Download, SplitSquareHorizontal, X, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Converter = {
  id: string;
  name: string;
  url: string;
  note?: string;
  embeddable?: boolean; // true = costuma carregar em iframe
};

const CONVERTERS: Converter[] = [
  { id: 'cvmp3', name: 'cvmp3', url: 'https://cvmp3.com/pt/', note: 'Rápido, sem cadastro', embeddable: false },
  { id: 'ytmp3', name: 'ytmp3.cc', url: 'https://ytmp3.cc/pt15/', note: 'Clássico e simples', embeddable: false },
  { id: 'y2mate', name: 'y2mate', url: 'https://www.y2mate.com/pt/youtube-mp3', note: 'MP3 e MP4', embeddable: false },
  { id: 'mp3juices', name: 'MP3Juices', url: 'https://mp3juices.cc/', note: 'Busca por nome', embeddable: false },
  { id: 'notube', name: 'notube', url: 'https://notube.net/pt/youtube-mp3', note: 'Alta qualidade', embeddable: false },
  { id: 'flvto', name: 'flvto', url: 'https://flvto.online/pt/', note: 'Interface leve', embeddable: false },
];

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
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserOption['id']>('chrome');
  const [converterId, setConverterId] = useState<string>('cvmp3');
  const [reloadKey, setReloadKey] = useState(0);
  const loadedRef = useRef(false);

  const converter = useMemo(
    () => CONVERTERS.find((c) => c.id === converterId) ?? CONVERTERS[0],
    [converterId],
  );

  useEffect(() => {
    document.title = 'Conversor MP3 | Sonoplasma';
  }, []);

  // Detecta bloqueio de iframe (X-Frame-Options / CSP) — se não disparar onLoad em 5s, mostra fallback
  useEffect(() => {
    if (!split) return;
    setIframeBlocked(false);
    loadedRef.current = false;
    const t = setTimeout(() => {
      if (!loadedRef.current) setIframeBlocked(true);
    }, 5000);
    return () => clearTimeout(t);
  }, [split, converterId, reloadKey]);

  const openExternal = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  const openIn = (b: BrowserOption) => {
    const url = converter.url;
    try {
      if (b.scheme) {
        const deep =
          b.id === 'edge'
            ? `${b.scheme}${url}`
            : `${b.scheme}${url.replace(/^https?:\/\//, '')}`;
        window.location.href = deep;
        setTimeout(() => openExternal(url), 800);
        return;
      }
    } catch {
      /* noop */
    }
    openExternal(url);
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
          <h2 className="text-lg font-semibold mb-2">Converter vídeos do YouTube para MP3</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Escolha um conversor abaixo. Se um não carregar, tente outro — cada site funciona de um jeito.
          </p>

          {/* Lista de conversores */}
          <div className="grid gap-2 sm:grid-cols-2 mb-6">
            {CONVERTERS.map((c) => {
              const active = c.id === converterId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setConverterId(c.id);
                    setSplit(true);
                  }}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition hover:bg-secondary ${
                    active ? 'border-gold bg-secondary shadow-[0_0_0_1px_hsl(var(--gold)/0.4)]' : 'border-border bg-secondary/40 hover:border-gold/60'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-semibold">{c.name}</span>
                    {active && <span className="text-[10px] uppercase tracking-wide text-gold">Ativo</span>}
                  </div>
                  {c.note && <span className="text-xs text-muted-foreground">{c.note}</span>}
                </button>
              );
            })}
          </div>

          <div className="mb-2 text-xs text-muted-foreground uppercase tracking-wide">Abrir em outro navegador</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {BROWSERS.map((b) => (
              <button
                key={b.id}
                onClick={() => openIn(b)}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-secondary/40 p-4 transition-all hover:scale-[1.02] hover:border-gold/60 hover:bg-secondary"
                style={{ boxShadow: `inset 0 0 0 1px ${b.color}20` }}
                title={`Abrir ${converter.name} no ${b.name}`}
              >
                <img
                  src={b.logo}
                  alt={b.name}
                  className="h-12 w-12 transition-transform group-hover:scale-110"
                  loading="lazy"
                />
                <span className="text-xs font-medium">{b.name}</span>
                <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: b.color }}>
                  Abrir <ExternalLink className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            <strong className="text-foreground">Dica:</strong> a maioria dos conversores bloqueia a exibição em tela dividida por segurança. Se acontecer, use o botão "Abrir em nova aba" ou um dos navegadores acima.
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-gold/40 text-gold hover:bg-gold/10"
              onClick={() => openExternal(converter.url)}
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
              <div className="flex items-center gap-1 flex-wrap">
                {CONVERTERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setConverterId(c.id)}
                    className={`px-2 py-1 rounded-md text-xs transition ${
                      c.id === converterId
                        ? 'bg-gold text-background font-medium'
                        : 'bg-background/60 border border-border hover:border-gold/60'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {BROWSERS.map((b) => {
                  const active = selectedBrowser === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBrowser(b.id);
                        openIn(b);
                      }}
                      title={`Abrir ${converter.name} no ${b.name}`}
                      aria-label={`Abrir no ${b.name}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-md border transition hover:scale-110 ${
                        active ? 'border-gold bg-gold/10' : 'border-border bg-background/60 hover:border-gold/60'
                      }`}
                      style={{ boxShadow: `inset 0 0 0 1px ${b.color}30` }}
                    >
                      <img src={b.logo} alt={b.name} className="h-4 w-4" loading="lazy" />
                    </button>
                  );
                })}
                <div className="mx-1 h-4 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Recarregar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openExternal(converter.url)}
                  className="h-7 text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {iframeBlocked ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{converter.name}</strong> bloqueou a exibição incorporada.
                </p>
                <p className="text-xs text-muted-foreground">Tente outro conversor na aba acima ou abra em nova aba.</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-gold/40 text-gold hover:bg-gold/10"
                    onClick={() => {
                      setIframeBlocked(false);
                      setReloadKey((k) => k + 1);
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Tentar de novo
                  </Button>
                  <Button
                    className="bg-gold text-background hover:bg-gold/90"
                    onClick={() => openExternal(converter.url)}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> Abrir em nova aba
                  </Button>
                </div>
              </div>
            ) : (
              <iframe
                key={`${converter.id}-${reloadKey}`}
                src={converter.url}
                title={`Conversor ${converter.name}`}
                className="flex-1 w-full border-0 bg-white"
                referrerPolicy="no-referrer"
                allow="clipboard-write; downloads"
                onLoad={() => {
                  loadedRef.current = true;
                }}
              />
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
