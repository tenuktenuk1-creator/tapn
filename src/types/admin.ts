// ─── Admin shared types ───────────────────────────────────────────────────────

export interface AdminBooking {
  id: string;
  user_id: string | null;
  venue_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  total_price: number | null;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  payment_status: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
  venue?: {
    id: string;
    name: string;
    venue_type: string;
    city: string;
    price_per_hour: number | null;
    is_active: boolean;
  } | null;
}

export interface AdminVenue {
  id: string;
  name: string;
  venue_type: string;
  city: string;
  address: string;
  price_per_hour: number | null;
  is_active: boolean;
  images: string[] | null;
  amenities: string[] | null;
  opening_hours: Record<string, { open: string; close: string }> | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  owner_id: string | null;
  created_at: string;
  owner_profile?: { full_name: string | null; email: string | null } | null;
}

export interface AdminPartnerRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string | null;
}

export interface AdminPartnerVenue {
  id: string;
  user_id: string;
  venue_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  venues: {
    id: string;
    name: string;
    venue_type: string;
    city: string;
    is_active: boolean;
    price_per_hour: number | null;
  } | null;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  bookings: number;
}

export interface ActivityItem {
  id: string;
  type: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'partner_approved' | 'venue_created' | 'booking_rejected';
  message: string;
  time: string;
  meta?: string;
}

export interface PlatformStats {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  totalBookings: number;
  todayBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalVenues: number;
  activeVenues: number;
  pendingVenueApprovals: number;
  pendingPartnerApprovals: number;
}
