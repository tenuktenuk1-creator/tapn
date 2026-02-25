import { useState, useEffect } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// Configure the loader once at module level (v2 functional API)
setOptions({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  version: 'weekly',
});

// Singleton promise — loads all required libraries once per session
let loadPromise: Promise<void> | null = null;

async function loadMapsLibraries(): Promise<void> {
  // importLibrary populates the global `google.maps.*` namespace as a side effect
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('visualization'),
  ]);
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function useGoogleMaps() {
  const [status, setStatus] = useState<Status>(loadPromise ? 'loading' : 'idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (status === 'idle') setStatus('loading');

    if (!loadPromise) {
      loadPromise = loadMapsLibraries().catch((err: Error) => {
        loadPromise = null; // Allow retry on next mount
        throw err;
      });
    }

    loadPromise
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err?.message ?? 'Google Maps failed to load');
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isLoading: status === 'idle' || status === 'loading',
    isReady: status === 'ready',
    isError: status === 'error',
    error,
  };
}
