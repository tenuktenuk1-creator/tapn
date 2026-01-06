import { Venue, venueTypeLabels } from '@/types/venue';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Phone, Mail, Clock } from 'lucide-react';

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

  // Format opening hours for display
  const formatOpeningHours = () => {
    if (!venue.opening_hours) return null;
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return days.map((day, index) => {
      const hours = venue.opening_hours?.[day];
      if (!hours) return { day: shortDays[index], hours: 'Closed' };
      return { 
        day: shortDays[index], 
        hours: `${hours.open} - ${hours.close}` 
      };
    });
  };

  const openingHours = formatOpeningHours();

  // Generate Google Maps embed URL
  const getGoogleMapsEmbedUrl = () => {
    if (venue.latitude && venue.longitude) {
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${venue.latitude},${venue.longitude}&zoom=15`;
    }
    // Fallback to address search
    const address = encodeURIComponent(`${venue.address}, ${venue.city}`);
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${address}&zoom=15`;
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
                <a href={`tel:${venue.phone}`} className="hover:text-primary transition-colors">
                  {venue.phone}
                </a>
              </div>
            )}
            {venue.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${venue.email}`} className="hover:text-primary transition-colors">
                  {venue.email}
                </a>
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
                ${venue.price_per_hour.toLocaleString()}
              </span>
              <span className="text-muted-foreground"> / hour</span>
            </div>
          )}
        </div>
      </div>

      {/* Opening Hours */}
      {openingHours && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Opening Hours
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {openingHours.map(({ day, hours }) => (
              <div key={day} className="card-dark rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-muted-foreground mb-1">{day}</div>
                <div className="text-sm font-medium">{hours}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Vibe Tags */}
      {venue.vibe_tags && venue.vibe_tags.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-lg">Vibe</h3>
          <div className="flex flex-wrap gap-2">
            {venue.vibe_tags.map((tag, i) => (
              <Badge key={i} className="gradient-primary border-0">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Google Maps */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Location
        </h3>
        <div className="rounded-2xl overflow-hidden border border-border h-[300px]">
          <iframe
            src={getGoogleMapsEmbedUrl()}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`${venue.name} location`}
          />
        </div>
      </div>
    </div>
  );
}
