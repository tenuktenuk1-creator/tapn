import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Venue, PublicVenue, VenueType } from "@/types/venue";

interface VenueFilters {
  search?: string;
  venueType?: VenueType | "all";
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyActive?: boolean; // optional helper
}

export function useVenues(filters?: VenueFilters) {
  return useQuery({
    queryKey: ["public-venues", filters],
    queryFn: async () => {
      let q = supabase
        .from("venues")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.onlyActive !== false) {
        q = q.eq("is_active", true);
      }

      if (filters?.venueType && filters.venueType !== "all") {
        q = q.eq("venue_type", filters.venueType);
      }

      if (filters?.city) {
        q = q.ilike("city", `%${filters.city}%`);
      }

      if (filters?.minPrice !== undefined) {
        q = q.gte("price_per_hour", filters.minPrice);
      }

      if (filters?.maxPrice !== undefined) {
        q = q.lte("price_per_hour", filters.maxPrice);
      }

      // Search across name, description, city
      if (filters?.search) {
        const s = filters.search.replace(/%/g, "\\%"); // avoid weird % behavior
        q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%,city.ilike.%${s}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []) as Venue[];
    },
  });
}

export function useVenue(id: string | undefined) {
  return useQuery({
    queryKey: ["public-venue", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return (data ?? null) as Venue | null;
    },
  });
}

// If you have a separate admin table/view, change the table name here.
export function useAdminVenues() {
  return useQuery({
    queryKey: ["admin-venues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Venue[];
    },
  });
}

export function useCreateVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      venue: Omit<Venue, "id" | "created_at" | "updated_at" | "rating" | "review_count">
    ) => {
      const payload = {
        ...venue,
        rating: 0,
        review_count: 0,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("venues")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;
      return data as Venue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-venues"] });
      queryClient.invalidateQueries({ queryKey: ["admin-venues"] });
    },
  });
}

export function useUpdateVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...venue }: Partial<Venue> & { id: string }) => {
      const { data, error } = await supabase
        .from("venues")
        .update({ ...venue, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return data as Venue;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["public-venues"] });
      queryClient.invalidateQueries({ queryKey: ["admin-venues"] });
      queryClient.invalidateQueries({ queryKey: ["public-venue", data.id] });
    },
  });
}

export function useDeleteVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("venues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-venues"] });
      queryClient.invalidateQueries({ queryKey: ["admin-venues"] });
    },
  });
}
