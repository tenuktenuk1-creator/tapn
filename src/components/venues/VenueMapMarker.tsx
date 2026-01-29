import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BusyBadge } from './BusyBadge';
import { PublicVenue, BusyStatus } from '@/types/venue';
import { formatDistance, getDirectionsUrl } from '@/lib/geo';
import { ExternalLink, Eye } from 'lucide-react';

interface VenueMapMarkerProps {
  venue: PublicVenue & { distance?: number };
  userLocation?: { lat: number; lng: number };
}

// Create custom marker icons based on busy status
const createMarkerIcon = (status: BusyStatus) => {
  const colors: Record<BusyStatus, string> = {
    quiet: '#22c55e',
    moderate: '#eab308',
    busy: '#ef4444',
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${colors[status]};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export function VenueMapMarker({ venue, userLocation }: VenueMapMarkerProps) {
  if (!venue.latitude || !venue.longitude) return null;

  const busyStatus = venue.busy_status || 'quiet';
  const icon = createMarkerIcon(busyStatus);
  
  const distance = venue.distance ?? (
    userLocation 
      ? Math.sqrt(
          Math.pow(venue.latitude - userLocation.lat, 2) + 
          Math.pow(venue.longitude - userLocation.lng, 2)
        ) * 111 // rough km conversion
      : undefined
  );

  return (
    <Marker 
      position={[venue.latitude, venue.longitude]} 
      icon={icon}
    >
      <Popup className="venue-popup">
        <div className="min-w-[200px] p-1">
          {/* Venue Image */}
          {venue.images && venue.images.length > 0 && (
            <div className="w-full h-24 -mx-1 -mt-1 mb-2 overflow-hidden rounded-t-lg">
              <img 
                src={venue.images[0]} 
                alt={venue.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-sm text-foreground leading-tight">
              {venue.name}
            </h3>
            <BusyBadge status={busyStatus} showPulse={false} />
          </div>
          
          {/* Distance */}
          {distance !== undefined && (
            <p className="text-xs text-muted-foreground mb-3">
              📍 {formatDistance(distance)} away
            </p>
          )}
          
          {/* Actions */}
          <div className="flex gap-2">
            <Link to={`/venues/${venue.id}`} className="flex-1">
              <Button size="sm" variant="default" className="w-full text-xs">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </Link>
            <a 
              href={getDirectionsUrl(venue.latitude, venue.longitude, venue.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button size="sm" variant="outline" className="w-full text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                Directions
              </Button>
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
