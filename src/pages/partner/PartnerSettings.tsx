import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import {
  User, Building2, Clock, Bell, Users, CreditCard, Palette,
  Shield, AlertTriangle, ChevronDown, ChevronRight, Check,
  Upload, Plus, Trash2, Eye, EyeOff, Save, Mail, Phone,
  Globe, Instagram, Facebook, Lock, LogOut, Camera,
} from 'lucide-react';
import { PartnerLayout } from '@/components/layout/PartnerLayout';
import { useAuth } from '@/hooks/useAuth';
import { useIsPartner } from '@/hooks/usePartner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionAccordion {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// ─── Mock initial state — TODO: replace with Supabase query on mount ──────────

const MOCK_PROFILE = {
  businessName: 'Revo Restaurant & Bar',
  displayName: 'Revo UB',
  supportEmail: 'hello@revo.mn',
  phone: '+976 9911 2233',
  description: 'Premium dining and cocktail bar in the heart of Ulaanbaatar.',
  website: 'https://revo.mn',
  address: '14200, Seoul St 4, Ulaanbaatar',
  instagram: '@revo_ub',
  facebook: 'revo.ub',
};

const MOCK_OPS = {
  slotDuration: 60,
  openingTime: '10:00',
  closingTime: '23:00',
  bufferTime: 15,
  maxPartySize: 20,
  minAdvanceHours: 2,
  autoConfirm: false,
  manualApproval: true,
  cancellationPolicy: 'Cancellations accepted up to 24 hours before the booking. No-shows will be charged 50% of the booking value.',
  gracePeriodMinutes: 15,
};

const MOCK_NOTIFS = {
  emailNotifications: true,
  inAppNotifications: true,
  newBookingAlerts: true,
  confirmationAlerts: true,
  cancellationAlerts: true,
  lowOccupancyAlerts: false,
  highDemandAlerts: true,
  dailySummaryEmail: false,
};

const MOCK_TEAM: Array<{ id: string; name: string; email: string; role: string; permissions: string[] }> = [
  {
    id: '1',
    name: 'You (Owner)',
    email: '',
    role: 'owner',
    permissions: ['manage_bookings','manage_venues','manage_promos','view_analytics','edit_menu','manage_team','edit_settings'],
  },
];

const ALL_PERMISSIONS = [
  { key: 'manage_bookings', label: 'Manage Bookings' },
  { key: 'manage_venues', label: 'Manage Venues' },
  { key: 'manage_promos', label: 'Manage Promos' },
  { key: 'view_analytics', label: 'View Analytics' },
  { key: 'edit_menu', label: 'Edit Menu / POS' },
  { key: 'manage_team', label: 'Manage Team' },
  { key: 'edit_settings', label: 'Edit Settings' },
];

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-primary/15 text-primary border-primary/20',
  manager: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  staff: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  host: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[200px_1fr] gap-3 items-start py-4 border-b border-[hsl(240_10%_11%)] last:border-0">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-[hsl(240_10%_11%)] last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
      <div className="px-6 py-5 border-b border-[hsl(240_10%_13%)]">
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-2">{children}</div>
    </div>
  );
}

