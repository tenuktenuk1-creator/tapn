import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Venue } from "@/types/venue";

/**
 * Partner check:
 * - Tries profiles.role first
 * - Falls back to user_roles if profiles doesn't exist in your schema
 */
export function useIsPartner() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-partner", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;

      // Try profiles.role
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!pErr && profile?.role) {
        return profile.role === "partner" || profile.role === "admin";
      }

      // Fallback: user_roles table
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rErr) return false;

      return roles?.some((r) => r.role === "partner" || r.role === "admin") ?? false;
    },
  });
}

/** Partners should only see their own venues */
export function usePartnerVenues() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["partner-venues", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Venue[];
    },
  });
}

export function useCreatePartnerVenue() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (venue: Partial<Venue>) => {
      if (!user) throw new Error("Not authenticated");

      // IMPORTANT: do NOT send created_by/owner_id
      const { data, error } = await supabase
        .from("venues")
        .insert({
          ...venue,
          // let DB defaults fill these:
          // created_by: auth.uid()
          // owner_id: auth.uid()
        })
        .select()
        .single();

      if (error) throw error;
      return data as Venue;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-venues"] });
      qc.invalidateQueries({ queryKey: ["public-venues"] });
    },
  });
}

export function useUpdatePartnerVenue() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Venue> & { id: string }) => {
      if (!user) throw new Error("Not authenticated");

      // RLS should ensure only owner can update
      const { data, error } = await supabase
        .from("venues")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Venue;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["partner-venues"] });
      qc.invalidateQueries({ queryKey: ["public-venues"] });
      qc.invalidateQueries({ queryKey: ["venue", vars.id] });
      qc.invalidateQueries({ queryKey: ["public-venue", vars.id] });
    },
  });
}

/** Optional: partner bookings for partner’s venues */
export function usePartnerBookings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["partner-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      const { data: venues, error: vErr } = await supabase
        .from("venues")
        .select("id")
        .eq("created_by", user.id);

      if (vErr) throw vErr;

      const venueIds = (venues ?? []).map((v) => v.id);
      if (venueIds.length === 0) return [];

      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("*")
        .in("venue_id", venueIds)
        .order("created_at", { ascending: false });

      if (bErr) throw bErr;
      return bookings ?? [];
    },
  });
}
