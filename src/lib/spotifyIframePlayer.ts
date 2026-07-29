// Stub: integração com Spotify foi removida do sistema.
// Mantido apenas para compatibilidade com imports antigos — todas as funções são no-ops.

type SpotifyPlaybackData = {
  playingURI?: string;
  isPaused?: boolean;
  isBuffering?: boolean;
  duration?: number;
  position?: number;
};

export async function playSpotifyEntity(_url: string): Promise<void> {
  return Promise.reject(new Error('Spotify removido'));
}
export async function pauseSpotifyEntity(): Promise<void> {}
export async function resumeSpotifyEntity(_url?: string): Promise<void> {}
export async function seekSpotifyEntity(_seconds: number): Promise<void> {}
export function destroySpotifyPlayer(): void {}
export function subscribeSpotifyPlayback(
  _cb: (data: SpotifyPlaybackData) => void,
): () => void {
  return () => {};
}
