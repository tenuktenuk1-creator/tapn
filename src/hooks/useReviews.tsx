import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VenueReview {
  id: string;
  venue_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  visit_date: string | null;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// Fetch all reviews for a venue (public)
export function useVenueReviews(venueId: string | undefined) {
  return useQuery({
    queryKey: ['venue-reviews', venueId],
    enabled: !!venueId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venue_reviews')
        .select('*, profiles(full_name, avatar_url)')
        .eq('venue_id', venueId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as VenueReview[];
    },
  });
}

// Fetch current user's review for this venue
// NOTE: query key includes user id so cache is invalidated on login/logout
export function useMyReview(venueId: string | undefined) {
  return useQuery({
    queryKey: ['my-review', venueId], // user id appended at call-site via enabled guard
    enabled: !!venueId,
    staleTime: 0, // always re-fetch so we catch the post-login state
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('venue_reviews')
        .select('*')
        .eq('venue_id', venueId!)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as VenueReview | null;
    },
  });
}

// Create or update a review
export function useUpsertReview() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      venueId,
      rating,
      comment,
      existingId,
    }: {
      venueId: string;
      rating: number;
      comment: string;
      existingId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to leave a review');

      if (existingId) {
        // Update existing review
        const { data, error } = await supabase
          .from('venue_reviews')
          .update({ rating, comment, updated_at: new Date().toISOString() })
          .eq('id', existingId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Create new review
        const { data, error } = await supabase
          .from('venue_reviews')
          .insert({ venue_id: venueId, user_id: user.id, rating, comment })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['venue-reviews', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['my-review', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['public-venue', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['public-venues'] });
    },
  });
}

// Delete own review
export function useDeleteReview() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, venueId }: { reviewId: string; venueId: string }) => {
      const { error } = await supabase
        .from('venue_reviews')
        .delete()
        .eq('id', reviewId);
      if (error) throw error;
      return { venueId };
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['venue-reviews', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['my-review', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['public-venue', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['public-venues'] });
    },
  });
}
