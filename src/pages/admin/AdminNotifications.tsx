import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Bell, Send, Users, Building2, Megaphone, Check, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Announcement {
  id: string;
  title: string;
  body: string;
  target: string;
  status: string;
  created_at: string;
}

// ─── Target options ──────────────────────────────────────────────────────────

const TARGET_OPTIONS = [
  { value: 'all',          label: 'All Users',              icon: Users,     desc: 'Every registered user on the platform' },
  { value: 'partners',     label: 'All Partners',           icon: Building2, desc: 'All approved venue partners' },
  { value: 'announcement', label: 'Platform Announcement',  icon: Megaphone, desc: 'Pinned banner notification' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminNotifications() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all');
  const [sending, setSending] = useState(false);

  // Load announcement history from DB
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
    enabled: !!user && !!isAdmin,
  });

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message are required');
      return;
    }
    if (body.length > 500) {
      toast.error('Message must be 500 characters or less');
      return;
    }

    setSending(true);
    try {
      // 1. Save announcement to history
      const { error: annError } = await supabase.from('announcements').insert({
        title: title.trim(),
        body: body.trim(),
        target,
        created_by: user.id,
        status: 'sent',
      });
      if (annError) throw annError;

      // 2. Get target user IDs
      let userIds: string[] = [];

      if (target === 'all') {
        // All users from profiles
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id');
        if (error) throw error;
        userIds = (profiles ?? []).map(p => p.id);
      } else if (target === 'partners') {
        // Only partners
        const { data: partners, error } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'partner');
        if (error) throw error;
        userIds = (partners ?? []).map((p: { user_id: string }) => p.user_id);
      }
      // 'announcement' target = just saves to announcements table, no individual notifications

      // 3. Batch insert notifications for each user
      if (userIds.length > 0) {
        const notifications = userIds.map(uid => ({
          user_id: uid,
          type: 'platform_announcement',
          title: title.trim(),
          message: body.trim(),
          link: null,
          entity_type: 'announcement',
          entity_id: null,
        }));

        // Insert in batches of 100 to avoid payload limits
        for (let i = 0; i < notifications.length; i += 100) {
          const batch = notifications.slice(i, i + 100);
          const { error: insertError } = await supabase
            .from('notifications')
            .insert(batch);
          if (insertError) {
            console.warn('[notifications] batch insert failed:', insertError.message);
          }
        }
      }

      toast.success(
        target === 'announcement'
          ? 'Announcement published'
          : `Notification sent to ${userIds.length} ${target === 'partners' ? 'partners' : 'users'}`
      );
      setTitle('');
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    } catch (err: any) {
      console.error('Send notification failed:', err);
      toast.error(err?.message ?? 'Failed to send notification');
    } finally {
      setSending(false);
    }
  }

  const targetLabel = TARGET_OPTIONS.find(o => o.value === target)?.label ?? target;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="pb-4 border-b border-[hsl(240_10%_12%)]">
          <p className="text-[11px] text-muted-foreground/60 uppercase tracking-[0.12em] font-medium mb-1">Admin</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Send platform announcements and manage notification history</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Compose ───────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[hsl(240_10%_13%)]">
              <h2 className="font-semibold text-sm">Compose Notification</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Send to users, partners, or broadcast a platform announcement</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Target selector */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Target Audience</Label>
                <div className="space-y-2">
                  {TARGET_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setTarget(opt.value)}
                      className={cn('w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        target === opt.value ? 'border-primary/40 bg-primary/8' : 'border-[hsl(240_10%_16%)] bg-[hsl(240_10%_10%)] hover:border-[hsl(240_10%_22%)]')}>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', target === opt.value ? 'bg-primary/20' : 'bg-[hsl(240_10%_14%)]')}>
                        <opt.icon className={cn('h-4 w-4', target === opt.value ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                      {target === opt.value && <Check className="h-4 w-4 text-primary ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
              {/* Title */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Platform maintenance scheduled" className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)]" />
              </div>
              {/* Message */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message</Label>
                <Textarea value={body} onChange={e => setBody(e.target.value.slice(0, 500))} placeholder="Write your announcement..." rows={4} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] resize-none" />
                <p className={cn('text-[10px] mt-1.5', body.length >= 480 ? 'text-amber-400' : 'text-muted-foreground')}>{body.length} / 500 characters</p>
              </div>
              {/* Preview */}
              {(title || body) && (
                <div className="rounded-xl border border-[hsl(240_10%_18%)] bg-[hsl(240_10%_10%)] p-4">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2">Preview</p>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Bell className="h-4 w-4 text-primary" /></div>
                    <div>
                      <p className="text-sm font-medium">{title || 'Notification title'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{body || 'Message body...'}</p>
                    </div>
                  </div>
                </div>
              )}
              <Button className="w-full gradient-primary gap-2" onClick={handleSend} disabled={sending || !title.trim() || !body.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'Sending...' : `Send to ${targetLabel}`}
              </Button>
            </div>
          </motion.div>

          {/* ── History ────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[hsl(240_10%_13%)]">
              <h2 className="font-semibold text-sm">Notification History</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Previously sent announcements</p>
            </div>
            <div className="divide-y divide-[hsl(240_10%_11%)]">
              {historyLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-8 w-8 mx-auto mb-3 opacity-15" />
                  <p className="text-sm text-muted-foreground">No announcements sent yet</p>
                </div>
              ) : (
                history.map(n => (
                  <div key={n.id} className="p-4 hover:bg-[hsl(240_10%_9%)] transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px] capitalize">{n.target === 'all' ? 'All' : n.target === 'partners' ? 'Partners' : 'Banner'}</Badge>
                        <Badge className="text-[10px] bg-emerald-400/15 text-emerald-300 border-emerald-400/25">Sent</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(n.created_at), 'MMM d, yyyy · HH:mm')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
  );
}
