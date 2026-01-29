// Haversine formula to calculate distance between two points on Earth
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Ulaanbaatar city center coordinates
export const UB_CENTER: [number, number] = [47.9184, 106.9177];

// Sort venues by distance from a point
export function sortByDistance<T extends { latitude: number | null; longitude: number | null }>(
  venues: T[],
  userLat: number,
  userLng: number
): (T & { distance: number })[] {
  return venues
    .filter((v) => v.latitude !== null && v.longitude !== null)
    .map((venue) => ({
      ...venue,
      distance: calculateDistance(userLat, userLng, venue.latitude!, venue.longitude!),
    }))
    .sort((a, b) => a.distance - b.distance);
}

// Format distance for display
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

// Generate Google Maps directions URL
export function getDirectionsUrl(lat: number, lng: number, venueName?: string): string {
  const destination = `${lat},${lng}`;
  const label = venueName ? encodeURIComponent(venueName) : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${label}`;
}
