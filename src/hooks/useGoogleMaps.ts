import { useState, useEffect } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

// Singleton loader — one instance for the whole app lifetime.
// This prevents duplicate script tags if the hook mounts in multiple places.
let loaderInstance: Loader | null = null;
let loadPromise: Promise<void> | null = null;

function getLoader(): Loader {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
      version: 'weekly',
      libraries: ['marker', 'visualization'],
    });
  }
  return loaderInstance;
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function useGoogleMaps() {
  const [status, setStatus] = useState<Status>(loadPromise ? 'loading' : 'idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (status === 'idle') setStatus('loading');

    if (!loadPromise) {
      loadPromise = getLoader()
        .load()
        .catch((err: Error) => {
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
