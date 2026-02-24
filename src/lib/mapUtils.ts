import { PublicVenue, BusyStatus } from '@/types/venue';

/** Great-circle distance between two lat/lon points in km (Haversine formula) */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/** Hex colors by busy status — match brand status colors */
export const BUSY_HEX: Record<BusyStatus, string> = {
  quiet: '#22c55e',
  moderate: '#eab308',
  busy: '#ef4444',
};

export const BUSY_BG: Record<BusyStatus, string> = {
  quiet: 'bg-green-500',
  moderate: 'bg-yellow-500',
  busy: 'bg-red-500',
};

export const BUSY_TEXT: Record<BusyStatus, string> = {
  quiet: 'text-green-500',
  moderate: 'text-yellow-400',
  busy: 'text-red-500',
};

export const BUSY_LABELS: Record<BusyStatus, string> = {
  quiet: 'Quiet',
  moderate: 'Moderate',
  busy: 'Busy',
};

/** Default map center — Ulaanbaatar */
export const DEFAULT_CENTER = { lat: 47.9077, lng: 106.8832 };

export function isVenueOpenNow(venue: PublicVenue): boolean {
  if (!venue.opening_hours || Object.keys(venue.opening_hours).length === 0)
    return true;
  const DAYS = [
    'sunday', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday',
  ];
  const now = new Date();
  const todayHours = venue.opening_hours[DAYS[now.getDay()]];
  if (!todayHours || todayHours.open === 'closed') return false;
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const cur = now.getHours() * 60 + now.getMinutes();
  const openMin = toMin(todayHours.open);
  const closeMin = toMin(todayHours.close);
  if (closeMin < openMin) return cur >= openMin || cur < closeMin;
  return cur >= openMin && cur < closeMin;
}

export type AnalyticsEvent =
  | 'map_loaded'
  | 'map_load_error'
  | 'marker_clicked'
  | 'fullscreen_entered'
  | 'fullscreen_exited'
  | 'locate_clicked'
  | 'filter_applied'
  | 'venue_selected'
  | 'view_changed'
  | 'directions_clicked';

export function trackEvent(
  name: AnalyticsEvent,
  props?: Record<string, unknown>,
): void {
  console.info('[TAPN Analytics]', name, props ?? '');
  // Future: window.gtag?.('event', name, props);
}
