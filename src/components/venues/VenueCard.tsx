import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Clock } from 'lucide-react';
import { PublicVenue, venueTypeLabels, priceTierLabels } from '@/types/venue';

interface VenueCardProps {
  venue: PublicVenue;
}

// Check if venue is currently open based on opening_hours
function getOpenStatus(venue: PublicVenue): { label: string; timeLabel: string; isOpen: boolean } {
  if (!venue.opening_hours || Object.keys(venue.opening_hours).length === 0) {
    return { label: 'OPEN', timeLabel: 'Open Now', isOpen: true };
  }

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const dayName = days[now.getDay()];
  const todayHours = venue.opening_hours[dayName];

  if (!todayHours) {
    return { label: 'CLOSED', timeLabel: 'Closed Today', isOpen: false };
  }

  const [openH, openM] = todayHours.open.split(':').map(Number);
  const [closeH, closeM] = todayHours.close.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    const busy = (venue as any).busy_status as string || 'quiet';
    if (busy === 'busy') return { label: 'FULL', timeLabel: 'Very Busy', isOpen: true };
    if (busy === 'moderate') return { label: 'BUSY', timeLabel: 'Moderate', isOpen: true };
    return { label: 'OPEN', timeLabel: `Closes ${todayHours.close}`, isOpen: true };
  }

  if (currentMinutes < openMinutes) {
    return { label: 'CLOSED', timeLabel: `Opens ${todayHours.open}`, isOpen: false };
  }
  return { label: 'CLOSED', timeLabel: 'Closed today', isOpen: false };
}

export function VenueCard({ venue }: VenueCardProps) {
  const { label, timeLabel, isOpen } = getOpenStatus(venue);

  const statusClassName = label === 'OPEN' ? 'bg-green-500 text-white'
    : label === 'BUSY' ? 'bg-yellow-500 text-black'
    : label === 'FULL' ? 'bg-red-500 text-white'
    : 'bg-gray-600 text-white';

  const timeClassName = label === 'OPEN' ? 'text-green-500'
    : label === 'BUSY' ? 'text-yellow-500'
    : label === 'FULL' ? 'text-red-500'
    : 'text-muted-foreground';

  const venueTypeColorMap = {
    cafe: 'bg-orange-500',
    karaoke: 'bg-pink-500',
    pool_snooker: 'bg-blue-500',
    lounge: 'bg-purple-500',
  };

  return (
    <div className="card-dark rounded-2xl overflow-hidden group">
      {/* Image */}
      <div className="aspect-[4/3] relative overflow-hidden">
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

        {/* Status Badge */}
        <Badge
          className={`absolute top-3 right-3 ${statusClassName} border-0 rounded-full text-xs font-medium`}
        >
          <span className={`w-2 h-2 rounded-full bg-current mr-1.5 ${isOpen ? 'animate-pulse' : ''}`} />
          {label}
        </Badge>

        {/* Category Badge */}
        <Badge
          className={`absolute bottom-3 left-3 ${venueTypeColorMap[venue.venue_type]} text-white border-0 rounded-lg text-xs`}
        >
          {venueTypeLabels[venue.venue_type]}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-display font-semibold text-lg text-foreground mb-2">
          {venue.name}
        </h3>

        {/* Rating & Price Tier */}
        <div className="flex items-center justify-between mb-4">
          {venue.rating && venue.rating > 0 ? (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-foreground">{venue.rating.toFixed(1)}</span>
              {venue.review_count && (
                <span className="text-muted-foreground text-sm">({venue.review_count})</span>
              )}
            </div>
          ) : (
            <div />
          )}
          {venue.price_tier && (
            <Badge variant="outline" className="text-xs">
              {priceTierLabels[venue.price_tier]}
            </Badge>
          )}
        </div>

        {/* Location & Hours */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{venue.city}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className={timeClassName}>{timeLabel}</span>
          </div>
        </div>

        {/* View Details Button */}
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
  );
}
