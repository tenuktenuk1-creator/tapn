import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Venue } from '@/types/venue';

export function useIsPartner() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['is-partner', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'partner')
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });
}

export function usePartnerVenues() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['partner-venues', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: partnerVenues, error: pvError } = await supabase
        .from('partner_venues')
        .select('venue_id, status')
        .eq('user_id', user.id);
      if (pvError) throw pvError;
      if (!partnerVenues?.length) return [];
      const venueIds = partnerVenues.map(pv => pv.venue_id).filter(Boolean);
      if (!venueIds.length) return [];
      const { data: venues, error: vError } = await supabase
        .from('venues')
        .select('*')
        .in('id', venueIds);
      if (vError) throw vError;
      return (venues || []).map(venue => ({
        ...venue,
        partnerStatus: partnerVenues.find(pv => pv.venue_id === venue.id)?.status || 'pending'
      }));
    },
    enabled: !!user,
  });
}

export function usePartnerBookings() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['partner-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get partner's approved venue IDs
      const { data: partnerVenues, error: pvError } = await supabase
        .from('partner_venues')
        .select('venue_id')
        .eq('user_id', user.id)
        .eq('status', 'approved');
      if (pvError) throw pvError;
      if (!partnerVenues?.length) return [];
      const venueIds = partnerVenues.map(pv => pv.venue_id).filter(Boolean);
      if (!venueIds.length) return [];
      const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select('*, venues(name, city)')
        .in('venue_id', venueIds)
        .order('booking_date', { ascending: false });
      if (bError) throw bError;
      return bookings || [];
    },
    enabled: !!user,
  });
}

// Partner confirms a booking (pending → confirmed)
export function useConfirmBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
    },
  });
}

// Partner declines a booking (pending → cancelled)
export function useDeclineBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
    },
  });
}

export function useBecomePartner() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'partner' as const });
      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-partner'] });
    },
  });
}

type CreateVenueInput = {
  name: string;
  venue_type: Venue['venue_type'];
  description?: string | null;
  address: string;
  city: string;
  phone?: string | null;
  email?: string | null;
  price_per_hour?: number | null;
  is_active?: boolean;
  images?: string[];
  amenities?: string[];
  opening_hours?: Record<string, { open: string; close: string }> | null;
};

export function useCreatePartnerVenue() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (venue: CreateVenueInput) => {
      if (!user) throw new Error('Not authenticated');
      // Create venue as inactive — admin must approve
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .insert({ ...venue, is_active: false })
        .select()
        .single();
      if (venueError) throw venueError;
      // Create partner_venue association as PENDING (admin must approve)
      const { error: pvError } = await supabase
        .from('partner_venues')
        .insert({ user_id: user.id, venue_id: venueData.id, status: 'pending' });
      if (pvError) throw pvError;
      return venueData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-venues'] });
      queryClient.invalidateQueries({ queryKey: ['public-venues'] });
    },
  });
}

export function useUpdatePartnerVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...venue }: Partial<Venue> & { id: string }) => {
      const { data, error } = await supabase
        .from('venues')
        .update(venue)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-venues'] });
      queryClient.invalidateQueries({ queryKey: ['public-venues'] });
      queryClient.invalidateQueries({ queryKey: ['public-venue', data.id] });
    },
  });
}
