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

      // ✅ VALIDATION: Check all venue_ids are valid UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      const invalidStops = data.stops.filter(stop => {
        const venueId = stop.venue_id?.trim();
        return !venueId || venueId === '' || !uuidRegex.test(venueId);
      });

      if (invalidStops.length > 0) {
        console.error('Invalid venue IDs found:', invalidStops);
        throw new Error('One or more venues have invalid IDs. Please remove and re-add them.');
      }

      // ✅ VALIDATION: Check all times are valid
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      const invalidTimes = data.stops.filter(stop => {
        return !timeRegex.test(stop.start_time) || !timeRegex.test(stop.end_time);
      });

      if (invalidTimes.length > 0) {
        console.error('Invalid times found:', invalidTimes);
        throw new Error('One or more time slots are invalid.');
      }

      console.log('Creating planned night:', data);

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

      if (nightError) {
        console.error('Failed to create planned night:', nightError);
        throw new Error(`Failed to create plan: ${nightError.message}`);
      }

      console.log('Planned night created:', night.id);

      // Create the stops
      if (data.stops.length > 0) {
        console.log('Creating stops:', data.stops);
        
        // ✅ SANITIZE: Ensure no empty strings or invalid data
        const sanitizedStops = data.stops.map(stop => ({
          planned_night_id: night.id,
          venue_id: stop.venue_id.trim(), // Remove whitespace
          start_time: stop.start_time,
          end_time: stop.end_time,
          order_index: stop.order_index,
          notes: null, // ✅ Add notes field (currently no UI for it)
        }));

        const { error: stopsError } = await supabase
          .from('planned_stops')
          .insert(sanitizedStops);

        if (stopsError) {
          console.error('Failed to create stops:', stopsError);
          
          // Clean up the created night if stops fail
          await supabase
            .from('planned_nights')
            .delete()
            .eq('id', night.id);
          
          throw new Error(`Failed to add venues to plan: ${stopsError.message}`);
        }
        
        console.log('Stops created successfully');
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
