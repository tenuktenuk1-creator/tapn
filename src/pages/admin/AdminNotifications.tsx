import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Bell, Send, Users, Building2, Megaphone, Check, Clock } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// TODO: Replace mock data with Supabase notifications table query
const MOCK_HISTORY = [
  { id: '1', title: 'System maintenance scheduled', body: 'TAPN will be undergoing maintenance on Saturday 2am–4am. Booking confirmations may be delayed.', target: 'all', sentAt: '2026-04-01T10:00:00Z', status: 'sent' },
  { id: '2', title: 'New partner features available', body: 'Calendar view and revenue analytics are now live in your partner dashboard.', target: 'partners', sentAt: '2026-03-28T14:30:00Z', status: 'sent' },
  { id: '3', title: 'Weekend booking surge', body: 'High demand expected this weekend. Ensure your venue availability is up to date.', target: 'partners', sentAt: '2026-03-25T09:00:00Z', status: 'sent' },
];

const TARGET_OPTIONS = [
  { value: 'all', label: 'All Users', icon: Users, desc: 'Every registered user on the platform' },
  { value: 'partners', label: 'All Partners', icon: Building2, desc: 'All approved venue partners' },
  { value: 'announcement', label: 'Platform Announcement', icon: Megaphone, desc: 'Pinned banner notification' },
];

export default function AdminNotifications() {
  const { user, isAdmin, loading, role } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all');
  const [sending, setSending] = useState(false);

  const isReady = !loading && (user === null || role !== null);
  if (!isReady) return <AdminLayout><div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></AdminLayout>;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  async function handleSend() {
    if (!title.trim() || !body.trim()) { toast.error('Title and message are required'); return; }
    setSending(true);
    // TODO: call Supabase edge function or insert into notifications table
    await new Promise(r => setTimeout(r, 800));
    setSending(false);
    toast.success('Notification sent');
    setTitle('');
    setBody('');
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-[1400px]">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="pb-4 border-b border-[hsl(240_10%_12%)]">
          <p className="text-[11px] text-muted-foreground/60 uppercase tracking-[0.12em] font-medium mb-1">Admin</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Send platform announcements and manage notification history</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Compose */}
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
                <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement…" rows={4} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] resize-none" />
                <p className="text-[10px] text-muted-foreground mt-1.5">{body.length} / 500 characters</p>
              </div>
              {/* Preview */}
              {(title || body) && (
                <div className="rounded-xl border border-[hsl(240_10%_18%)] bg-[hsl(240_10%_10%)] p-4">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2">Preview</p>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Bell className="h-4 w-4 text-primary" /></div>
                    <div>
                      <p className="text-sm font-medium">{title || 'Notification title'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{body || 'Message body…'}</p>
                    </div>
                  </div>
                </div>
              )}
              <Button className="w-full gradient-primary gap-2" onClick={handleSend} disabled={sending || !title.trim() || !body.trim()}>
                {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'Sending…' : `Send to ${TARGET_OPTIONS.find(o => o.value === target)?.label}`}
              </Button>
            </div>
          </motion.div>

          {/* History */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[hsl(240_10%_13%)]">
              <h2 className="font-semibold text-sm">Notification History</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Previously sent announcements</p>
            </div>
            <div className="divide-y divide-[hsl(240_10%_11%)]">
              {MOCK_HISTORY.map(n => (
                <div key={n.id} className="p-4 hover:bg-[hsl(240_10%_9%)] transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize">{n.target}</Badge>
                      <Badge className="text-[10px] bg-emerald-400/15 text-emerald-300 border-emerald-400/25">Sent</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(n.sentAt), 'MMM d, yyyy · HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
