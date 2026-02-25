import { memo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PublicVenue, venueTypeLabels } from '@/types/venue';
import {
  formatDistance,
  haversineDistance,
  BUSY_BG,
  BUSY_LABELS,
  isVenueOpenNow,
} from '@/lib/mapUtils';

interface MapVenueCardProps {
  venue: PublicVenue;
  isSelected?: boolean;
  /** True when the corresponding map marker is being hovered (Feature 4) */
  isHovered?: boolean;
  userLocation: { lat: number; lng: number } | null;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const VENUE_TYPE_COLORS: Record<string, string> = {
  cafe: 'bg-orange-500',
  karaoke: 'bg-pink-500',
  pool_snooker: 'bg-blue-500',
  lounge: 'bg-purple-500',
};

function formatPrice(price: number | null): string | null {
  if (!price) return null;
  if (price >= 1000) return `₮${(price / 1000).toFixed(0)}K/цаг`;
  return `₮${price}/цаг`;
}

export const MapVenueCard = memo(function MapVenueCard({
  venue,
  isSelected,
  isHovered,
  userLocation,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: MapVenueCardProps) {
  const isOpen = isVenueOpenNow(venue);

  const distance =
    userLocation && venue.latitude != null && venue.longitude != null
      ? haversineDistance(
          userLocation.lat,
          userLocation.lng,
          venue.latitude,
          venue.longitude,
        )
      : null;

  const priceLabel = formatPrice(venue.price_per_hour);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      onClick={onClick}
      onKeyDown={(e) =>
        (e.key === 'Enter' || e.key === ' ') && onClick?.()
      }
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all border outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isSelected
          ? 'border-primary bg-primary/10'
          : isHovered
          ? 'border-primary/50 bg-primary/5'
          : 'border-border bg-secondary/40 hover:bg-secondary/80'
      }`}
    >
      {/* Thumbnail */}
      <div className="w-[72px] h-[72px] rounded-lg overflow-hidden flex-shrink-0 bg-muted">
        {venue.images?.[0] ? (
          <img
            src={venue.images[0]}
            alt={venue.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <span className="text-xl font-display font-bold text-muted-foreground/30">
              {venue.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Name + type */}
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <h3 className="font-semibold text-sm text-foreground truncate leading-tight">
            {venue.name}
          </h3>
          <Badge
            className={`${
              VENUE_TYPE_COLORS[venue.venue_type] ?? 'bg-gray-500'
            } text-white border-0 text-[10px] flex-shrink-0 px-1.5 py-0`}
          >
            {venueTypeLabels[venue.venue_type]}
          </Badge>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          <Badge
            className={`${
              BUSY_BG[venue.busy_status]
            } text-white border-0 text-[10px] px-1.5 py-0`}
          >
            {BUSY_LABELS[venue.busy_status]}
          </Badge>
          <span
            className={`text-[11px] font-medium ${
              isOpen ? 'text-green-500' : 'text-muted-foreground'
            }`}
          >
            {isOpen ? 'Open' : 'Closed'}
          </span>
          {venue.rating > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              {Number(venue.rating).toFixed(1)}
            </span>
          )}
          {priceLabel && (
            <span className="text-[11px] text-muted-foreground ml-auto">
              {priceLabel}
            </span>
          )}
        </div>

        {/* Address + distance */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2">
          <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
          <span className="truncate">{venue.address || venue.city}</span>
          {distance != null && (
            <span className="flex-shrink-0 text-primary font-semibold ml-auto">
              {formatDistance(distance)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
          <Link
            to={`/venues/${venue.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1"
          >
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-[11px] border-primary/40 text-primary hover:bg-primary/10"
            >
              View
            </Button>
          </Link>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1 px-2"
            >
              <Navigation className="h-3 w-3" />
              Go
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
});
