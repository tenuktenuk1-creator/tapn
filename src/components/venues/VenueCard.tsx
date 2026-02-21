import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Clock, Zap, Users } from 'lucide-react';
import { PublicVenue, venueTypeLabels, priceTierLabels } from '@/types/venue';

interface VenueCardProps {
  venue: PublicVenue;
}

// Parse "HH:MM" -> total minutes from midnight
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

type OpenStatusResult = {
  label: 'OPEN' | 'BUSY' | 'FULL' | 'CLOSED' | 'SOON';
  timeLabel: string;
  isOpen: boolean;
  closingSoon: boolean;
  openingSoon: boolean;
};

// Fully correct open/closed logic:
// - Handles midnight-crossing hours (e.g. open 22:00, close 02:00)
// - Handles "closes soon" / "opens soon" within 30 min
// - Uses properly typed busy_status
function getOpenStatus(venue: PublicVenue): OpenStatusResult {
  const SOON_THRESHOLD = 30; // minutes

  if (!venue.opening_hours || Object.keys(venue.opening_hours).length === 0) {
    return { label: 'OPEN', timeLabel: 'Open Now', isOpen: true, closingSoon: false, openingSoon: false };
  }

  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const todayName = DAYS[now.getDay()];
  const todayHours = venue.opening_hours[todayName];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (!todayHours || todayHours.open === 'closed' || todayHours.close === 'closed') {
    return { label: 'CLOSED', timeLabel: 'Closed Today', isOpen: false, closingSoon: false, openingSoon: false };
  }

  const openMin = toMinutes(todayHours.open);
  const closeMin = toMinutes(todayHours.close);

  // Midnight-crossing: e.g. open=22:00, close=02:00 → closeMin < openMin
  const isMidnightCross = closeMin < openMin;

  let isCurrentlyOpen: boolean;
  if (isMidnightCross) {
    isCurrentlyOpen = currentMinutes >= openMin || currentMinutes < closeMin;
  } else {
    isCurrentlyOpen = currentMinutes >= openMin && currentMinutes < closeMin;
  }

  if (isCurrentlyOpen) {
    let minutesUntilClose: number;
    if (isMidnightCross) {
      minutesUntilClose = currentMinutes >= openMin
        ? (1440 - currentMinutes) + closeMin
        : closeMin - currentMinutes;
    } else {
      minutesUntilClose = closeMin - currentMinutes;
    }

    const closingSoon = minutesUntilClose <= SOON_THRESHOLD;
    const busy = venue.busy_status || 'quiet';

    if (busy === 'busy') {
      return { label: 'FULL', timeLabel: 'Very Busy Now', isOpen: true, closingSoon, openingSoon: false };
    }
    if (busy === 'moderate') {
      return { label: 'BUSY', timeLabel: `Moderate · Closes ${todayHours.close}`, isOpen: true, closingSoon, openingSoon: false };
    }
    if (closingSoon) {
      return { label: 'OPEN', timeLabel: `Closes soon · ${todayHours.close}`, isOpen: true, closingSoon: true, openingSoon: false };
    }
    return { label: 'OPEN', timeLabel: `Open · Closes ${todayHours.close}`, isOpen: true, closingSoon: false, openingSoon: false };
  }

  // Closed — check if opening soon
  const minutesUntilOpen = currentMinutes < openMin
    ? openMin - currentMinutes
    : (1440 - currentMinutes) + openMin;

  if (minutesUntilOpen <= SOON_THRESHOLD) {
    return { label: 'SOON', timeLabel: `Opens at ${todayHours.open}`, isOpen: false, closingSoon: false, openingSoon: true };
  }
  if (currentMinutes < openMin) {
    return { label: 'CLOSED', timeLabel: `Opens at ${todayHours.open}`, isOpen: false, closingSoon: false, openingSoon: false };
  }
  return { label: 'CLOSED', timeLabel: 'Closed Today', isOpen: false, closingSoon: false, openingSoon: false };
}

const VENUE_TYPE_COLORS: Record<string, string> = {
  cafe: 'bg-orange-500',
  karaoke: 'bg-pink-500',
  pool_snooker: 'bg-blue-500',
  lounge: 'bg-purple-500',
};

function formatPrice(price: number | null): string {
  if (!price) return '';
  if (price >= 1000) return `₮${(price / 1000).toFixed(0)}K/цаг`;
  return `₮${price}/цаг`;
}

