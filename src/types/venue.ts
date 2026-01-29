export type VenueType = 'cafe' | 'karaoke' | 'pool_snooker' | 'lounge';
export type BookingStatus = 'confirmed' | 'cancelled';
export type PriceTier = 'budget' | 'moderate' | 'premium' | 'luxury';
export type PlannedNightStatus = 'upcoming' | 'completed' | 'cancelled';
export type BusyStatus = 'quiet' | 'moderate' | 'busy';

// Public venue data (excludes sensitive contact info)
export interface PublicVenue {
  id: string;
  name: string;
  description: string | null;
  venue_type: VenueType;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  price_per_hour: number | null;
  opening_hours: Record<string, { open: string; close: string }> | null;
  amenities: string[] | null;
  images: string[] | null;
  rating: number;
  review_count: number;
  is_active: boolean;
  vibe_tags: string[] | null;
  price_tier: PriceTier;
  busy_status: BusyStatus;
  busy_status_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

// Full venue data (includes sensitive contact info - only for authorized users)
export interface Venue extends PublicVenue {
  phone: string | null;
  email: string | null;
}

export interface Booking {
  id: string;
  venue_id: string;
  user_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  total_price: number | null;
  status: BookingStatus;
  payment_status: string;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Guest contact info (for guest checkout)
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
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

export interface PlannedStop {
  id: string;
  planned_night_id: string;
  venue_id: string;
  start_time: string;
  end_time: string;
  order_index: number;
  notes: string | null;
  created_at: string;
  venue?: PublicVenue;
}

export interface PlannedNight {
  id: string;
  user_id: string;
  name: string;
  planned_date: string;
  status: PlannedNightStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  stops?: PlannedStop[];
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

export const busyStatusLabels: Record<BusyStatus, string> = {
  quiet: 'Quiet',
  moderate: 'Moderate',
  busy: 'Busy',
};

export const busyStatusColors: Record<BusyStatus, { bg: string; text: string }> = {
  quiet: { bg: 'bg-green-500', text: 'text-white' },
  moderate: { bg: 'bg-yellow-500', text: 'text-black' },
  busy: { bg: 'bg-red-500', text: 'text-white' },
};

export const vibeTags = [
  'chill',
  'luxury',
  'energetic',
  'romantic',
  'family-friendly',
  'live-music',
  'sports',
  'rooftop',
] as const;

export const priceTierLabels: Record<PriceTier, string> = {
  budget: 'Budget',
  moderate: 'Moderate',
  premium: 'Premium',
  luxury: 'Luxury',
};

export const plannedNightStatusLabels: Record<PlannedNightStatus, string> = {
  upcoming: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
