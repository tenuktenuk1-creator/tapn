import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface UserLocationMarkerProps {
  position: [number, number];
}

const userIcon = L.divIcon({
  className: 'user-marker',
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export function UserLocationMarker({ position }: UserLocationMarkerProps) {
  return (
    <Marker position={position} icon={userIcon}>
      <Popup>
        <div className="text-center p-1">
          <p className="font-medium text-sm">Your Location</p>
        </div>
      </Popup>
    </Marker>
  );
}
