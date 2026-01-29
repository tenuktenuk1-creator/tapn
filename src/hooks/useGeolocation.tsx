import { useState, useEffect, useCallback } from 'react';
import { UB_CENTER } from '@/lib/geo';

interface GeolocationState {
  latitude: number;
  longitude: number;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
  isUsingDefault: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: UB_CENTER[0],
    longitude: UB_CENTER[1],
    error: null,
    loading: true,
    permissionDenied: false,
    isUsingDefault: true,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
        isUsingDefault: true,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
          permissionDenied: false,
          isUsingDefault: false,
        });
      },
      (error) => {
        const permissionDenied = error.code === error.PERMISSION_DENIED;
        setState((prev) => ({
          ...prev,
          error: permissionDenied
            ? 'Location access denied'
            : 'Unable to retrieve your location',
          loading: false,
          permissionDenied,
          isUsingDefault: true,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, []);

  // Set location manually (for fallback)
  const setManualLocation = useCallback((lat: number, lng: number) => {
    setState({
      latitude: lat,
      longitude: lng,
      error: null,
      loading: false,
      permissionDenied: false,
      isUsingDefault: false,
    });
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    ...state,
    requestLocation,
    setManualLocation,
  };
}
