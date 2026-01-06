import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Clock } from 'lucide-react';
import { Venue, venueTypeLabels, priceTierLabels } from '@/types/venue';

interface VenueCardProps {
  venue: Venue;
}

type VenueStatus = 'open' | 'busy' | 'booked';

export function VenueCard({ venue }: VenueCardProps) {
  // Simulate status (in real app this would come from backend)
  const statuses: VenueStatus[] = ['open', 'busy', 'booked'];
  const status: VenueStatus = statuses[Math.floor(Math.random() * 3)] as VenueStatus;

  const statusConfig = {
    open: { label: 'OPEN', className: 'bg-green-500 text-white' },
    busy: { label: 'BUSY', className: 'bg-yellow-500 text-black' },
    booked: { label: 'BOOKED', className: 'bg-red-500 text-white' },
  };

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
          className={`absolute top-3 right-3 ${statusConfig[status].className} border-0 rounded-full text-xs font-medium`}
        >
          <span className="w-2 h-2 rounded-full bg-current mr-1.5 animate-pulse" />
          {statusConfig[status].label}
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className={status === 'open' ? 'text-green-500' : status === 'booked' ? 'text-red-500' : ''}>
              {status === 'open' ? 'Open Now' : status === 'booked' ? 'Fully Booked' : 'Busy'}
            </span>
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
