import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { PublicVenue } from '@/types/venue';

export interface PlannedStop {
  id: string;
  planned_night_id: string;
  venue_id: string;
  start_time: string;
  end_time: string;
  order_index: number;
  notes: string | null;
  created_at: string;
  venue?: PublicVenue;
}

export interface PlannedNight {
  id: string;
  user_id: string;
  name: string;
  planned_date: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  stops?: PlannedStop[];
}

export function usePlannedNights() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['planned-nights', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('planned_nights')
        .select(`
          *,
          stops:planned_stops(
            *,
            venue:public_venues(*)
          )
        `)
        .eq('user_id', user.id)
        .order('planned_date', { ascending: true });

      if (error) throw error;
      
      // Sort stops by order_index
      return (data as unknown as PlannedNight[]).map(night => ({
        ...night,
        stops: night.stops?.sort((a, b) => a.order_index - b.order_index)
      }));
    },
    enabled: !!user,
  });
}

export function usePlannedNight(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['planned-night', id],
    queryFn: async () => {
      if (!id || !user) return null;

      const { data, error } = await supabase
        .from('planned_nights')
        .select(`
          *,
          stops:planned_stops(
            *,
            venue:public_venues(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      const night = data as unknown as PlannedNight;
      return {
        ...night,
        stops: night.stops?.sort((a, b) => a.order_index - b.order_index)
      };
    },
    enabled: !!id && !!user,
  });
}

export function useCreatePlannedNight() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { 
      name: string; 
      planned_date: string; 
      notes?: string;
      stops: { venue_id: string; start_time: string; end_time: string; order_index: number }[] 
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Create the planned night
      const { data: night, error: nightError } = await supabase
        .from('planned_nights')
        .insert({
          user_id: user.id,
          name: data.name,
          planned_date: data.planned_date,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (nightError) throw nightError;

      if (data.stops.length > 0) {
        const { error: stopsError } = await supabase
          .from("planned_stops")
          .insert(
            data.stops.map((stop) => ({
              planned_night_id: night.id,
              venue_id: stop.venue_id,
              start_time: stop.start_time,
              end_time: stop.end_time,
              order_index: stop.order_index,
            }))
          );
      
        if (stopsError) {
          // rollback the night so you don't leave orphan rows
          await supabase.from("planned_nights").delete().eq("id", night.id);
          throw stopsError;
        }
      }
      

      return night;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-nights'] });
    },
  });
}

export function useUpdatePlannedNight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<{ name: string; planned_date: string; status: string; notes: string }> 
    }) => {
      const { data, error } = await supabase
        .from('planned_nights')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-nights'] });
    },
  });
}

export function useDeletePlannedNight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planned_nights')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-nights'] });
    },
  });
}

export function useAddPlannedStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      planned_night_id: string;
      venue_id: string;
      start_time: string;
      end_time: string;
      order_index: number;
    }) => {
      const { data: stop, error } = await supabase
        .from('planned_stops')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return stop;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-nights'] });
      queryClient.invalidateQueries({ queryKey: ['planned-night'] });
    },
  });
}

export function useRemovePlannedStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planned_stops')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-nights'] });
      queryClient.invalidateQueries({ queryKey: ['planned-night'] });
    },
  });
}
