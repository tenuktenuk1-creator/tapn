import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Booking, BookingStatus } from '@/types/venue';
import { useAuth } from './useAuth';

// Mock Data Helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'b1',
    venue_id: '1',
    user_id: '123', // We'll assume the logged-in user matches this or show all for demo
    booking_date: '2024-06-15',
    start_time: '20:00',
    end_time: '23:00',
    guest_count: 4,
    total_price: 450000,
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: 'credit_card',
    stripe_payment_intent_id: 'pi_mock_123',
    notes: 'Birthday celebration table required',
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
    guest_name: 'Bat-Erdene',
    guest_phone: '99119911',
    guest_email: 'bat@example.com',
    venue: {
        id: '1',
        name: 'Nebula Lounge',
        description: 'Experience the cosmos in our space-themed lounge with signature galaxy cocktails and ambient beats.',
        venue_type: 'lounge',
        address: '142 Seoul Street',
        city: 'Ulaanbaatar',
        latitude: 47.9188,
        longitude: 106.9176,
        price_per_hour: 150000,
        phone: '+976 9911 2233',
        email: 'contact@nebulalounge.mn',
        opening_hours: null,
        amenities: [],
        images: ['https://images.unsplash.com/photo-1572116469696-31de0f17cc34?q=80&w=2574&auto=format&fit=crop'],
        rating: 4.8,
        review_count: 342,
        is_active: true,
        vibe_tags: ['chill', 'luxury'],
        price_tier: 'premium',
        busy_status: 'moderate',
        busy_status_updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
  },
  {
    id: 'b2',
    venue_id: '2',
    user_id: '123',
    booking_date: '2024-06-10',
    start_time: '19:00',
    end_time: '21:00',
    guest_count: 2,
    total_price: 50000,
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: 'card',
    stripe_payment_intent_id: 'pi_mock_124',
    notes: null,
    created_at: '2024-06-05T14:30:00Z',
    updated_at: '2024-06-05T14:30:00Z',
    guest_name: 'Sarah Smith',
    guest_phone: '88776655',
    guest_email: 'sarah@example.com',
    venue: {
        id: '2',
        name: 'Cue Masters Pool Hall',
        description: 'Professional grade tables.',
        venue_type: 'pool_snooker',
        address: '5th Microdistrict',
        city: 'Ulaanbaatar',
        latitude: 47.9221,
        longitude: 106.8954,
        price_per_hour: 25000,
        phone: null,
        email: null,
        opening_hours: null,
        amenities: [],
        images: ['https://images.unsplash.com/photo-1575365533358-d7e77b629c42?q=80&w=2670&auto=format&fit=crop'],
        rating: 4.5,
        review_count: 89,
        is_active: true,
        vibe_tags: [],
        price_tier: 'budget',
        busy_status: 'quiet',
        busy_status_updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
  },
  {
    id: 'b3',
    venue_id: '3',
    user_id: 'other_user',
    booking_date: '2024-06-20',
    start_time: '21:00',
    end_time: '00:00',
    guest_count: 10,
    total_price: 180000,
    status: 'cancelled',
    payment_status: 'refunded',
    payment_method: 'credit_card',
    stripe_payment_intent_id: 'pi_mock_125',
    notes: 'Team building event',
    created_at: '2024-06-02T09:15:00Z',
    updated_at: '2024-06-03T11:00:00Z',
    guest_name: 'Boldoo',
    guest_phone: '99009900',
    guest_email: 'boldoo@corp.mn',
    venue: {
        id: '3',
        name: 'Melody Box Karaoke',
        description: 'Private luxury rooms.',
        venue_type: 'karaoke',
        address: 'Zaisan Hill',
        city: 'Ulaanbaatar',
        latitude: 0,
        longitude: 0,
        price_per_hour: 60000,
        phone: null,
        email: null,
        opening_hours: null,
        amenities: [],
        images: ['https://images.unsplash.com/photo-1595159828557-69c277732a32?q=80&w=2670&auto=format&fit=crop'],
        rating: 4.2,
        review_count: 56,
        is_active: true,
        vibe_tags: [],
        price_tier: 'moderate',
        busy_status: 'busy',
        busy_status_updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
  }
];

export function useUserBookings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-bookings', user?.id],
    queryFn: async () => {
      // Return mock bookings directly
      await delay(500);
      return MOCK_BOOKINGS.filter(b => b.user_id === '123' || b.user_id === user?.id);
    },
    enabled: !!user,
  });
}

export function useAdminBookings() {
  return useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      await delay(500);
      return [...MOCK_BOOKINGS];
    },
  });
}