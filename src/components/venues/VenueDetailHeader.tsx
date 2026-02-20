import { PublicVenue, venueTypeLabels } from '@/types/venue';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Clock } from 'lucide-react';
import { FavoriteButton } from './FavoriteButton';

interface VenueDetailHeaderProps {
  venue: PublicVenue;
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
    const DAYS_JS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = DAYS_JS[new Date().getDay()];

    return days.map((day, index) => {
      const hours = venue.opening_hours?.[day];
      const isToday = day === todayName;
      if (!hours) return { day: shortDays[index], hours: 'Closed', isToday };
      return {
        day: shortDays[index],
        hours: `${hours.open} – ${hours.close}`,
        isToday,
      };
    });
  };

  const openingHours = formatOpeningHours();

  // Generate Google Maps embed URL
  const getGoogleMapsEmbedUrl = () => {
    if (venue.latitude && venue.longitude) {
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${venue.latitude},${venue.longitude}&zoom=15`;
    }
    const address = encodeURIComponent(`${venue.address}, ${venue.city}`);
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${address}&zoom=15`;
  };

  return (
    <div className="space-y-6">
      {/* Image Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-[300px] md:h-[400px]">
        <div className="md:col-span-2 rounded-2xl overflow-hidden bg-muted relative">
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
          {/* Favorite icon overlay on main image */}
          <div className="absolute top-3 right-3">
            <FavoriteButton venueId={venue.id} venueName={venue.name} variant="icon" />
          </div>
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
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`${venueTypeColorMap[venue.venue_type]} text-white border-0`}>
              {venueTypeLabels[venue.venue_type]}
            </Badge>
            {Number(venue.rating) > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{Number(venue.rating).toFixed(1)}</span>
                <span className="text-muted-foreground text-sm">({venue.review_count} reviews)</span>
              </div>
            )}
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-bold">{venue.name}</h1>

          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{venue.address}, {venue.city}</span>
            </div>
          </div>

          {venue.description && (
            <p className="text-muted-foreground max-w-2xl">{venue.description}</p>
          )}
        </div>

        {/* Price + Favorite button */}
        <div className="flex flex-row lg:flex-col items-center lg:items-end gap-3 lg:text-right flex-shrink-0">
          {venue.price_per_hour && (
            <div>
              <span className="text-3xl font-display font-bold text-primary">
                ₮{venue.price_per_hour.toLocaleString()}
              </span>
              <span className="text-muted-foreground"> / цаг</span>
            </div>
          )}
          <FavoriteButton venueId={venue.id} venueName={venue.name} variant="full" />
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
            {openingHours.map(({ day, hours, isToday }) => (
              <div
                key={day}
                className={`rounded-lg p-3 text-center transition-colors ${
                  isToday
                    ? 'bg-primary/10 border border-primary/30'
                    : 'card-dark'
                }`}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {day}
                  {isToday && <span className="block text-[10px]">today</span>}
                </div>
                <div className={`text-xs font-medium ${hours === 'Closed' ? 'text-muted-foreground/50' : isToday ? 'text-foreground' : ''}`}>
                  {hours}
                </div>
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
