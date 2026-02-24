import { useRef, useEffect, memo } from 'react';
import { MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicVenue } from '@/types/venue';
import { MapVenueCard } from './MapVenueCard';

interface VenueMapPanelProps {
  venues: PublicVenue[];
  selectedVenueId: string | null;
  userLocation: { lat: number; lng: number } | null;
  isLoading: boolean;
  onVenueSelect: (id: string) => void;
}

export const VenueMapPanel = memo(function VenueMapPanel({
  venues,
  selectedVenueId,
  userLocation,
  isLoading,
  onVenueSelect,
}: VenueMapPanelProps) {
  const selectedRef = useRef<HTMLDivElement>(null);

  // Scroll the selected card into view when selection changes
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedVenueId]);

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <p className="text-sm font-medium text-foreground">
          {isLoading
            ? 'Loading…'
            : `${venues.length} venue${venues.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3">
              <Skeleton className="w-[72px] h-[72px] rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-7 w-full rounded-md" />
              </div>
            </div>
          ))
        ) : venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              No venues match your filters
            </p>
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
                userLocation={userLocation}
                onClick={() => onVenueSelect(venue.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
});
