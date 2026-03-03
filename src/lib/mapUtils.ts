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

// ─── Map filter state ─────────────────────────────────────────────────────────

export interface MapFilterState {
  openNow: boolean;
  minRating: number | null;   // e.g. 4.5, 4.0, 3.5
  priceTier: 'budget' | 'moderate' | 'premium' | null;
  tonightChips: string[];     // active tonight chip keys
}

export const DEFAULT_MAP_FILTERS: MapFilterState = {
  openNow: false,
  minRating: null,
  priceTier: null,
  tonightChips: [],
};

export function activeFilterCount(f: MapFilterState): number {
  return (
    (f.openNow ? 1 : 0) +
    (f.minRating != null ? 1 : 0) +
    (f.priceTier != null ? 1 : 0) +
    f.tonightChips.length
  );
}

// ─── Tonight chips ────────────────────────────────────────────────────────────

export interface TonightChip {
  key: string;
  label: string;
  emoji: string;
  matcher: (v: PublicVenue) => boolean;
}

export const TONIGHT_CHIPS: TonightChip[] = [
  {
    key: 'dj',
    label: 'DJs',
    emoji: '🎧',
    matcher: (v) =>
      v.vibe_tags?.some((t) =>
        /\bdj|djs|nightlife|edm|electronic\b/i.test(t),
      ) ?? false,
  },
  {
    key: 'live_music',
    label: 'Live Music',
    emoji: '🎤',
    matcher: (v) =>
      v.vibe_tags?.some((t) =>
        /live.?music|live.?band|concert/i.test(t),
      ) ?? false,
  },
  {
    key: 'karaoke',
    label: 'Karaoke',
    emoji: '🎵',
    matcher: (v) =>
      v.venue_type === 'karaoke' ||
      (v.vibe_tags?.some((t) => /karaoke/i.test(t)) ?? false),
  },
  {
    key: 'sports',
    label: 'Sports',
    emoji: '🎱',
    matcher: (v) =>
      v.venue_type === 'pool_snooker' ||
      (v.vibe_tags?.some((t) => /sports?|competi|gaming|billiard|snooker|pool/i.test(t)) ?? false),
  },
  {
    key: 'rooftop',
    label: 'Rooftop',
    emoji: '🌆',
    matcher: (v) =>
      v.vibe_tags?.some((t) => /rooftop|roof/i.test(t)) ?? false,
  },
  {
    key: 'lounge',
    label: 'Lounge',
    emoji: '🛋️',
    matcher: (v) =>
      v.venue_type === 'lounge' ||
      (v.vibe_tags?.some((t) => /lounge/i.test(t)) ?? false),
  },
];

/** Apply all map filters to a venue array */
export function applyMapFilters(
  venues: PublicVenue[],
  filters: MapFilterState,
): PublicVenue[] {
  return venues.filter((v) => {
    if (filters.openNow && !isVenueOpenNow(v)) return false;
    if (filters.minRating != null && (Number(v.rating) || 0) < filters.minRating)
      return false;
    if (filters.priceTier != null && v.price_tier !== filters.priceTier)
      return false;
    if (filters.tonightChips.length > 0) {
      const activeChips = TONIGHT_CHIPS.filter((c) =>
        filters.tonightChips.includes(c.key),
      );
      const matchesAny = activeChips.some((c) => c.matcher(v));
      if (!matchesAny) return false;
    }
    return true;
  });
}

// ─── Safety info extraction ───────────────────────────────────────────────────

const SAFETY_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /зогсоол|parking/i,             label: '🅿️ Parking' },
  { pattern: /security|секьюрити|хамгаалалт/i, label: '🔒 Security' },
  { pattern: /18\+|18 plus|насанд.хүрэгч/i,  label: '🔞 Age 18+' },
  { pattern: /dress\s?code|дресс\s?код/i,    label: '👔 Dress code' },
  { pattern: /vip|private.?room|хувийн өрөө/i, label: '👑 VIP rooms' },
  { pattern: /reservation|урьдчилж захиалах/i, label: '📅 Reservation required' },
];

/** Returns up to `limit` safety info strings from venue amenities/description. */
export function getSafetyInfo(venue: PublicVenue, limit = 4): string[] {
  const haystack = [
    ...(venue.amenities ?? []),
    venue.description ?? '',
  ].join(' ');

  const found: string[] = [];
  for (const { pattern, label } of SAFETY_PATTERNS) {
    if (pattern.test(haystack)) {
      found.push(label);
      if (found.length >= limit) break;
    }
  }
  return found;
}

// ─── Avatar icon helpers (canvas-based circular markers) ─────────────────────

async function loadCrossOriginImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('img load failed'));
    img.src = src;
  });
}

