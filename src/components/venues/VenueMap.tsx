import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { PublicVenue } from '@/types/venue';
import { VenueMapMarker } from './VenueMapMarker';
import { UserLocationMarker } from './UserLocationMarker';
import { UB_CENTER } from '@/lib/geo';

interface VenueMapProps {
  venues: (PublicVenue & { distance?: number })[];
  userLocation: { lat: number; lng: number } | null;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

// Component to handle map centering
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      map.setView(center, zoom);
      initialized.current = true;
    }
  }, [map, center, zoom]);

  return null;
}

export function VenueMap({ 
  venues, 
  userLocation, 
  center, 
  zoom = 13,
  className = ''
}: VenueMapProps) {
  const mapCenter = useMemo(() => {
    if (center) return center;
    if (userLocation) return [userLocation.lat, userLocation.lng] as [number, number];
    return UB_CENTER;
  }, [center, userLocation]);

  // Filter venues with valid coordinates
  const mappableVenues = useMemo(() => 
    venues.filter(v => v.latitude !== null && v.longitude !== null),
    [venues]
  );

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={mapCenter} zoom={zoom} />
        
        {/* User location marker */}
        {userLocation && (
          <UserLocationMarker position={[userLocation.lat, userLocation.lng]} />
        )}
        
        {/* Venue markers */}
        {mappableVenues.map((venue) => (
          <VenueMapMarker 
            key={venue.id} 
            venue={venue}
            userLocation={userLocation ?? undefined}
          />
        ))}
      </MapContainer>
      
      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
        <p className="text-xs font-medium text-foreground mb-2">Status</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Quiet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-muted-foreground">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Busy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
