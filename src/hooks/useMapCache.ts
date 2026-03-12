/**
 * useMapCache — offline venue cache stored in localStorage.
 * Caches the last successful venues fetch so the map degrades gracefully
 * when the network drops. Cache is keyed by 'tapn_map_cache_v1'.
 *
 * CachedVenue is a minimal subset of PublicVenue — just enough for map display.
 */
import { useState, useEffect, useCallback } from 'react';
import { PublicVenue } from '@/types/venue';

const STORAGE_KEY = 'tapn_map_cache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type CachedVenue = Pick<
  PublicVenue,
  | 'id'
  | 'name'
  | 'latitude'
  | 'longitude'
  | 'images'
  | 'rating'
  | 'vibe_tags'
  | 'price_per_hour'
  | 'price_tier'
  | 'busy_status'
  | 'venue_type'
  | 'address'
  | 'city'
  | 'amenities'
  | 'is_active'
  | 'review_count'
  | 'description'
  | 'opening_hours'
  | 'busy_status_updated_at'
  | 'created_at'
  | 'updated_at'
>;

interface CacheEntry {
  venues: CachedVenue[];
  savedAt: number;
}

function readCache(): CachedVenue[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) return [];
    return entry.venues ?? [];
  } catch {
    return [];
  }
}

function writeCacheToStorage(venues: PublicVenue[]): void {
  try {
    const entry: CacheEntry = {
      venues: venues.map((v) => ({
        id: v.id,
        name: v.name,
        latitude: v.latitude,
        longitude: v.longitude,
        images: v.images,
        rating: v.rating,
        vibe_tags: v.vibe_tags,
        price_per_hour: v.price_per_hour,
        price_tier: v.price_tier,
        busy_status: v.busy_status,
        venue_type: v.venue_type,
        address: v.address,
        city: v.city,
        amenities: v.amenities,
        is_active: v.is_active,
        review_count: v.review_count,
        description: v.description,
        opening_hours: v.opening_hours,
        busy_status_updated_at: v.busy_status_updated_at,
        created_at: v.created_at,
        updated_at: v.updated_at,
      })),
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Storage full — ignore
  }
}

export interface UseMapCacheReturn {
  /** Last cached venues (empty array if no cache) */
  cachedVenues: CachedVenue[];
  /** Update the cache from a fresh venues array */
  updateCache: (venues: PublicVenue[]) => void;
  /** Whether the browser is currently offline */
  isOffline: boolean;
}

export function useMapCache(): UseMapCacheReturn {
  const [cachedVenues] = useState<CachedVenue[]>(readCache);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const updateCache = useCallback((venues: PublicVenue[]) => {
    writeCacheToStorage(venues);
  }, []);

  return { cachedVenues, updateCache, isOffline };
}
