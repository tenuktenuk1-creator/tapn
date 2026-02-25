import { useRef, useEffect, memo } from 'react';
import { X, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicVenue } from '@/types/venue';
import { MapVenueCard } from './MapVenueCard';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MapFloatingPanelProps {
  venues: PublicVenue[];
  selectedVenueId: string | null;
  hoveredVenueId: string | null;
  userLocation: { lat: number; lng: number } | null;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onVenueSelect: (id: string) => void;
  onVenueHover: (id: string | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Glass-morphism floating panel that overlays the left side of the map.
 * Desktop only — hidden on mobile (mobile uses Drawer in Venues.tsx).
 * Animates in/out with opacity + translate transitions (Feature 1 + 9).
 */
export const MapFloatingPanel = memo(function MapFloatingPanel({
  venues,
  selectedVenueId,
  hoveredVenueId,
  userLocation,
  isLoading,
  isOpen,
  onClose,
  onVenueSelect,
  onVenueHover,
}: MapFloatingPanelProps) {
  const selectedRef = useRef<HTMLDivElement>(null);

  // Scroll selected card into view whenever selection changes (and panel is open)
  useEffect(() => {
    if (isOpen) {
      selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedVenueId, isOpen]);

  return (
    <div
      className={`absolute left-3 top-3 bottom-3 z-[4] w-[280px] hidden lg:flex flex-col rounded-2xl overflow-hidden transition-all duration-200 ease-out ${
        isOpen
          ? 'opacity-100 translate-x-0 pointer-events-auto'
          : 'opacity-0 -translate-x-3 pointer-events-none'
      }`}
      style={{
        background: 'rgba(8, 8, 20, 0.86)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow:
          '0 8px 32px rgba(0,0,0,0.65), 0 0 0 1px rgba(168,85,247,0.18)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-sm font-semibold text-white/90">
          {isLoading
            ? 'Loading…'
            : `${venues.length} venue${venues.length !== 1 ? 's' : ''}`}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Scrollable list ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3">
              <Skeleton className="w-[72px] h-[72px] rounded-lg flex-shrink-0 bg-white/10" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-3/4 bg-white/10" />
                <Skeleton className="h-3 w-1/2 bg-white/10" />
                <Skeleton className="h-7 w-full rounded-md bg-white/10" />
              </div>
            </div>
          ))
        ) : venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <MapPin className="h-8 w-8 mb-2 text-white/20" />
            <p className="text-sm text-white/40">No venues match your filters</p>
          </div>
        ) : (
          venues.map((venue) => (
            <div
              key={venue.id}
              ref={venue.id === selectedVenueId ? selectedRef : undefined}
            >
              <MapVenueCard
                venue={venue}
                isSelected={venue.id === selectedVenueId}
                isHovered={venue.id === hoveredVenueId}
                userLocation={userLocation}
                onClick={() => onVenueSelect(venue.id)}
                onMouseEnter={() => onVenueHover(venue.id)}
                onMouseLeave={() => onVenueHover(null)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
});
