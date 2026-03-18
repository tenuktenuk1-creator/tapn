import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Notification {
  id:          string;
  user_id:     string;
  type:        string;
  title:       string;
  message:     string;
  is_read:     boolean;
  link:        string | null;
  entity_type: string | null;
  entity_id:   string | null;
  created_at:  string;
}

const QUERY_KEY = 'notifications';

// ─── Fetch list (most recent 40) ──────────────────────────────────────────────
export function useNotifications() {
  const { user } = useAuth();
  return useQuery<Notification[]>({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

// ─── Unread count ─────────────────────────────────────────────────────────────
export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery<number>({
    queryKey: [QUERY_KEY, 'unread-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000, // background poll every minute
  });
}

// ─── Mark one as read ─────────────────────────────────────────────────────────
export function useMarkAsRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    // Optimistic update
    onMutate: async (notificationId) => {
      await qc.cancelQueries({ queryKey: [QUERY_KEY, user?.id] });
      const prev = qc.getQueryData<Notification[]>([QUERY_KEY, user?.id]);
      qc.setQueryData<Notification[]>([QUERY_KEY, user?.id], old =>
        old?.map(n => n.id === notificationId ? { ...n, is_read: true } : n) ?? []
      );
      qc.setQueryData<number>([QUERY_KEY, 'unread-count', user?.id], old =>
        Math.max(0, (old ?? 1) - 1)
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData([QUERY_KEY, user?.id], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] });
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'unread-count', user?.id] });
    },
  });
}

// ─── Mark all as read ─────────────────────────────────────────────────────────
export function useMarkAllAsRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: [QUERY_KEY, user?.id] });
      const prev = qc.getQueryData<Notification[]>([QUERY_KEY, user?.id]);
      qc.setQueryData<Notification[]>([QUERY_KEY, user?.id], old =>
        old?.map(n => ({ ...n, is_read: true })) ?? []
      );
      qc.setQueryData<number>([QUERY_KEY, 'unread-count', user?.id], 0);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData([QUERY_KEY, user?.id], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] });
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'unread-count', user?.id] });
    },
  });
}
