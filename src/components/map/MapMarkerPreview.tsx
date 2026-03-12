import { memo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Navigation, Heart, GitCompare, X } from 'lucide-react';
import { PublicVenue, venueTypeLabels } from '@/types/venue';
import {
  BUSY_HEX,
  BUSY_LABELS,
  getSafetyInfo,
  isVenueOpenNow,
  formatDistance,
  haversineDistance,
} from '@/lib/mapUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MarkerPreviewPos {
  x: number; // pixel x within map container
  y: number; // pixel y within map container (marker anchor)
}

interface MapMarkerPreviewProps {
  venue: PublicVenue;
  pos: MarkerPreviewPos;
  isSaved: boolean;
  inCompare: boolean;
  compareCount: number;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onToggleSave: (id: string) => void;
  onAddToCompare: (venue: PublicVenue) => void;
  onRemoveFromCompare: (id: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PREVIEW_WIDTH = 248;
const MARKER_ANCHOR_OFFSET = 50; // px above the marker anchor point

const VENUE_TYPE_COLORS: Record<string, string> = {
  cafe: '#f97316',
  karaoke: '#ec4899',
  pool_snooker: '#3b82f6',
  lounge: '#a855f7',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const MapMarkerPreview = memo(function MapMarkerPreview({
  venue,
  pos,
  isSaved,
  inCompare,
  compareCount,
  userLocation,
  onClose,
  onToggleSave,
  onAddToCompare,
  onRemoveFromCompare,
}: MapMarkerPreviewProps) {
  // Animate in: mount → opacity 0 → opacity 1
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const isOpen = isVenueOpenNow(venue);
  const busyColor = BUSY_HEX[venue.busy_status] ?? BUSY_HEX.quiet;
  const typeColor = VENUE_TYPE_COLORS[venue.venue_type] ?? '#6b7280';
  const safetyItems = getSafetyInfo(venue, 2);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;

  const distance =
    userLocation && venue.latitude != null && venue.longitude != null
      ? haversineDistance(userLocation.lat, userLocation.lng, venue.latitude, venue.longitude)
      : null;

  // Status line — single, consolidated
  const statusText = isOpen
    ? `Open · ${BUSY_LABELS[venue.busy_status]}`
    : 'Closed now';

  // Clamped left position so preview stays within map container
  // MapContainer has overflow:hidden so clipping is fine, but we want the
  // preview to not start off-screen to the left either.
  const leftPx = Math.max(8, pos.x - PREVIEW_WIDTH / 2);

  return (
    <div
      role="dialog"
      aria-label={`Preview: ${venue.name}`}
      className="absolute pointer-events-auto"
      style={{
        left: leftPx,
        top: pos.y - MARKER_ANCHOR_OFFSET,
        width: PREVIEW_WIDTH,
        zIndex: 8,
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'translateY(-100%) scale(1)'
          : 'translateY(-96%) scale(0.95)',
        transition: 'opacity 200ms ease-out, transform 200ms ease-out',
      }}
    >
      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8,8,20,0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow:
            '0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(168,85,247,0.2)',
        }}
      >
        {/* Image */}
        <div className="relative h-28 bg-secondary/60 overflow-hidden">
          {venue.images?.[0] ? (
            <img
              src={venue.images[0]}
              alt={venue.name}
              className="w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl font-display font-bold text-white/20">
                {venue.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Type badge */}
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
            style={{ background: typeColor }}
          >
            {venueTypeLabels[venue.venue_type]}
          </span>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-3 pt-3 pb-2.5 space-y-2">
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-white/90 leading-tight flex-1 min-w-0 line-clamp-2">
              {venue.name}
            </h3>
            {venue.rating > 0 && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-[11px] text-white/70 font-medium">
                  {Number(venue.rating).toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Status + price row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Single consolidated status pill */}
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
              style={{ background: `${busyColor}33`, border: `1px solid ${busyColor}66`, color: busyColor }}
            >
              {statusText}
            </span>

            {venue.price_per_hour && (
              <span className="text-[11px] text-white/50 ml-auto">
                {venue.price_per_hour >= 1000
                  ? `₮${(venue.price_per_hour / 1000).toFixed(0)}K/h`
                  : `₮${venue.price_per_hour}/h`}
              </span>
            )}
          </div>

          {/* Distance */}
          {distance != null && (
            <p className="text-[11px] text-primary font-semibold">
              📍 {formatDistance(distance)}
            </p>
          )}

          {/* Safety info (max 2, only if available) */}
          {safetyItems.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {safetyItems.map((item) => (
                <span
                  key={item}
                  className="px-1.5 py-0.5 rounded text-[10px] text-white/50"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  {item}
                </span>
              ))}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-1.5 pt-0.5">
            {/* Heart */}
            <button
              type="button"
              onClick={() => onToggleSave(venue.id)}
              aria-label={isSaved ? 'Remove from saved' : 'Save venue'}
              aria-pressed={isSaved}
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                isSaved
                  ? 'text-pink-400 bg-pink-500/15 border border-pink-500/30'
                  : 'text-white/40 bg-white/5 border border-white/10 hover:text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/25'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isSaved ? 'fill-pink-400' : ''}`} />
            </button>

            {/* Compare */}
            <button
              type="button"
              onClick={() =>
                inCompare
                  ? onRemoveFromCompare(venue.id)
                  : onAddToCompare(venue)
              }
              disabled={!inCompare && compareCount >= 3}
              aria-label={inCompare ? 'Remove from compare' : 'Add to compare'}
              aria-pressed={inCompare}
              title={
                !inCompare && compareCount >= 3
                  ? 'Max 3 venues in compare'
                  : inCompare
                  ? 'Remove from compare'
                  : 'Add to compare'
              }
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                inCompare
                  ? 'text-purple-400 bg-purple-500/15 border border-purple-500/30'
                  : compareCount >= 3
                  ? 'text-white/20 bg-white/5 border border-white/5 cursor-not-allowed opacity-40'
                  : 'text-white/40 bg-white/5 border border-white/10 hover:text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/25'
              }`}
            >
              <GitCompare className="h-3.5 w-3.5" />
            </button>

            {/* Directions */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white/40 bg-white/5 border border-white/10 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/25 transition-all"
              aria-label="Get directions"
            >
              <Navigation className="h-3.5 w-3.5" />
            </a>

            {/* View Details — primary CTA */}
            <Link
              to={`/venues/${venue.id}`}
              className="flex-1 h-8 rounded-xl flex items-center justify-center text-[12px] font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                boxShadow: '0 2px 12px rgba(236,72,153,0.3)',
              }}
              onClick={onClose}
            >
              View Details
            </Link>
          </div>
        </div>
      </div>

      {/* Arrow pointing down toward the marker */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full"
        style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid rgba(8,8,20,0.94)',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
          // Align arrow with venue marker position, not necessarily centered on card
          marginLeft: pos.x - leftPx - PREVIEW_WIDTH / 2,
        }}
      />
    </div>
  );
});
