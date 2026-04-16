import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Save, Percent, Clock, Globe, Shield, Users, ToggleLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// TODO: Load/save these from a Supabase platform_settings table
const DEFAULTS = {
  platformCommission: 10,
  defaultSlotMinutes: 60,
  minAdvanceHours: 1,
  maxPartySize: 50,
  autoApprovePartners: false,
  maintenanceMode: false,
  publicListingsEnabled: true,
  reviewsEnabled: true,
  bookingTerms: 'All bookings are subject to venue availability and partner confirmation. Cancellations must be made 24 hours in advance.',
  supportEmail: 'support@tapn.mn',
  platformName: 'TAPN',
};

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[220px_1fr] gap-3 items-start py-4 border-b border-[hsl(240_10%_11%)] last:border-0">
      <div><Label className="text-sm font-medium">{label}</Label>{hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}</div>
      <div>{children}</div>
    </div>
  );
}

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[hsl(240_10%_11%)] last:border-0">
      <div><p className="text-sm font-medium">{label}</p>{hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}</div>
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

export default function AdminSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof DEFAULTS>(key: K, value: typeof DEFAULTS[K]) {
    setSettings(s => ({ ...s, [key]: value }));
    setIsDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    // TODO: upsert to platform_settings in Supabase
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    setIsDirty(false);
    toast.success('Platform settings saved');
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between pb-4 border-b border-[hsl(240_10%_12%)]">
          <div>
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-[0.12em] font-medium mb-1">Admin</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Platform-level configuration and global defaults</p>
          </div>
          <AnimatePresence>
            {isDirty && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
                <Button onClick={handleSave} disabled={saving} className="gradient-primary gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Platform basics */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <SectionCard title="Platform Configuration" subtitle="Core settings that affect all users and partners">
            <FieldRow label="Platform Name">
              <Input value={settings.platformName} onChange={e => update('platformName', e.target.value)} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)]" />
            </FieldRow>
            <FieldRow label="Support Email">
              <Input type="email" value={settings.supportEmail} onChange={e => update('supportEmail', e.target.value)} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)]" />
            </FieldRow>
            <FieldRow label="Commission Rate" hint="Platform fee charged on confirmed bookings">
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={50} value={settings.platformCommission} onChange={e => update('platformCommission', parseInt(e.target.value) || 0)} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] w-24" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </FieldRow>
          </SectionCard>
        </motion.div>

        {/* Booking rules */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <SectionCard title="Global Booking Rules" subtitle="Default constraints applied platform-wide">
            <FieldRow label="Default Slot Duration" hint="Minutes">
              <div className="flex items-center gap-2">
                <Input type="number" min={15} max={480} step={15} value={settings.defaultSlotMinutes} onChange={e => update('defaultSlotMinutes', parseInt(e.target.value) || 60)} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] w-24" />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </FieldRow>
            <FieldRow label="Min Advance Booking" hint="Hours before booking time">
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={168} value={settings.minAdvanceHours} onChange={e => update('minAdvanceHours', parseInt(e.target.value) || 1)} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] w-24" />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
            </FieldRow>
            <FieldRow label="Max Party Size" hint="Global upper limit for group bookings">
              <Input type="number" min={1} max={500} value={settings.maxPartySize} onChange={e => update('maxPartySize', parseInt(e.target.value) || 50)} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] w-24" />
            </FieldRow>
            <FieldRow label="Booking Terms & Conditions">
              <Textarea value={settings.bookingTerms} onChange={e => update('bookingTerms', e.target.value)} rows={4} className="bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] resize-none text-sm" />
            </FieldRow>
          </SectionCard>
        </motion.div>

        {/* Feature toggles */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <SectionCard title="Feature Toggles" subtitle="Enable or disable platform-wide features">
            <SwitchRow label="Public venue listings" hint="Show venues to non-authenticated users" checked={settings.publicListingsEnabled} onChange={v => update('publicListingsEnabled', v)} />
            <SwitchRow label="Auto-approve partners" hint="Skip admin review for new partner applications" checked={settings.autoApprovePartners} onChange={v => update('autoApprovePartners', v)} />
            <SwitchRow label="Reviews & ratings" hint="Allow guests to leave reviews on venues" checked={settings.reviewsEnabled} onChange={v => update('reviewsEnabled', v)} />
          </SectionCard>
        </motion.div>

        {/* Danger */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] overflow-hidden">
            <div className="px-6 py-5 border-b border-red-500/15 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <h2 className="font-semibold text-red-300">Danger Zone</h2>
            </div>
            <div className="px-6 py-2">
              <div className="flex items-center justify-between py-4 border-b border-red-500/10 last:border-0">
                <div>
                  <p className="text-sm font-medium">Maintenance Mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Disable all bookings and show maintenance banner to users</p>
                </div>
                <Switch checked={settings.maintenanceMode} onCheckedChange={v => { update('maintenanceMode', v); if (v) toast.warning('Maintenance mode enabled — bookings disabled'); }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating save bar */}
        <AnimatePresence>
          {isDirty && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.25 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3 rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_18%)] shadow-2xl">
              <p className="text-sm text-muted-foreground">Unsaved changes</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-border text-xs" onClick={() => { setSettings(DEFAULTS); setIsDirty(false); }}>Discard</Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gradient-primary text-xs gap-1.5">
                  {saving ? <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}