export function VenueCard({ venue }: VenueCardProps) {
  const { label, timeLabel, isOpen, closingSoon, openingSoon } = getOpenStatus(venue);

  const statusClassName =
    label === 'FULL' ? 'bg-red-500 text-white'
    : label === 'BUSY' ? 'bg-yellow-500 text-black'
    : label === 'SOON' ? 'bg-blue-500 text-white'
    : label === 'OPEN' && closingSoon ? 'bg-orange-500 text-white'
    : label === 'OPEN' ? 'bg-green-500 text-white'
    : 'bg-gray-600 text-white';

  const timeClassName =
    label === 'FULL' ? 'text-red-500'
    : label === 'BUSY' ? 'text-yellow-500'
    : label === 'SOON' ? 'text-blue-400'
    : label === 'OPEN' && closingSoon ? 'text-orange-400'
    : label === 'OPEN' ? 'text-green-500'
    : 'text-muted-foreground';

  const displayLabel = label === 'OPEN' && closingSoon ? 'SOON' : label;

  const topAmenities = venue.amenities?.slice(0, 3) ?? [];
  const topVibes = venue.vibe_tags?.slice(0, 3) ?? [];

  return (
    <div className="card-dark rounded-2xl overflow-hidden group flex flex-col">
      {/* Image */}
      <div className="aspect-[4/3] relative overflow-hidden flex-shrink-0">
        {venue.images && venue.images.length > 0 ? (
          <img
            src={venue.images[0]}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <span className="text-4xl font-display font-bold text-muted-foreground/30">
              {venue.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Status Badge — top right */}
        <Badge
          className={`absolute top-3 right-3 ${statusClassName} border-0 rounded-full text-xs font-semibold shadow-md`}
        >
          <span
            className={`w-2 h-2 rounded-full bg-current mr-1.5 ${isOpen || openingSoon ? 'animate-pulse' : ''}`}
          />
          {displayLabel}
        </Badge>

        {/* Category Badge — bottom left */}
        <Badge
          className={`absolute bottom-3 left-3 ${VENUE_TYPE_COLORS[venue.venue_type] ?? 'bg-gray-500'} text-white border-0 rounded-lg text-xs`}
        >
          {venueTypeLabels[venue.venue_type]}
        </Badge>

        {/* Price badge — bottom right */}
        {venue.price_per_hour ? (
          <Badge className="absolute bottom-3 right-3 bg-black/70 text-white border-0 rounded-lg text-xs backdrop-blur-sm">
            {formatPrice(venue.price_per_hour)}
          </Badge>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Name */}
        <h3 className="font-display font-semibold text-lg text-foreground mb-1 line-clamp-1">
          {venue.name}
        </h3>

        {/* Rating & Price Tier */}
        <div className="flex items-center justify-between mb-3">
          {venue.rating && Number(venue.rating) > 0 ? (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-foreground">{Number(venue.rating).toFixed(1)}</span>
              {venue.review_count > 0 && (
                <span className="text-muted-foreground text-sm">({venue.review_count})</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">No reviews yet</span>
          )}
          {venue.price_tier && (
            <Badge variant="outline" className="text-xs">
              {priceTierLabels[venue.price_tier]}
            </Badge>
          )}
        </div>

        {/* Location & Hours */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{venue.address || venue.city}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className={`font-medium ${timeClassName}`}>{timeLabel}</span>
          </div>
          {isOpen && venue.busy_status && venue.busy_status !== 'quiet' && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className={venue.busy_status === 'busy' ? 'text-red-400' : 'text-yellow-400'}>
                {venue.busy_status === 'busy' ? 'Very busy right now' : 'Moderately busy'}
              </span>
            </div>
          )}
        </div>

        {/* Vibe Tags */}
        {topVibes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {topVibes.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                <Zap className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
            {(venue.vibe_tags?.length ?? 0) > 3 && (
              <span className="text-xs text-muted-foreground self-center">
                +{(venue.vibe_tags?.length ?? 0) - 3} more
              </span>
            )}
          </div>
        )}

        {/* Amenities chips */}
        {topAmenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {topAmenities.map((a) => (
              <span
                key={a}
                className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-xs"
              >
                {a}
              </span>
            ))}
            {(venue.amenities?.length ?? 0) > 3 && (
              <span className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-xs">
                +{(venue.amenities?.length ?? 0) - 3}
              </span>
            )}
          </div>
        )}

        {/* View Details Button — pushed to bottom */}
        <div className="mt-auto pt-2">
          <Link to={`/venues/${venue.id}`}>
            <Button
              variant="outline"
              className="w-full rounded-xl border-primary/50 text-primary hover:bg-primary/10"
            >
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
