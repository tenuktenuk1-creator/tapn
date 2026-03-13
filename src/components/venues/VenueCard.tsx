import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Clock } from 'lucide-react';
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
  isOpen: boolean;
  closingSoon: boolean;
  closeTime: string;
};

// Handles midnight-crossing hours (e.g. open 22:00, close 02:00)
// closingSoon = true when ≤ 2 hours left
function getOpenStatus(venue: PublicVenue): OpenStatusResult {
  const CLOSING_SOON_THRESHOLD = 120; // 2 hours in minutes

  if (!venue.opening_hours || Object.keys(venue.opening_hours).length === 0) {
    return { isOpen: true, closingSoon: false, closeTime: '' };
  }

  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const todayName = DAYS[now.getDay()];
  const todayHours = venue.opening_hours[todayName];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (!todayHours || todayHours.open === 'closed' || todayHours.close === 'closed') {
    return { isOpen: false, closingSoon: false, closeTime: '' };
  }

  const openMin = toMinutes(todayHours.open);
  const closeMin = toMinutes(todayHours.close);
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
    return {
      isOpen: true,
      closingSoon: minutesUntilClose <= CLOSING_SOON_THRESHOLD,
      closeTime: todayHours.close,
    };
  }

  return { isOpen: false, closingSoon: false, closeTime: '' };
}

export function VenueCard({ venue }: VenueCardProps) {
  const { isOpen, closingSoon, closeTime } = getOpenStatus(venue);

  // Top-right: open/closed status
  const statusBadge = isOpen
    ? closingSoon
      ? { label: 'Closing Soon', className: 'bg-yellow-500 text-black' }
      : { label: 'Open Now', className: 'bg-green-500 text-white' }
    : { label: 'Closed', className: 'bg-red-500 text-white' };

  // Top-left: traffic badge (only when open)
  const trafficBadge = isOpen && venue.busy_status
    ? venue.busy_status === 'busy'
      ? { label: 'Busy', className: 'bg-red-500 text-white' }
      : venue.busy_status === 'moderate'
        ? { label: 'Moderate', className: 'bg-yellow-500 text-black' }
        : { label: 'Quiet', className: 'bg-green-500 text-white' }
    : null;

  // Bottom time row
  const timeDisplay = !isOpen
    ? { label: 'Closed', className: 'text-red-400' }
    : closingSoon
      ? { label: `Closing Soon · ${closeTime}`, className: 'text-yellow-400' }
      : { label: `Closes ${closeTime}`, className: 'text-green-400' };

  return (
    <div className="card-dark rounded-2xl overflow-hidden group flex flex-col">
      <Link to={`/venues/${venue.id}`} className="aspect-[4/3] relative overflow-hidden flex-shrink-0 block">
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

        {/* Traffic badge — top left (only when open) */}
        {trafficBadge && (
          <Badge className={`absolute top-3 left-3 ${trafficBadge.className} border-0 rounded-full text-xs font-semibold shadow-md`}>
            {trafficBadge.label}
          </Badge>
        )}

        {/* Open/closed status — top right */}
        <Badge className={`absolute top-3 right-3 ${statusBadge.className} border-0 rounded-full text-xs font-semibold shadow-md`}>
          {statusBadge.label}
        </Badge>

        {/* Category badge — bottom left */}
        <Badge className="absolute bottom-3 left-3 bg-primary text-primary-foreground border-0 rounded-lg text-xs">
          {venueTypeLabels[venue.venue_type] ?? venue.venue_type}
        </Badge>

        {/* Price badge — bottom right */}
        {venue.price_per_hour ? (
          <Badge className="absolute bottom-3 right-3 bg-black/70 text-white border-0 rounded-lg text-xs backdrop-blur-sm">
            ₮{venue.price_per_hour >= 1000
              ? `${(venue.price_per_hour / 1000).toFixed(0)}K`
              : venue.price_per_hour}/цаг
          </Badge>
        ) : null}
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
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

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{venue.address || venue.city}</span>
        </div>

        {/* Time row */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className={`font-medium ${timeDisplay.className}`}>{timeDisplay.label}</span>
        </div>

        {/* View Details Button */}
        <div className="mt-auto">
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
