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

// ─── Fetch reviews (with replies, helpful counts, user's votes) ───────────────

export function useVenueReviews(venueId: string | undefined) {
  return useQuery({
    queryKey: ['venue-reviews', venueId],
    enabled: !!venueId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Get reviews
      let reviews: VenueReview[] = [];
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
        reviews = (fallback ?? []) as VenueReview[];
      } else {
        reviews = (data ?? []) as VenueReview[];
      }

      // Init defaults
      for (const r of reviews) {
        r.replies = [];
        r.helpful_count = 0;
        r.user_has_voted_helpful = false;
      }

      const reviewIds = reviews.map(r => r.id);
      if (reviewIds.length === 0) return reviews;

      // 2. Fetch replies
      const { data: replies } = await supabase
        .from('review_replies')
        .select('*')
        .in('review_id', reviewIds)
        .order('created_at', { ascending: true });

      // Fetch profiles for reply authors + review authors (one batch)
      const userIds = [
        ...new Set([
          ...reviews.map(r => r.user_id),
          ...((replies ?? []).map(r => (r as ReviewReply).user_id)),
        ]),
      ];
      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        for (const p of (profiles ?? [])) {
          profileMap.set(p.id as string, { full_name: p.full_name, avatar_url: p.avatar_url });
        }
      }

      // Fill missing review profiles (fallback when join failed)
      for (const r of reviews) {
        if (!r.profiles) r.profiles = profileMap.get(r.user_id) ?? null;
      }

      // Group replies + attach profiles
      const repliesByReview = new Map<string, ReviewReply[]>();
      for (const reply of ((replies ?? []) as ReviewReply[])) {
        reply.profiles = profileMap.get(reply.user_id) ?? null;
        const arr = repliesByReview.get(reply.review_id) ?? [];
        arr.push(reply);
        repliesByReview.set(reply.review_id, arr);
      }
      for (const r of reviews) r.replies = repliesByReview.get(r.id) ?? [];

      // 3. Helpful counts
      const { data: helpfulRows } = await supabase
        .from('review_helpful')
        .select('review_id, user_id')
        .in('review_id', reviewIds);

      const countMap = new Map<string, number>();
      const userVotes = new Set<string>();
      for (const h of (helpfulRows ?? []) as Array<{ review_id: string; user_id: string }>) {
        countMap.set(h.review_id, (countMap.get(h.review_id) ?? 0) + 1);
        if (user && h.user_id === user.id) userVotes.add(h.review_id);
      }
      for (const r of reviews) {
        r.helpful_count = countMap.get(r.id) ?? 0;
        r.user_has_voted_helpful = userVotes.has(r.id);
      }

      return reviews;
    },
  });
}

// ─── My review ────────────────────────────────────────────────────────────────

export function useMyReview(venueId: string | undefined) {
  return useQuery({
    queryKey: ['my-review', venueId],
    enabled: !!venueId,
    staleTime: 0,
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

// ─── Create / Update Review ───────────────────────────────────────────────────

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
      }

      const { data, error } = await supabase
        .from('venue_reviews')
        .insert({ venue_id: venueId, user_id: user.id, rating, comment, images: images ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['venue-reviews', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['my-review', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['public-venue', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['public-venues'] });
    },
  });
}

// ─── Delete Review ────────────────────────────────────────────────────────────

export function useDeleteReview() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId }: { reviewId: string; venueId: string }) => {
      const { error } = await supabase.from('venue_reviews').delete().eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['venue-reviews', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['my-review', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['public-venue', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['public-venues'] });
    },
  });
}

// ─── Create Reply (optimistic) ────────────────────────────────────────────────

