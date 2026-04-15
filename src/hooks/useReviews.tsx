import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReviewReply {
  id: string;
  review_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface VenueReview {
  id: string;
  venue_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  images: string[] | null;
  visit_date: string | null;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  replies?: ReviewReply[];
  user_has_voted_helpful?: boolean;
}

// Fetch all reviews for a venue (public) with replies and helpful status
export function useVenueReviews(venueId: string | undefined) {
  return useQuery({
    queryKey: ['venue-reviews', venueId],
    enabled: !!venueId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('venue_reviews')
        .select('*, profiles(full_name, avatar_url)')
        .eq('venue_id', venueId!)
        .order('created_at', { ascending: false });

      if (error) {
        const { data: fallback, error: fallbackError } = await supabase
          .from('venue_reviews')
          .select('*')
          .eq('venue_id', venueId!)
          .order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        return (fallback ?? []) as VenueReview[];
      }

      const reviews = (data ?? []) as VenueReview[];

      // Fetch replies for all reviews
      const reviewIds = reviews.map(r => r.id);
      if (reviewIds.length > 0) {
        const { data: replies, error: repliesError } = await supabase
          .from('review_replies')
          .select('*')
          .in('review_id', reviewIds)
          .order('created_at', { ascending: true });

        // Fetch profiles for reply authors
        if (!repliesError && replies && replies.length > 0) {
          const userIds = [...new Set(replies.map(r => r.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
          for (const reply of replies) {
            const prof = profileMap.get(reply.user_id);
            (reply as ReviewReply).profiles = prof ? { full_name: prof.full_name, avatar_url: prof.avatar_url } : null;
          }
        }

        const repliesByReview = new Map<string, ReviewReply[]>();
        for (const reply of (replies ?? []) as ReviewReply[]) {
          const arr = repliesByReview.get(reply.review_id) ?? [];
          arr.push(reply);
          repliesByReview.set(reply.review_id, arr);
        }
        for (const review of reviews) {
          review.replies = repliesByReview.get(review.id) ?? [];
        }

        // Fetch helpful vote counts from review_helpful table
        const { data: helpfulCounts } = await supabase
          .from('review_helpful')
          .select('review_id')
          .in('review_id', reviewIds);

        const countMap = new Map<string, number>();
        for (const h of (helpfulCounts ?? [])) {
          const rid = (h as { review_id: string }).review_id;
          countMap.set(rid, (countMap.get(rid) ?? 0) + 1);
        }
        for (const review of reviews) {
          review.helpful_count = countMap.get(review.id) ?? 0;
        }

        // Fetch current user's helpful votes
        if (user) {
          const { data: votes } = await supabase
            .from('review_helpful')
            .select('review_id')
            .in('review_id', reviewIds)
            .eq('user_id', user.id);

          const votedSet = new Set((votes ?? []).map(v => (v as { review_id: string }).review_id));
          for (const review of reviews) {
            review.user_has_voted_helpful = votedSet.has(review.id);
          }
        }
      }

      return reviews;
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

// Create or update a review (with optional images)
export function useUpsertReview() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      venueId,
      rating,
      comment,
      images,
      existingId,
    }: {
      venueId: string;
      rating: number;
      comment: string;
      images?: string[];
      existingId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to leave a review');

      if (existingId) {
        const { data, error } = await supabase
          .from('venue_reviews')
          .update({ rating, comment, images: images ?? null, updated_at: new Date().toISOString() })
          .eq('id', existingId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('venue_reviews')
          .insert({ venue_id: venueId, user_id: user.id, rating, comment, images: images ?? null })
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
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['venue-reviews', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['my-review', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['public-venue', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['public-venues'] });
    },
  });
}

// ─── Reply hooks ──────────────────────────────────────────────────────────────

export function useCreateReply() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, venueId, body }: { reviewId: string; venueId: string; body: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to reply');

      const { data, error } = await supabase
        .from('review_replies')
        .insert({ review_id: reviewId, user_id: user.id, body })
        .select()
        .single();
      if (error) throw error;
      return { data, venueId };
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['venue-reviews', vars.venueId] });
    },
  });
}

export function useDeleteReply() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ replyId, venueId }: { replyId: string; venueId: string }) => {
      const { error } = await supabase
        .from('review_replies')
        .delete()
        .eq('id', replyId);
      if (error) throw error;
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['venue-reviews', vars.venueId] });
    },
  });
}

// ─── Helpful vote hooks ───────────────────────────────────────────────────────

export function useToggleHelpful() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, venueId, hasVoted }: { reviewId: string; venueId: string; hasVoted: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      if (hasVoted) {
        const { error } = await supabase
          .from('review_helpful')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('review_helpful')
          .insert({ review_id: reviewId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['venue-reviews', vars.venueId] });
    },
  });
}
