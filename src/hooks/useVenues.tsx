import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Venue, PublicVenue, VenueType } from '@/types/venue';

interface VenueFilters {
  search?: string;
  venueType?: VenueType | 'all';
  city?: string;
  minPrice?: number;
  maxPrice?: number;
}

// Use the public_venues view for public access (excludes sensitive contact info)
export function useVenues(filters?: VenueFilters) {
  return useQuery({
    queryKey: ['public-venues', filters],
    queryFn: async () => {
      let query = supabase
        .from('public_venues')
        .select('*')
        .order('rating', { ascending: false });

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
      }

      if (filters?.venueType && filters.venueType !== 'all') {
        query = query.eq('venue_type', filters.venueType);
      }

      if (filters?.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }

      if (filters?.minPrice !== undefined) {
        query = query.gte('price_per_hour', filters.minPrice);
      }

      if (filters?.maxPrice !== undefined) {
        query = query.lte('price_per_hour', filters.maxPrice);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PublicVenue[];
    },
  });
}

// Use the public_venues view for single venue details (public access)
export function useVenue(id: string | undefined) {
  return useQuery({
    queryKey: ['public-venue', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('public_venues')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as PublicVenue | null;
    },
    enabled: !!id,
  });
}

// Use the full venues table for authorized users (partners/admins) to see contact info
export function useFullVenue(id: string | undefined) {
  return useQuery({
    queryKey: ['venue', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Venue | null;
    },
    enabled: !!id,
  });
}

export function useAdminVenues() {
  return useQuery({
    queryKey: ['admin-venues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Venue[];
    },
  });
}

export function useCreateVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (venue: Omit<Venue, 'id' | 'created_at' | 'updated_at' | 'rating' | 'review_count'>) => {
      const { data, error } = await supabase
        .from('venues')
        .insert(venue)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
    },
  });
}

export function useUpdateVenue() {
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
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
      queryClient.invalidateQueries({ queryKey: ['venue', data.id] });
    },
  });
}

export function useDeleteVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
    },
  });
}