import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Venue } from '@/types/venue';
import { notify } from '@/lib/notifications';

type PartnerRequestRecord = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string | null;
};

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
  const queryClient = useQueryClient();

  // Realtime: invalidate the cache whenever any booking row is inserted or
  // updated. Supabase RLS ensures this channel only delivers rows the partner
  // is authorised to see, so we just need to trigger a refetch.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`partner-bookings-rt-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['partner-bookings', user.id] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['partner-bookings', user.id] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return useQuery({
    queryKey: ['partner-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Fetch ALL venue IDs for this partner regardless of approval status.
      // A partner created these venues themselves and must see incoming bookings
      // even while admin approval is pending. The RLS UPDATE policy still
      // prevents them from confirming/rejecting until status = 'approved'.
      const { data: partnerVenues, error: pvError } = await supabase
        .from('partner_venues')
        .select('venue_id')
        .eq('user_id', user.id);
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
      // Fetch booking to get user_id + venue name for the notification
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .select('user_id, venue_id, venues(name)')
        .eq('id', bookingId)
        .single();
      if (bErr) throw bErr;

      const { data: updated, error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select('id');
      if (error) throw error;
      if (!updated?.length) throw new Error('Booking could not be confirmed. You may not have permission to manage this venue.');

      // Notify the customer
      if (booking?.user_id) {
        const venueName = (booking.venues as { name?: string } | null)?.name ?? 'your venue';
        void notify.bookingConfirmed(booking.user_id, venueName, bookingId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
    },
  });
}

// Partner declines (pending → rejected) or cancels (confirmed → cancelled) a booking
// Pass status: 'rejected' for decline, 'cancelled' for cancel-confirmed
export function useDeclineBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookingId,
      reason,
      status = 'rejected',
    }: {
      bookingId: string;
      reason?: string;
      status?: 'rejected' | 'cancelled';
    }) => {
      // Fetch booking to get user_id + venue name for the notification
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .select('user_id, venue_id, venues(name)')
        .eq('id', bookingId)
        .single();
      if (bErr) throw bErr;

      const update: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (reason?.trim()) {
        update.admin_notes = `Partner reason: ${reason.trim()}`;
      }
      const { data: updated, error } = await supabase
        .from('bookings')
        .update(update)
        .eq('id', bookingId)
        .select('id');
      if (error) throw error;
      if (!updated?.length) throw new Error('Booking could not be updated. You may not have permission to manage this venue.');

      // Notify the customer
      if (booking?.user_id) {
        const venueName = (booking.venues as { name?: string } | null)?.name ?? 'your venue';
        if (status === 'rejected') {
          void notify.bookingRejected(booking.user_id, venueName, bookingId);
        } else {
          void notify.bookingCancelled(booking.user_id, venueName, bookingId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
    },
  });
}

// Check current user's partner application status
export function useMyPartnerRequest() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-partner-request', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('partner_requests')
        .select('id, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as PartnerRequestRecord | null;
    },
    enabled: !!user,
  });
}

// Apply to become a partner — creates a pending request for admin review
export function useApplyPartner() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data: existingRequests, error: fetchError } = await supabase
        .from('partner_requests')
        .select('id, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (fetchError) throw fetchError;

      const existingRequest = (existingRequests?.[0] ?? null) as PartnerRequestRecord | null;

      if (existingRequest?.status === 'pending') {
        return existingRequest;
      }

      if (existingRequest?.status === 'rejected') {
        const { data: updatedRequest, error: updateError } = await supabase
          .from('partner_requests')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', existingRequest.id)
          .select('id, status, created_at, updated_at')
          .single();
        if (updateError) throw updateError;
        return updatedRequest as PartnerRequestRecord;
      }

      if (existingRequest?.status === 'approved') {
        return existingRequest;
      }

      const { data: insertedRequest, error: insertError } = await supabase
        .from('partner_requests')
        .insert({ user_id: user.id, status: 'pending' })
        .select('id, status, created_at, updated_at')
        .single();
      if (insertError) throw insertError;
      return insertedRequest as PartnerRequestRecord;
    },
    onSuccess: (request) => {
      if (user && request) {
        queryClient.setQueryData(['my-partner-request', user.id], request);
      }
      queryClient.invalidateQueries({ queryKey: ['my-partner-request'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partner-requests'] });
    },
  });
}

// Admin: all partner applications
export function useAdminPartnerRequests() {
  return useQuery({
    queryKey: ['admin-partner-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_requests')
        .select('id, user_id, status, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as { id: string; user_id: string; status: string; created_at: string }[];
    },
  });
}

// Admin: approve → assign partner role
export function useApprovePartnerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string; userId: string }) => {
      const { error: reqErr } = await supabase
        .from('partner_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (reqErr) throw reqErr;
      const { error: roleErr } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'partner' }, { onConflict: 'user_id' });
      if (roleErr) throw roleErr;
      // Notify the applicant
      void notify.partnerApproved(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-requests'] });
      queryClient.invalidateQueries({ queryKey: ['is-partner'] });
    },
  });
}

// Admin: reject application
export function useRejectPartnerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string; userId: string }) => {
      const { error } = await supabase
        .from('partner_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
      // Notify the applicant
      void notify.partnerRejected(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-requests'] });
      queryClient.invalidateQueries({ queryKey: ['is-partner'] });
    },
  });
}

// Admin: revoke partner role (approved → rejected + remove user_roles entry)
export function useRevokePartnerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string; userId: string }) => {
      const { error: reqErr } = await supabase
        .from('partner_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (reqErr) throw reqErr;
      const { error: roleErr } = await supabase
        .from('user_roles')
        .update({ role: 'user' })
        .eq('user_id', userId);
      if (roleErr) throw roleErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-requests'] });
      queryClient.invalidateQueries({ queryKey: ['is-partner'] });
    },
  });
}

// Kept for backwards compat
export function useBecomePartner() {
  return useApplyPartner();
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
      // Set owner_id and created_by so partner can edit their own venue later
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .insert({ ...venue, is_active: false, owner_id: user.id, created_by: user.id })
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
