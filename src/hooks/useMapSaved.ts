/**
 * useMapSaved — localStorage-backed saved venue IDs.
 * MVP: per-device, no account required.
 * Key: 'tapn_saved_v1'
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'tapn_saved_v1';

function readFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeToStorage(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage full or unavailable — ignore
  }
}

export interface UseMapSavedReturn {
  savedIds: Set<string>;
  isSaved: (id: string) => boolean;
  toggleSave: (id: string) => void;
}

export function useMapSaved(): UseMapSavedReturn {
  const [savedIds, setSavedIds] = useState<Set<string>>(readFromStorage);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      writeToStorage(next);
      return next;
    });
  }, []);

  return { savedIds, isSaved, toggleSave };
}
