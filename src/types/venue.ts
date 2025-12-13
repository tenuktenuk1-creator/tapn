export type VenueType = 'cafe' | 'karaoke' | 'pool_snooker' | 'lounge';
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Venue {
  id: string;
  name: string;
  description: string | null;
  venue_type: VenueType;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  price_per_hour: number | null;
  opening_hours: Record<string, { open: string; close: string }> | null;
  amenities: string[] | null;
  images: string[] | null;
  rating: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  venue_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  total_price: number | null;
  status: BookingStatus;
  payment_status: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  venue?: Venue;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const venueTypeLabels: Record<VenueType, string> = {
  cafe: 'Cafe',
  karaoke: 'Karaoke',
  pool_snooker: 'Pool & Snooker',
  lounge: 'Lounge',
};

export const venueTypeColors: Record<VenueType, string> = {
  cafe: 'bg-venue-cafe',
  karaoke: 'bg-venue-karaoke',
  pool_snooker: 'bg-venue-pool',
  lounge: 'bg-venue-lounge',
};