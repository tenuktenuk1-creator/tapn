import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Booking, BookingStatus } from '@/types/venue';
import { useAuth } from './useAuth';

export function useUserBookings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          venue:venues(*)
        `)
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      return data as Booking[];
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
          venue:venues(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Booking[];
    },
  });
}

interface CreateBookingData {
  venue_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  total_price: number;
  notes?: string;
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (booking: CreateBookingData) => {
      if (!user) throw new Error('Must be logged in to book');

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          ...booking,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
  });
}