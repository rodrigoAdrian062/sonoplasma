import { useEffect, useState } from 'react';
import { isPrefetchEnabled, setPrefetchEnabled, subscribePrefetch } from '@/lib/prefetchSettings';

/** Hook reativo para o toggle de pré-carregamento das próximas etapas. */
export function usePrefetchEnabled(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => isPrefetchEnabled());
  useEffect(() => subscribePrefetch(setEnabled), []);
  return [enabled, setPrefetchEnabled];
}
