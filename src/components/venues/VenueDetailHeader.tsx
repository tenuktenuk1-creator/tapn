import { Venue, venueTypeLabels } from '@/types/venue';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Phone, Mail, Clock, Users } from 'lucide-react';

interface VenueDetailHeaderProps {
  venue: Venue;
}

export function VenueDetailHeader({ venue }: VenueDetailHeaderProps) {
  const venueTypeColorMap = {
    cafe: 'bg-orange-500',
    karaoke: 'bg-pink-500',
    pool_snooker: 'bg-blue-500',
    lounge: 'bg-primary',
  };

  return (
    <div className="space-y-6">
      {/* Image Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-[300px] md:h-[400px]">
        <div className="md:col-span-2 rounded-2xl overflow-hidden bg-muted">
          {venue.images && venue.images.length > 0 ? (
            <img
              src={venue.images[0]}
              alt={venue.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
              <span className="text-6xl font-display font-bold text-muted-foreground/30">
                {venue.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div className="hidden md:grid grid-rows-2 gap-3">
          {venue.images?.slice(1, 3).map((img, i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-muted">
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          )) || (
            <>
              <div className="rounded-xl bg-muted" />
              <div className="rounded-xl bg-muted" />
            </>
          )}
        </div>
      </div>

      {/* Venue Info */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className={`${venueTypeColorMap[venue.venue_type]} text-white border-0`}>
              {venueTypeLabels[venue.venue_type]}
            </Badge>
            {venue.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{venue.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({venue.review_count} reviews)</span>
              </div>
            )}
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-bold">{venue.name}</h1>

          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{venue.address}, {venue.city}</span>
            </div>
            {venue.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                <span>{venue.phone}</span>
              </div>
            )}
            {venue.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                <span>{venue.email}</span>
              </div>
            )}
          </div>

          {venue.description && (
            <p className="text-muted-foreground max-w-2xl">{venue.description}</p>
          )}
        </div>

        <div className="lg:text-right space-y-2">
          {venue.price_per_hour && (
            <div>
              <span className="text-3xl font-display font-bold text-primary">
                ₮{venue.price_per_hour.toLocaleString()}
              </span>
              <span className="text-muted-foreground"> / hour</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
            <Clock className="h-4 w-4" />
            <span>Open Now</span>
          </div>
        </div>
      </div>

      {/* Amenities */}
      {venue.amenities && venue.amenities.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-lg">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {venue.amenities.map((amenity, i) => (
              <Badge key={i} variant="secondary">
                {amenity}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}