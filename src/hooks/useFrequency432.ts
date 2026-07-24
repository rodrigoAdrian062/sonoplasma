import { useEffect, useState, useCallback } from 'react';
import { getFrequency432, setFrequency432, subscribeFrequency432 } from '@/lib/pitch432';

export function useFrequency432(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => getFrequency432());
  useEffect(() => subscribeFrequency432(setEnabled), []);
  const set = useCallback((v: boolean) => setFrequency432(v), []);
  return [enabled, set];
}