function drawInitialsToCanvas(
  ctx: CanvasRenderingContext2D,
  name: string,
  cx: number,
  cy: number,
  r: number,
  bgColor: string,
  textColor: string,
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();

  ctx.fillStyle = textColor;
  const fontSize = Math.round(r * 0.72);
  ctx.font = `700 ${fontSize}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.charAt(0).toUpperCase(), cx, cy + 1);
}

export interface AvatarIconOpts {
  isSelected?: boolean;
  isSaved?: boolean;
  color?: string; // busy-status hex
}

/**
 * Build a circular avatar icon as a PNG data URL.
 * Uses canvas — requires CORS headers on venue images.
 * Falls back to initials on any error.
 */
export async function buildAvatarDataUrl(
  venue: PublicVenue,
  opts: AvatarIconOpts = {},
): Promise<string> {
  const { isSelected = false, isSaved = false } = opts;
  const busyColor = BUSY_HEX[venue.busy_status] ?? BUSY_HEX.quiet;
  const borderColor = isSelected ? '#ec4899' : busyColor;
  const SIZE = isSelected ? 56 : 44;
  const CX = SIZE / 2;
  const RADIUS = CX - 2;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createInitialsSvg(venue, SIZE, borderColor, isSelected, isSaved);

  // ── Draw circular avatar ──────────────────────────────────────────────────
  let hasImage = false;
  if (venue.images?.[0]) {
    try {
      const img = await loadCrossOriginImage(venue.images[0]);
      ctx.save();
      ctx.beginPath();
      ctx.arc(CX, CX, RADIUS - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 2, 2, SIZE - 4, SIZE - 4);
      ctx.restore();
      hasImage = true;
    } catch {
      // CORS or network error — fall through to initials
    }
  }

  if (!hasImage) {
    drawInitialsToCanvas(ctx, venue.name, CX, CX, RADIUS - 2, '#131825', busyColor);
  }

  // ── Border ────────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(CX, CX, RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = isSelected ? 3 : 2;
  ctx.stroke();

  // ── Selected outer glow ring ──────────────────────────────────────────────
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(CX, CX, RADIUS + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(236,72,153,0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // ── Saved heart badge ─────────────────────────────────────────────────────
  if (isSaved) {
    const hx = SIZE - 10;
    const hy = SIZE - 10;
    ctx.beginPath();
    ctx.arc(hx, hy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ec4899';
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = '700 9px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♥', hx, hy + 0.5);
  }

  try {
    return canvas.toDataURL('image/png');
  } catch {
    // Canvas tainted (CORS issue with image)
    return createInitialsSvg(venue, SIZE, borderColor, isSelected, isSaved);
  }
}

/** Synchronous SVG fallback with initials (used before canvas is ready) */
export function createInitialsSvg(
  venue: PublicVenue,
  size = 44,
  borderColor?: string,
  isSelected = false,
  isSaved = false,
): string {
  const busyColor = BUSY_HEX[venue.busy_status] ?? BUSY_HEX.quiet;
  const bc = borderColor ?? (isSelected ? '#ec4899' : busyColor);
  const cx = size / 2;
  const r = cx - 2;
  const initial = venue.name.charAt(0).toUpperCase();
  const fs = Math.round(r * 0.72);

  const outerRing = isSelected
    ? `<circle cx="${cx}" cy="${cx}" r="${r + 3}" fill="none" stroke="rgba(236,72,153,0.35)" stroke-width="3"/>`
    : '';

  const heartBadge = isSaved
    ? `<circle cx="${size - 10}" cy="${size - 10}" r="8" fill="#ec4899"/>
       <text x="${size - 10}" y="${size - 9}" text-anchor="middle" fill="white" font-size="9" font-family="serif">♥</text>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${outerRing}
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="#131825" stroke="${bc}" stroke-width="${isSelected ? 3 : 2}"/>
  <text x="${cx}" y="${cx + 1}" text-anchor="middle" dominant-baseline="central" fill="${busyColor}" font-size="${fs}" font-weight="700" font-family="Outfit,system-ui,sans-serif">${initial}</text>
  ${heartBadge}
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ─── Cluster icon (existing, kept) ────────────────────────────────────────────

export function clusterMarkerIcon(count: number): google.maps.Icon {
  const label = count > 99 ? '99+' : String(count);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
  <defs>
    <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <filter id="cglow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <circle cx="28" cy="28" r="26" fill="rgba(168,85,247,0.12)" stroke="rgba(168,85,247,0.30)" stroke-width="1.5"/>
  <circle cx="28" cy="28" r="19" fill="url(#cg)" filter="url(#cglow)" stroke="rgba(255,255,255,0.9)" stroke-width="2.5"/>
  <text x="28" y="33" text-anchor="middle" fill="white" font-size="12" font-weight="700" font-family="Outfit,sans-serif">${label}</text>
</svg>`;
  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(56, 56),
    anchor: new google.maps.Point(28, 28),
  };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export type AnalyticsEvent =
  | 'map_loaded'
  | 'map_load_error'
  | 'marker_clicked'
  | 'fullscreen_entered'
  | 'fullscreen_exited'
  | 'locate_clicked'
  | 'filter_applied'
  | 'tonight_chip_toggled'
  | 'venue_selected'
  | 'venue_saved'
  | 'venue_unsaved'
  | 'compare_added'
  | 'compare_removed'
  | 'research_area_clicked'
  | 'view_changed'
  | 'directions_clicked'
  | 'panel_venue_selected';

export function trackEvent(
  name: AnalyticsEvent,
  props?: Record<string, unknown>,
): void {
  console.info('[TAPN Analytics]', name, props ?? '');
}