function DangerCard({ title, description, buttonLabel, onConfirm }: {
  title: string; description: string; buttonLabel: string; onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-[hsl(240_10%_11%)] last:border-0">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setConfirming(false)} className="border-border text-xs">Cancel</Button>
          <Button size="sm" onClick={() => { onConfirm(); setConfirming(false); }} className="bg-red-600 hover:bg-red-700 text-white text-xs">{buttonLabel}</Button>
        </div>
      ) : (
        <Button
          size="sm" variant="outline"
          onClick={() => setConfirming(true)}
          className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 shrink-0 text-xs"
        >
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PartnerSettings() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: isPartner, isLoading: partnerLoading } = useIsPartner();

  // ── Local state (TODO: load from Supabase on mount) ────────────────────────
  const [profile, setProfile] = useState(MOCK_PROFILE);
  const [ops, setOps] = useState(MOCK_OPS);
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [bookingPrefs, setBookingPrefs] = useState({
    largeGroups: true,
    specialRequests: true,
    depositRequired: false,
    staffNotes: true,
    walkInSync: false,
    privateEventInquiry: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (authLoading || partnerLoading) {
    return (
      <PartnerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PartnerLayout>
    );
  }
  if (!user) return <Navigate to="/auth?redirect=/partner/settings" replace />;
  if (!isPartner) return <Navigate to="/partner" replace />;

  const team = [{ ...MOCK_TEAM[0], email: user.email ?? '' }];

  function markDirty() { setIsDirty(true); }

  async function handleSave() {
    setSaving(true);
    // TODO: POST profile + ops + notifs + bookingPrefs to Supabase
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setIsDirty(false);
    toast.success('Settings saved');
  }

  function handleDangerAction(action: string) {
    toast.info(`${action} — coming soon`);
  }

  return (
    <PartnerLayout>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full bg-primary/3 blur-[120px]" />
      </div>

      <div className="relative container py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between gap-4 pb-4 border-b border-[hsl(240_10%_12%)] mb-8"
        >
          <div>
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-[0.12em] font-medium mb-1">Partner</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your business profile, preferences, and account.</p>
          </div>
          <AnimatePresence>
            {isDirty && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gradient-primary gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="space-y-6">

          {/* ── Section 1: Business Profile ───────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
            <SectionCard title="Business Profile" subtitle="Public-facing information about your business">
              {/* Logo upload */}
              <div className="py-5 border-b border-[hsl(240_10%_11%)] flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-[hsl(240_10%_12%)] border border-[hsl(240_10%_18%)] flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-[hsl(240_10%_8%)] hover:scale-110 transition-transform"
                  >
                    <Camera className="h-3 w-3 text-white" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
                </div>
                <div>
                  <p className="text-sm font-medium">Business Logo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG or JPG, min 200×200px. Shown on your public listing.</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-primary hover:text-primary/80 mt-1.5 transition-colors"
                  >
                    Upload logo
                  </button>
                </div>
              </div>
              <FieldRow label="Business Name" hint="Legal or registered business name">
                <Input value={profile.businessName} onChange={e => { setProfile(p => ({ ...p, businessName: e.target.value })); markDirty(); }} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)]" />
              </FieldRow>
              <FieldRow label="Display Name" hint="Shown to customers on TAPN">
                <Input value={profile.displayName} onChange={e => { setProfile(p => ({ ...p, displayName: e.target.value })); markDirty(); }} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)]" />
              </FieldRow>
              <FieldRow label="Support Email">
                <Input type="email" value={profile.supportEmail} onChange={e => { setProfile(p => ({ ...p, supportEmail: e.target.value })); markDirty(); }} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)]" />
              </FieldRow>
              <FieldRow label="Phone Number">
                <Input value={profile.phone} onChange={e => { setProfile(p => ({ ...p, phone: e.target.value })); markDirty(); }} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)]" />
              </FieldRow>
              <FieldRow label="Description" hint="Shown on your public listing">
                <Textarea value={profile.description} onChange={e => { setProfile(p => ({ ...p, description: e.target.value })); markDirty(); }} rows={3} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] resize-none" />
              </FieldRow>
              <FieldRow label="Website">
                <Input value={profile.website} onChange={e => { setProfile(p => ({ ...p, website: e.target.value })); markDirty(); }} placeholder="https://" className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)]" />
              </FieldRow>
              <FieldRow label="Address">
                <Input value={profile.address} onChange={e => { setProfile(p => ({ ...p, address: e.target.value })); markDirty(); }} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)]" />
              </FieldRow>
              <FieldRow label="Social Links">
                <div className="space-y-2">
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={profile.instagram} onChange={e => { setProfile(p => ({ ...p, instagram: e.target.value })); markDirty(); }} placeholder="@handle" className="pl-9 bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)]" />
                  </div>
                  <div className="relative">
                    <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={profile.facebook} onChange={e => { setProfile(p => ({ ...p, facebook: e.target.value })); markDirty(); }} placeholder="Page name" className="pl-9 bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)]" />
                  </div>
                </div>
              </FieldRow>
            </SectionCard>
          </motion.div>

          {/* ── Section 2: Venue Operations ───────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <SectionCard title="Venue Operations Defaults" subtitle="Applied to new venues and bookings unless overridden">
              <FieldRow label="Opening Time">
                <Input type="time" value={ops.openingTime} onChange={e => { setOps(o => ({ ...o, openingTime: e.target.value })); markDirty(); }} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] w-36" />
              </FieldRow>
              <FieldRow label="Closing Time">
                <Input type="time" value={ops.closingTime} onChange={e => { setOps(o => ({ ...o, closingTime: e.target.value })); markDirty(); }} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] w-36" />
              </FieldRow>
              <FieldRow label="Default Slot Duration" hint="Minutes per booking slot">
                <div className="flex items-center gap-2">
                  <Input type="number" min={15} max={480} step={15} value={ops.slotDuration} onChange={e => { setOps(o => ({ ...o, slotDuration: parseInt(e.target.value) || 60 })); markDirty(); }} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] w-24" />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </FieldRow>
              <FieldRow label="Buffer Between Bookings" hint="Prep / turnaround time">
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={120} step={5} value={ops.bufferTime} onChange={e => { setOps(o => ({ ...o, bufferTime: parseInt(e.target.value) || 0 })); markDirty(); }} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] w-24" />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </FieldRow>
              <FieldRow label="Max Party Size">
                <Input type="number" min={1} max={500} value={ops.maxPartySize} onChange={e => { setOps(o => ({ ...o, maxPartySize: parseInt(e.target.value) || 1 })); markDirty(); }} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] w-24" />
              </FieldRow>
              <FieldRow label="Min Advance Booking" hint="Minimum hours before booking time">
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={168} value={ops.minAdvanceHours} onChange={e => { setOps(o => ({ ...o, minAdvanceHours: parseInt(e.target.value) || 0 })); markDirty(); }} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] w-24" />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </FieldRow>
              <FieldRow label="Late Arrival Grace Period">
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={60} step={5} value={ops.gracePeriodMinutes} onChange={e => { setOps(o => ({ ...o, gracePeriodMinutes: parseInt(e.target.value) || 0 })); markDirty(); }} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] w-24" />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </FieldRow>
              <FieldRow label="Cancellation Policy">
                <Textarea value={ops.cancellationPolicy} onChange={e => { setOps(o => ({ ...o, cancellationPolicy: e.target.value })); markDirty(); }} rows={3} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] resize-none text-sm" />
              </FieldRow>
              <div className="pt-2">
                <SwitchRow
                  label="Auto-confirm bookings"
                  hint="Automatically confirm all incoming requests without manual review"
                  checked={ops.autoConfirm}
                  onChange={v => { setOps(o => ({ ...o, autoConfirm: v, manualApproval: !v })); markDirty(); }}
                />
                <SwitchRow
                  label="Manual approval required"
                  hint="Every booking request must be reviewed and approved by you"
                  checked={ops.manualApproval}
                  onChange={v => { setOps(o => ({ ...o, manualApproval: v, autoConfirm: !v })); markDirty(); }}
                />
              </div>
            </SectionCard>
          </motion.div>

          {/* ── Section 3: Booking Preferences ───────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
            <SectionCard title="Booking Preferences" subtitle="Control what guests can do when booking your venues">
              <SwitchRow label="Accept large group requests" hint="Groups above your default max party size" checked={bookingPrefs.largeGroups} onChange={v => { setBookingPrefs(p => ({ ...p, largeGroups: v })); markDirty(); }} />
              <SwitchRow label="Special requests enabled" hint="Allow guests to add notes or special requests" checked={bookingPrefs.specialRequests} onChange={v => { setBookingPrefs(p => ({ ...p, specialRequests: v })); markDirty(); }} />
              <SwitchRow label="Require deposit" hint="Guests must pay a deposit to secure a booking" checked={bookingPrefs.depositRequired} onChange={v => { setBookingPrefs(p => ({ ...p, depositRequired: v })); markDirty(); }} />
              <SwitchRow label="Booking notes visible to staff" hint="Show guest notes and special requests in staff view" checked={bookingPrefs.staffNotes} onChange={v => { setBookingPrefs(p => ({ ...p, staffNotes: v })); markDirty(); }} />
              <SwitchRow label="Private event inquiries" hint="Allow guests to request exclusive / private event hire" checked={bookingPrefs.privateEventInquiry} onChange={v => { setBookingPrefs(p => ({ ...p, privateEventInquiry: v })); markDirty(); }} />
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Walk-in sync</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Sync walk-in reservations from POS — coming soon</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Soon</Badge>
                </div>
              </div>
            </SectionCard>
          </motion.div>

          {/* ── Section 4: Notifications ──────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <SectionCard title="Notifications" subtitle="Choose how and when you're alerted about activity">
              <SwitchRow label="Email notifications" checked={notifs.emailNotifications} onChange={v => { setNotifs(n => ({ ...n, emailNotifications: v })); markDirty(); }} />
              <SwitchRow label="In-app notifications" checked={notifs.inAppNotifications} onChange={v => { setNotifs(n => ({ ...n, inAppNotifications: v })); markDirty(); }} />
              <SwitchRow label="New booking request alerts" hint="Instant alert when a customer places a request" checked={notifs.newBookingAlerts} onChange={v => { setNotifs(n => ({ ...n, newBookingAlerts: v })); markDirty(); }} />
              <SwitchRow label="Booking confirmed alerts" checked={notifs.confirmationAlerts} onChange={v => { setNotifs(n => ({ ...n, confirmationAlerts: v })); markDirty(); }} />
              <SwitchRow label="Cancellation alerts" checked={notifs.cancellationAlerts} onChange={v => { setNotifs(n => ({ ...n, cancellationAlerts: v })); markDirty(); }} />
              <SwitchRow label="Low occupancy alerts" hint="Alert when venue fill rate drops below threshold" checked={notifs.lowOccupancyAlerts} onChange={v => { setNotifs(n => ({ ...n, lowOccupancyAlerts: v })); markDirty(); }} />
              <SwitchRow label="High demand alerts" hint="Alert when a slot is close to capacity" checked={notifs.highDemandAlerts} onChange={v => { setNotifs(n => ({ ...n, highDemandAlerts: v })); markDirty(); }} />
              <SwitchRow label="Daily summary email" hint="Receive a summary of bookings and revenue each morning" checked={notifs.dailySummaryEmail} onChange={v => { setNotifs(n => ({ ...n, dailySummaryEmail: v })); markDirty(); }} />
            </SectionCard>
          </motion.div>

          {/* ── Section 5: Team / Staff Access ───────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
            <SectionCard title="Team & Staff Access" subtitle="Manage who can access and manage your partner dashboard">
              <div className="py-4 space-y-3">
                {team.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-[hsl(240_10%_11%)] border border-[hsl(240_10%_15%)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <Badge className={cn('text-[11px] border capitalize', ROLE_BADGE[member.role] ?? ROLE_BADGE.staff)}>
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="pb-4">
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Permission levels</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {ALL_PERMISSIONS.map(p => (
                      <div key={p.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-primary/60" />
                        {p.label}
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[hsl(240_10%_20%)] gap-2 text-xs"
                  onClick={() => toast.info('Team invitations — coming soon')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Invite Team Member
                </Button>
              </div>
            </SectionCard>
          </motion.div>

          {/* ── Section 6: Payments / Payouts ────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <SectionCard title="Payments & Payouts" subtitle="Manage how you receive revenue from bookings">
              <div className="py-4 space-y-3">
                <div className="p-4 rounded-xl border border-[hsl(240_10%_18%)] bg-[hsl(240_10%_11%)]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">Payout Method</p>
                    <Badge variant="outline" className="text-[10px]">Not configured</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Bank transfer or QPay — set up your payout details to receive revenue.</p>
                  <Button size="sm" variant="outline" className="mt-3 border-[hsl(240_10%_22%)] text-xs gap-1.5" onClick={() => toast.info('Payout setup — coming soon')}>
                    <CreditCard className="h-3.5 w-3.5" />
                    Set Up Payout
                  </Button>
                </div>
                <div className="p-4 rounded-xl border border-[hsl(240_10%_18%)] bg-[hsl(240_10%_11%)]">
                  <p className="text-sm font-semibold mb-1">Tax & Invoicing</p>
                  <p className="text-xs text-muted-foreground">VAT registration number, invoice generation, and tax reporting — coming soon.</p>
                </div>
                <div className="p-4 rounded-xl border border-[hsl(240_10%_18%)] bg-[hsl(240_10%_11%)]">
                  <p className="text-sm font-semibold mb-1">Payment Support</p>
                  <p className="text-xs text-muted-foreground">For payout issues or refund disputes, contact <span className="text-primary">payments@tapn.mn</span></p>
                </div>
              </div>
            </SectionCard>
          </motion.div>

          {/* ── Section 7: Branding / Public Listing ─────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }}>
            <SectionCard title="Branding & Public Listing" subtitle="How your business appears on TAPN to customers">
              <FieldRow label="Venue Headline" hint="Short punchy tagline for your listing card">
                <Input placeholder="e.g. Premium cocktails & private dining" className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)]" onChange={markDirty} />
              </FieldRow>
              <FieldRow label="Vibe Tags" hint="Music style, atmosphere tags">
                <div className="flex flex-wrap gap-2">
                  {['Live DJ', 'Cocktail Bar', 'Private Rooms', 'Premium Dining', 'Late Night'].map(tag => (
                    <button key={tag} className="text-xs px-3 py-1.5 rounded-full border border-[hsl(240_10%_20%)] bg-[hsl(240_10%_12%)] hover:border-primary/40 hover:text-primary transition-colors">
                      {tag}
                    </button>
                  ))}
                  <button className="text-xs px-3 py-1.5 rounded-full border border-dashed border-[hsl(240_10%_22%)] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors gap-1 flex items-center">
                    <Plus className="h-3 w-3" /> Add tag
                  </button>
                </div>
              </FieldRow>
              <FieldRow label="Public Booking Rules">
                <Textarea placeholder="e.g. Minimum spend applies for private rooms. Smart casual dress code." rows={3} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] resize-none text-sm" onChange={markDirty} />
              </FieldRow>
            </SectionCard>
          </motion.div>

          {/* ── Section 8: Security ───────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
            <SectionCard title="Security" subtitle="Protect your partner account">
              <div className="py-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Change Password</Label>
                  <div className="flex gap-2 max-w-sm">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="New password"
                        className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] pr-10"
                      />
                      <button
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[hsl(240_10%_20%)] shrink-0"
                      onClick={() => { toast.success('Password updated'); setNewPassword(''); }}
                      disabled={!newPassword}
                    >
                      Update
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" size="sm" className="border-[hsl(240_10%_20%)] gap-2 text-xs" onClick={() => toast.info('2FA — coming soon')}>
                    <Shield className="h-3.5 w-3.5" />
                    Enable Two-Factor Auth
                  </Button>
                  <Button variant="outline" size="sm" className="border-[hsl(240_10%_20%)] gap-2 text-xs" onClick={() => toast.info('Session management — coming soon')}>
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out All Sessions
                  </Button>
                </div>
                <div className="p-3 rounded-xl bg-[hsl(240_10%_11%)] border border-[hsl(240_10%_15%)]">
                  <p className="text-xs font-medium mb-1">Signed in as</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </SectionCard>
          </motion.div>

          {/* ── Section 9: Danger Zone ────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45 }}>
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] overflow-hidden">
              <div className="px-6 py-5 border-b border-red-500/15">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <h2 className="font-semibold text-red-300">Danger Zone</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">These actions are irreversible. Proceed with caution.</p>
              </div>
              <div className="px-6 py-2">
                <DangerCard
                  title="Hide venue from TAPN"
                  description="Your venues will not appear in customer search results."
                  buttonLabel="Hide Venue"
                  onConfirm={() => handleDangerAction('Hide venue')}
                />
                <DangerCard
                  title="Deactivate venue"
                  description="Pause all bookings. Existing confirmed bookings are not affected."
                  buttonLabel="Deactivate"
                  onConfirm={() => handleDangerAction('Deactivate venue')}
                />
                <DangerCard
                  title="Archive venue"
                  description="Move venue to archive. Can be restored by contacting support."
                  buttonLabel="Archive"
                  onConfirm={() => handleDangerAction('Archive venue')}
                />
                <DangerCard
                  title="Delete account"
                  description="Permanently delete your partner account and all associated data. This cannot be undone."
                  buttonLabel="Delete Account"
                  onConfirm={() => handleDangerAction('Delete account')}
                />
              </div>
            </div>
          </motion.div>

        </div>

        {/* Floating save bar */}
        <AnimatePresence>
          {isDirty && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3 rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_18%)] shadow-2xl"
            >
              <p className="text-sm text-muted-foreground">You have unsaved changes</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-border text-xs" onClick={() => setIsDirty(false)}>
                  Discard
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gradient-primary text-xs gap-1.5">
                  {saving ? <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PartnerLayout>
  );
}
