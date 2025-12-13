import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Clock } from 'lucide-react';
import { Venue, venueTypeLabels } from '@/types/venue';

interface VenueCardProps {
  venue: Venue;
}

export function VenueCard({ venue }: VenueCardProps) {
  const venueTypeColorMap = {
    cafe: 'bg-orange-500',
    karaoke: 'bg-pink-500',
    pool_snooker: 'bg-blue-500',
    lounge: 'bg-primary',
  };

  return (
    <Link to={`/venues/${venue.id}`}>
      <Card className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="aspect-[4/3] relative overflow-hidden bg-muted">
          {venue.images && venue.images.length > 0 ? (
            <img
              src={venue.images[0]}
              alt={venue.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
              <span className="text-4xl font-display font-bold text-muted-foreground/30">
                {venue.name.charAt(0)}
              </span>
            </div>
          )}
          <Badge 
            className={`absolute top-3 left-3 ${venueTypeColorMap[venue.venue_type]} text-white border-0`}
          >
            {venueTypeLabels[venue.venue_type]}
          </Badge>
        </div>
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-display font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {venue.name}
            </h3>
            {venue.rating > 0 && (
              <div className="flex items-center gap-1 text-sm shrink-0">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{venue.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <MapPin className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{venue.city}</span>
          </div>

          {venue.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {venue.description}
            </p>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Open Now</span>
            </div>
            {venue.price_per_hour && (
              <div className="text-sm">
                <span className="font-semibold text-foreground">
                  ₮{venue.price_per_hour.toLocaleString()}
                </span>
                <span className="text-muted-foreground">/hr</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}