export function useCreateReply() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, body }: { reviewId: string; venueId: string; body: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to reply');

      const { data, error } = await supabase
        .from('review_replies')
        .insert({ review_id: reviewId, user_id: user.id, body })
        .select()
        .single();
      if (error) {
        console.error('[reply insert]', error);
        throw error;
      }
      return data as ReviewReply;
    },

    // Optimistic: add the reply to the list immediately
    onMutate: async ({ reviewId, venueId, body }) => {
      await qc.cancelQueries({ queryKey: ['venue-reviews', venueId] });

      const prev = qc.getQueryData<VenueReview[]>(['venue-reviews', venueId]);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { prev };

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      const tempReply: ReviewReply = {
        id: `temp-${crypto.randomUUID()}`,
        review_id: reviewId,
        user_id: user.id,
        body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profiles: myProfile ? { full_name: myProfile.full_name, avatar_url: myProfile.avatar_url } : null,
      };

      qc.setQueryData<VenueReview[]>(['venue-reviews', venueId], (old) =>
        (old ?? []).map(r =>
          r.id === reviewId ? { ...r, replies: [...(r.replies ?? []), tempReply] } : r
        )
      );

      return { prev };
    },

    onError: (_err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['venue-reviews', vars.venueId], ctx.prev);
    },

    onSettled: (_res, _err, vars) => {
      qc.invalidateQueries({ queryKey: ['venue-reviews', vars.venueId] });
    },
  });
}

// ─── Delete Reply ─────────────────────────────────────────────────────────────

export function useDeleteReply() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ replyId }: { replyId: string; venueId: string }) => {
      const { error } = await supabase.from('review_replies').delete().eq('id', replyId);
      if (error) throw error;
    },
    onMutate: async ({ replyId, venueId }) => {
      await qc.cancelQueries({ queryKey: ['venue-reviews', venueId] });
      const prev = qc.getQueryData<VenueReview[]>(['venue-reviews', venueId]);
      qc.setQueryData<VenueReview[]>(['venue-reviews', venueId], (old) =>
        (old ?? []).map(r => ({
          ...r,
          replies: (r.replies ?? []).filter(reply => reply.id !== replyId),
        }))
      );
      return { prev };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['venue-reviews', vars.venueId], ctx.prev);
    },
    onSettled: (_res, _err, vars) => {
      qc.invalidateQueries({ queryKey: ['venue-reviews', vars.venueId] });
    },
  });
}

// ─── Toggle Helpful Vote (optimistic) ─────────────────────────────────────────

export function useToggleHelpful() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId }: { reviewId: string; venueId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      const { data: existing, error: checkError } = await supabase
        .from('review_helpful')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('[helpful check]', checkError);
        throw checkError;
      }

      if (existing) {
        const { error: delError } = await supabase
          .from('review_helpful')
          .delete()
          .eq('id', existing.id);
        if (delError) {
          console.error('[helpful delete]', delError);
          throw delError;
        }
        return { voted: false };
      }

      const { error: insError } = await supabase
        .from('review_helpful')
        .insert({ review_id: reviewId, user_id: user.id });
      if (insError) {
        console.error('[helpful insert]', insError);
        throw insError;
      }
      return { voted: true };
    },

    // Optimistic flip
    onMutate: async ({ reviewId, venueId }) => {
      await qc.cancelQueries({ queryKey: ['venue-reviews', venueId] });
      const prev = qc.getQueryData<VenueReview[]>(['venue-reviews', venueId]);

      qc.setQueryData<VenueReview[]>(['venue-reviews', venueId], (old) =>
        (old ?? []).map(r => {
          if (r.id !== reviewId) return r;
          const voted = !r.user_has_voted_helpful;
          return {
            ...r,
            user_has_voted_helpful: voted,
            helpful_count: Math.max(0, (r.helpful_count ?? 0) + (voted ? 1 : -1)),
          };
        })
      );

      return { prev };
    },

    onError: (_err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['venue-reviews', vars.venueId], ctx.prev);
    },

    onSettled: (_res, _err, vars) => {
      qc.invalidateQueries({ queryKey: ['venue-reviews', vars.venueId] });
    },
  });
}
