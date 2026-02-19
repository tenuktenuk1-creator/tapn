import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types/venue';
import { useAuth } from './useAuth';

export function useUserBookings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          venue:venues(
            id, name, venue_type, address, city, images,
            rating, review_count, price_per_hour, price_tier, vibe_tags, is_active,
            created_at, updated_at, latitude, longitude, phone, email,
            opening_hours, amenities, description
          )
        `)
        .eq('user_id', user!.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      return (data as unknown as Booking[]) || [];
    },
    enabled: !!user,
  });
}

export function useAdminBookings() {
  return useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          venue:venues(
            id, name, venue_type, address, city, images,
            rating, review_count, price_per_hour, price_tier, is_active,
            created_at, updated_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as Booking[]) || [];
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke('cancel-booking', {
        body: { bookingId },
      });
      if (error || data?.error) throw new Error(data?.error || 'Failed to cancel booking');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bookings', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
  });
}
