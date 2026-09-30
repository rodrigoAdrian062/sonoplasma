import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Headphones, Music2, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { formatDuration } from '@/types/audioLibrary';

type DeckId = 'A' | 'B';
type Deck = { audioId: string; volume: number };

export default function DjConsole() {
  const navigate = useNavigate();
  const { audios, isLoading } = useAudioLibrary();
  const [decks, setDecks] = useState<Record<DeckId, Deck>>({
    A: { audioId: '', volume: 0.8 },
    B: { audioId: '', volume: 0.8 },
  });
  const [crossfader, setCrossfader] = useState(50);
  const [playing, setPlaying] = useState<Record<DeckId, boolean>>({ A: false, B: false });
  const audioRefs = useRef<Record<DeckId, HTMLAudioElement | null>>({ A: null, B: null });

  const playableAudios = audios.filter((audio) => audio.audio_url && audio.tipo !== 'youtube' && audio.tipo !== 'spotify');
  const selectedAudio = (deck: DeckId) => playableAudios.find((audio) => audio.id === decks[deck].audioId);

  const applyVolumes = (nextDecks = decks, nextCrossfader = crossfader) => {
    const gainA = Math.cos((nextCrossfader / 100) * Math.PI / 2);
    const gainB = Math.sin((nextCrossfader / 100) * Math.PI / 2);
    (['A', 'B'] as DeckId[]).forEach((deck) => {
      const element = audioRefs.current[deck];
      if (element) element.volume = Math.min(1, nextDecks[deck].volume * (deck === 'A' ? gainA : gainB));
    });
  };

  useEffect(() => {
    applyVolumes();
  }, [decks, crossfader]);

  useEffect(() => () => {
    audioRefs.current.A?.pause();
    audioRefs.current.B?.pause();
  }, []);

  const updateDeck = (deck: DeckId, patch: Partial<Deck>) => {
    setDecks((current) => ({ ...current, [deck]: { ...current[deck], ...patch } }));
    if (patch.audioId !== undefined) {
      audioRefs.current[deck]?.pause();
      setPlaying((current) => ({ ...current, [deck]: false }));
    }
  };

  const togglePlayback = async (deck: DeckId) => {
    const audio = selectedAudio(deck);
    const element = audioRefs.current[deck];
    if (!audio || !element) return;
    if (playing[deck]) {
      element.pause();
      setPlaying((current) => ({ ...current, [deck]: false }));
      return;
    }
    try {
      await element.play();
      setPlaying((current) => ({ ...current, [deck]: true }));
    } catch {
      setPlaying((current) => ({ ...current, [deck]: false }));
    }
  };

  const stopDeck = (deck: DeckId) => {
    const element = audioRefs.current[deck];
    if (element) { element.pause(); element.currentTime = 0; }
    setPlaying((current) => ({ ...current, [deck]: false }));
  };

  const renderDeck = (deck: DeckId) => {
    const audio = selectedAudio(deck);
    return (
      <section className="min-w-0 rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-xl sm:p-6" aria-label={`Deck ${deck}`}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">Deck {deck}</p>
            <h2 className="mt-1 text-xl font-bold text-white">{deck === 'A' ? 'Player esquerdo' : 'Player direito'}</h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-cyan-400/70 bg-slate-950 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.22)]">
            <Music2 size={20} />
          </div>
        </div>
        <label className="mb-2 block text-sm text-slate-300" htmlFor={`track-${deck}`}>Escolher faixa</label>
        <select id={`track-${deck}`} value={decks[deck].audioId} onChange={(event) => updateDeck(deck, { audioId: event.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400">
          <option value="">Selecione uma música da biblioteca</option>
          {playableAudios.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
        </select>
        <div className="mt-5 min-h-16 rounded-xl border border-white/5 bg-black/30 p-4">
          <p className="truncate font-medium text-white">{audio?.nome || 'Nenhuma faixa carregada'}</p>
          <p className="mt-1 text-xs text-slate-400">{audio ? formatDuration(audio.duracao_segundos) || 'Faixa pronta para tocar' : 'Escolha uma faixa acima para começar'}</p>
        </div>
        {audio && <audio key={`${deck}-${audio.id}`} ref={(element) => { audioRefs.current[deck] = element; }} src={audio.audio_url} preload="metadata" onEnded={() => setPlaying((current) => ({ ...current, [deck]: false }))} />}
        <div className="mt-5 flex gap-3">
          <Button onClick={() => togglePlayback(deck)} disabled={!audio} className="h-12 flex-1 gap-2 bg-cyan-400 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-40">
            {playing[deck] ? <Pause size={18} /> : <Play size={18} />} {playing[deck] ? 'Pausar' : 'Tocar'}
          </Button>
          <Button onClick={() => stopDeck(deck)} disabled={!audio} variant="outline" className="h-12 border-white/15 text-slate-200 hover:bg-white/10" aria-label={`Parar deck ${deck}`}><RotateCcw size={17} /></Button>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Volume2 size={17} className="text-cyan-200" />
          <span className="w-12 text-xs text-slate-400">Volume</span>
          <Slider value={[decks[deck].volume * 100]} min={0} max={100} step={1} onValueChange={([value]) => updateDeck(deck, { volume: value / 100 })} aria-label={`Volume deck ${deck}`} />
          <span className="w-9 text-right font-mono text-xs text-slate-300">{Math.round(decks[deck].volume * 100)}%</span>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#080d18] text-white">
      <header className="border-b border-white/10 bg-slate-950/80">
        <div className="container flex items-center gap-3 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Voltar"><ArrowLeft size={19} /></Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Headphones size={22} /></div>
          <div><p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Sonoplasma</p><h1 className="text-lg font-bold">Mesa DJ</h1></div>
          <span className="ml-auto hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300 sm:inline-flex">2 decks · mix ao vivo</span>
        </div>
      </header>
      <main className="container max-w-6xl space-y-6 py-6 sm:py-10">
        <div className="text-center"><p className="text-sm text-slate-400">Carregue duas faixas e misture os volumes em tempo real.</p></div>
        {isLoading ? <p className="py-16 text-center text-slate-400">Carregando biblioteca...</p> : playableAudios.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-8 text-center"><Music2 className="mx-auto mb-3 text-cyan-300" /><p className="font-medium">Sua biblioteca ainda não tem faixas compatíveis.</p><Button variant="outline" className="mt-4" onClick={() => navigate('/biblioteca')}>Abrir biblioteca</Button></div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">{renderDeck('A')}{renderDeck('B')}</div>
            <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-5 sm:p-7">
              <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-fuchsia-300">Mixer central</p><h2 className="mt-1 text-lg font-bold">Crossfader</h2></div><span className="rounded-full bg-white/5 px-3 py-1 font-mono text-xs text-slate-300">A {100 - crossfader}% · {crossfader}% B</span></div>
              <div className="mb-3 flex justify-between text-xs font-bold text-cyan-200"><span>DECK A</span><span>DECK B</span></div>
              <Slider value={[crossfader]} min={0} max={100} step={1} onValueChange={([value]) => setCrossfader(value)} aria-label="Crossfader entre deck A e deck B" />
              <div className="mt-3 flex justify-between text-[11px] text-slate-500"><span>Apenas A</span><span>Mix equilibrado</span><span>Apenas B</span></div>
            </section>
            <p className="text-center text-xs text-slate-500">A mixagem funciona com arquivos e links diretos de áudio; faixas do YouTube e Spotify não aparecem nos decks.</p>
          </>
        )}
      </main>
    </div>
  );
}
