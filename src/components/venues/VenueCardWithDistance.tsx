import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Navigation } from 'lucide-react';
import { PublicVenue, venueTypeLabels, priceTierLabels } from '@/types/venue';
import { BusyBadge } from './BusyBadge';
import { formatDistance, getDirectionsUrl } from '@/lib/geo';

interface VenueCardWithDistanceProps {
  venue: PublicVenue & { distance?: number };
}

export function VenueCardWithDistance({ venue }: VenueCardWithDistanceProps) {
  const venueTypeColorMap = {
    cafe: 'bg-orange-500',
    karaoke: 'bg-pink-500',
    pool_snooker: 'bg-blue-500',
    lounge: 'bg-purple-500',
  };

  const busyStatus = venue.busy_status || 'quiet';

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
        
        {/* Busy Status Badge */}
        <div className="absolute top-3 right-3">
          <BusyBadge status={busyStatus} />
        </div>

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

        {/* Location & Distance */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{venue.city}</span>
            {venue.distance !== undefined && (
              <span className="text-primary font-medium">
                • {formatDistance(venue.distance)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link to={`/venues/${venue.id}`} className="flex-1">
            <Button 
              variant="outline" 
              className="w-full rounded-xl border-primary/50 text-primary hover:bg-primary/10"
            >
              View Details
            </Button>
          </Link>
          {venue.latitude && venue.longitude && (
            <a 
              href={getDirectionsUrl(venue.latitude, venue.longitude, venue.name)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-xl"
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
