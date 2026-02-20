import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Check if current user has favorited a venue
export function useIsFavorited(venueId: string | undefined) {
  return useQuery({
    queryKey: ['is-favorited', venueId],
    enabled: !!venueId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('venue_favorites')
        .select('id')
        .eq('venue_id', venueId!)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
  });
}

// Get all favorited venues for current user
export function useMyFavorites() {
  return useQuery({
    queryKey: ['my-favorites'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('venue_favorites')
        .select('venue_id, venues(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// Toggle favorite (add/remove)
export function useToggleFavorite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ venueId, isFavorited }: { venueId: string; isFavorited: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to favorite venues');

      if (isFavorited) {
        // Remove favorite
        const { error } = await supabase
          .from('venue_favorites')
          .delete()
          .eq('venue_id', venueId)
          .eq('user_id', user.id);
        if (error) throw error;
        return { venueId, isFavorited: false };
      } else {
        // Add favorite
        const { error } = await supabase
          .from('venue_favorites')
          .insert({ venue_id: venueId, user_id: user.id });
        if (error) throw error;
        return { venueId, isFavorited: true };
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['is-favorited', vars.venueId] });
      qc.invalidateQueries({ queryKey: ['my-favorites'] });
    },
  });
}
