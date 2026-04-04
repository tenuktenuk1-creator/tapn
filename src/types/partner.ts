// ─── Booking ──────────────────────────────────────────────────────────────────

export interface PartnerBooking {
  id: string;
  venue_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  total_price: number | null;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  guest_name: string | null;
  guest_email: string | null;
  guest_phone?: string | null;
  notes?: string | null;
  payment_status?: string | null;
  created_at: string;
  updated_at?: string | null;
  venues: { name: string; city: string } | null;
}

// ─── Venue ────────────────────────────────────────────────────────────────────

export interface PartnerVenue {
  id: string;
  name: string;
  city: string;
  venue_type: string;
  price_per_hour: number | null;
  is_active: boolean;
  images: string[] | null;
  amenities: string[] | null;
  opening_hours: Record<string, { open: string; close: string }> | null;
  partnerStatus?: string;
  capacity?: number | null;
}

// ─── Revenue ──────────────────────────────────────────────────────────────────

export interface RevenueDataPoint {
  label: string;
  revenue: number;
  bookings: number;
}

export interface RevenueSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  avgBookingValue: number;
  totalConfirmed: number;
}

// ─── Occupancy ────────────────────────────────────────────────────────────────

export interface OccupancyDataPoint {
  label: string;
  occupancyRate: number;
  bookings: number;
}

export interface HourlyOccupancy {
  hour: number;
  label: string;
  bookings: number;
  intensity: 'low' | 'medium' | 'high' | 'peak';
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface BusinessProfile {
  businessName: string;
  displayName: string;
  supportEmail: string;
  phone: string;
  description: string;
  website: string;
  address: string;
  instagram: string;
  facebook: string;
}

export interface OperationsDefaults {
  slotDuration: number;
  openingTime: string;
  closingTime: string;
  bufferTime: number;
  maxPartySize: number;
  minAdvanceHours: number;
  autoConfirm: boolean;
  manualApproval: boolean;
  cancellationPolicy: string;
  graceperiodMinutes: number;
}

export interface NotificationPrefs {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  newBookingAlerts: boolean;
  confirmationAlerts: boolean;
  cancellationAlerts: boolean;
  lowOccupancyAlerts: boolean;
  highDemandAlerts: boolean;
  dailySummaryEmail: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'staff' | 'host';
  permissions: string[];
  avatar?: string;
}
