import { memo } from 'react';
import { Link } from 'react-router-dom';
import { X, Star, MapPin, ExternalLink } from 'lucide-react';
import { PublicVenue, venueTypeLabels } from '@/types/venue';
import {
  BUSY_HEX,
  BUSY_LABELS,
  formatDistance,
  haversineDistance,
  isVenueOpenNow,
} from '@/lib/mapUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MapCompareSheetProps {
  venues: PublicVenue[]; // 1–3 venues
  userLocation: { lat: number; lng: number } | null;
  onRemove: (id: string) => void;
  onClear: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number | null): string | null {
  if (!price) return null;
  return price >= 1000
    ? `₮${(price / 1000).toFixed(0)}K/h`
    : `₮${price}/h`;
}

const VENUE_TYPE_COLORS: Record<string, string> = {
  cafe: '#f97316',
  karaoke: '#ec4899',
  pool_snooker: '#3b82f6',
  lounge: '#a855f7',
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * MapCompareSheet — bottom sheet overlay inside the map container.
 * Slides up when compareVenues.length > 0. Supports 2–3 venues.
 */
export const MapCompareSheet = memo(function MapCompareSheet({
  venues,
  userLocation,
  onRemove,
  onClear,
}: MapCompareSheetProps) {
  if (venues.length === 0) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[7] pointer-events-none"
      style={{ animation: 'slideUpIn 220ms ease-out both' }}
    >
      <div
        className="pointer-events-auto mx-3 mb-3 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8,8,20,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow:
            '0 -4px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(168,85,247,0.2)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white/90">
              Compare
            </span>
            <span className="text-xs text-white/40">
              {venues.length}/3 venues
            </span>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-white/50 hover:text-white/80 transition-colors border border-white/10 hover:border-white/20"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        </div>

        {/* Venue columns */}
        <div
          className="grid overflow-x-auto"
          style={{ gridTemplateColumns: `repeat(${venues.length}, minmax(160px, 1fr))` }}
        >
          {venues.map((venue, i) => {
            const isOpen = isVenueOpenNow(venue);
            const busyColor = BUSY_HEX[venue.busy_status] ?? BUSY_HEX.quiet;
            const typeColor = VENUE_TYPE_COLORS[venue.venue_type] ?? '#6b7280';
            const price = formatPrice(venue.price_per_hour);
            const distance =
              userLocation && venue.latitude != null && venue.longitude != null
                ? haversineDistance(
                    userLocation.lat,
                    userLocation.lng,
                    venue.latitude,
                    venue.longitude,
                  )
                : null;
            const vibes = venue.vibe_tags?.slice(0, 3) ?? [];

            return (
              <div
                key={venue.id}
                className="flex flex-col px-3 py-3"
                style={{
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : undefined,
                }}
              >
                {/* Image + remove */}
                <div className="relative mb-2.5">
                  <div className="h-20 rounded-xl overflow-hidden bg-secondary/60">
                    {venue.images?.[0] ? (
                      <img
                        src={venue.images[0]}
                        alt={venue.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl font-bold text-white/20">
                          {venue.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(venue.id)}
                    aria-label={`Remove ${venue.name} from compare`}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {/* Name */}
                <h4 className="text-xs font-semibold text-white/90 leading-tight mb-1.5 line-clamp-2">
                  {venue.name}
                </h4>

                {/* Type badge */}
                <span
                  className="self-start px-1.5 py-0.5 rounded text-[9px] font-semibold text-white mb-2"
                  style={{ background: typeColor }}
                >
                  {venueTypeLabels[venue.venue_type]}
                </span>

                {/* Stats */}
                <div className="space-y-1 flex-1">
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    <span className="text-[11px] text-white/70">
                      {venue.rating > 0 ? Number(venue.rating).toFixed(1) : '—'}
                    </span>
                  </div>

                  {/* Price */}
                  {price && (
                    <p className="text-[11px] text-white/60">{price}</p>
                  )}

                  {/* Distance */}
                  {distance != null && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5 text-primary flex-shrink-0" />
                      <span className="text-[11px] text-primary font-medium">
                        {formatDistance(distance)}
                      </span>
                    </div>
                  )}

                  {/* Status — single line */}
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold"
                    style={{
                      background: `${busyColor}22`,
                      border: `1px solid ${busyColor}44`,
                      color: busyColor,
                    }}
                  >
                    {isOpen ? `Open · ${BUSY_LABELS[venue.busy_status]}` : 'Closed'}
                  </span>

                  {/* Vibe tags */}
                  {vibes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {vibes.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded text-[9px] text-white/40"
                          style={{ background: 'rgba(255,255,255,0.06)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* View Details link */}
                <Link
                  to={`/venues/${venue.id}`}
                  className="mt-3 flex items-center justify-center gap-1 h-7 rounded-lg text-[11px] font-semibold text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
                >
                  View Details
                  <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
});
