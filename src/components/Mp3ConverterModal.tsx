import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Upload, Loader2, Download, Music, CheckCircle2, Library, FileAudio } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Job = {
  id: string;
  file: File;
  status: 'pending' | 'converting' | 'done' | 'error';
  progress: number;
  mp3Blob?: Blob;
  mp3Name?: string;
  error?: string;
  savedToLibrary?: boolean;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSaveToLibrary?: (file: File, name: string) => Promise<any>;
}

// Single-thread build — no COOP/COEP headers needed, works in Lovable preview.
const CORE_VERSION = '0.12.6';
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

export function Mp3ConverterModal({ open, onClose, onSaveToLibrary }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingFFmpeg, setLoadingFFmpeg] = useState(false);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const ffmpegRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ensureFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    setLoadingFFmpeg(true);
    try {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ]);
      const ffmpeg = new FFmpeg();
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      ]);
      await ffmpeg.load({ coreURL, wasmURL });
      ffmpegRef.current = ffmpeg;
      setFfmpegReady(true);
      return ffmpeg;
    } finally {
      setLoadingFFmpeg(false);
    }
  }, []);

  useEffect(() => {
    if (open && !ffmpegRef.current) ensureFFmpeg().catch((e) => {
      toast({ title: 'Falha ao carregar conversor', description: String(e?.message || e), variant: 'destructive' });
    });
  }, [open, ensureFFmpeg]);

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const newJobs: Job[] = arr.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      status: 'pending',
      progress: 0,
    }));
    setJobs((prev) => [...prev, ...newJobs]);
    // auto convert
    newJobs.forEach((j) => runJob(j));
  };

  const runJob = async (job: Job) => {
    try {
      const ffmpeg = await ensureFFmpeg();
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'converting', progress: 0 } : j)));

      const { fetchFile } = await import('@ffmpeg/util');
      const inputName = `in-${job.id}${job.file.name.match(/\.[^.]+$/)?.[0] || ''}`;
      const outputName = `out-${job.id}.mp3`;

      const onProg = ({ progress }: { progress: number }) => {
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, progress: Math.min(99, Math.round(progress * 100)) } : j))
        );
      };
      ffmpeg.on('progress', onProg);

      await ffmpeg.writeFile(inputName, await fetchFile(job.file));
      // 192 kbps CBR MP3
      await ffmpeg.exec(['-i', inputName, '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', outputName]);
      const data = await ffmpeg.readFile(outputName);
      ffmpeg.off('progress', onProg);
      try { await ffmpeg.deleteFile(inputName); } catch {}
      try { await ffmpeg.deleteFile(outputName); } catch {}

      const bytes = (data as Uint8Array).slice().buffer;
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const mp3Name = job.file.name.replace(/\.[^.]+$/, '') + '.mp3';

      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: 'done', progress: 100, mp3Blob: blob, mp3Name } : j
        )
      );
    } catch (err: any) {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: 'error', error: String(err?.message || err) } : j))
      );
      toast({ title: 'Erro ao converter', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const downloadJob = (job: Job) => {
    if (!job.mp3Blob || !job.mp3Name) return;
    const url = URL.createObjectURL(job.mp3Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = job.mp3Name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const saveToLibrary = async (job: Job) => {
    if (!job.mp3Blob || !job.mp3Name || !onSaveToLibrary) return;
    setSavingId(job.id);
    try {
      const file = new File([job.mp3Blob], job.mp3Name, { type: 'audio/mpeg' });
      const nameNoExt = job.mp3Name.replace(/\.mp3$/i, '');
      await onSaveToLibrary(file, nameNoExt);
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, savedToLibrary: true } : j)));
      toast({ title: 'Adicionado à biblioteca', description: nameNoExt });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const removeJob = (id: string) => setJobs((prev) => prev.filter((j) => j.id !== id));
  const clearDone = () => setJobs((prev) => prev.filter((j) => j.status !== 'done'));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl bg-slate-900 border border-[--gold]/30 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[--gold]">
            <Music className="w-5 h-5" /> Conversor de Áudio → MP3
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            100% local no seu navegador (grátis, sem servidor). Bitrate: 192 kbps.
          </DialogDescription>
        </DialogHeader>

        {/* Loading FFmpeg */}
        {loadingFFmpeg && !ffmpegReady && (
          <div className="flex items-center gap-2 text-sm text-slate-400 border border-slate-700 rounded-md p-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando conversor (~30 MB, uma vez só)…
          </div>
        )}

        {/* Dropzone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-[--gold]/40 hover:border-[--gold] rounded-lg p-8 text-center cursor-pointer transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-[--gold]" />
          <p className="text-sm text-slate-200">Arraste áudios ou vídeos aqui, ou clique para escolher</p>
          <p className="text-xs text-slate-500 mt-1">Suporta MP4, WAV, OGG, M4A, WEBM, FLAC, AAC, WMA e outros</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="audio/*,video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              if (inputRef.current) inputRef.current.value = '';
            }}
          />
        </div>

        {/* Job list */}
        {jobs.length > 0 && (
          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
            {jobs.map((job) => (
              <div key={job.id} className="border border-slate-700 rounded-md p-3 bg-slate-800/50">
                <div className="flex items-start gap-3">
                  <FileAudio className="w-4 h-4 text-[--gold] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-100 truncate">{job.mp3Name || job.file.name}</p>
                      <span className="text-xs text-slate-500 shrink-0">{formatSize(job.file.size)}</span>
                    </div>
                    {job.status === 'converting' && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={job.progress} className="h-1.5" />
                        <span className="text-xs text-slate-400 w-10 text-right">{job.progress}%</span>
                      </div>
                    )}
                    {job.status === 'error' && (
                      <p className="text-xs text-red-400 mt-1">{job.error}</p>
                    )}
                    {job.status === 'done' && (
                      <div className="flex items-center gap-1 text-xs text-emerald-400 mt-1">
                        <CheckCircle2 className="w-3 h-3" /> Convertido
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {job.status === 'done' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => downloadJob(job)} className="h-8">
                          <Download className="w-3.5 h-3.5 mr-1" /> MP3
                        </Button>
                        {onSaveToLibrary && (
                          <Button
                            size="sm"
                            onClick={() => saveToLibrary(job)}
                            disabled={job.savedToLibrary || savingId === job.id}
                            className="h-8 bg-[--gold] hover:bg-[--gold]/80 text-slate-900"
                          >
                            {savingId === job.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : job.savedToLibrary ? (
                              <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Salvo</>
                            ) : (
                              <><Library className="w-3.5 h-3.5 mr-1" /> Biblioteca</>
                            )}
                          </Button>
                        )}
                      </>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => removeJob(job.id)} className="h-8 w-8">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {jobs.some((j) => j.status === 'done') && (
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={clearDone} className="text-slate-400">
                  Limpar concluídos
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
