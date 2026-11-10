import { createContext, useContext } from 'react';

export interface LibraryPopupTrack {
  nome: string;
  audio_url: string;
}

interface LibraryPopupPlayerContextValue {
  openPopup: (track: LibraryPopupTrack, queue?: LibraryPopupTrack[]) => void;
}

export const LibraryPopupPlayerContext = createContext<LibraryPopupPlayerContextValue | null>(null);

export function useLibraryPopupPlayer() {
  const context = useContext(LibraryPopupPlayerContext);
  if (!context) {
    throw new Error('useLibraryPopupPlayer must be used within LibraryPopupPlayerProvider');
  }
  return context;
}
