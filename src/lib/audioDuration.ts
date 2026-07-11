/**
 * Descobre a duração (em segundos) de um áudio carregável por <audio>.
 * Funciona para arquivos locais (object URL) e URLs diretas/Storage.
 * Não funciona para YouTube/Spotify (retorna rejeição).
 */
export function probeAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    const cleanup = () => {
      audio.removeAttribute('src');
      audio.load();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('timeout'));
    }, 12000);
    audio.onloadedmetadata = () => {
      clearTimeout(timer);
      const d = audio.duration;
      cleanup();
      if (Number.isFinite(d) && d > 0) resolve(d);
      else reject(new Error('sem duração'));
    };
    audio.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error('erro ao carregar'));
    };
    audio.src = url;
  });
}
