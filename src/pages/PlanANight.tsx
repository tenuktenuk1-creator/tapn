import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus,
  Trash2,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  Moon,
  Sparkles,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Save,
  Loader2,
  Users,
  Zap,
} from 'lucide-react';
import { useVenues } from '@/hooks/useVenues';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePlannedNight } from '@/hooks/usePlannedNights';
import { PublicVenue, venueTypeLabels } from '@/types/venue';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/ui/page-transition';

interface PlannedStop {
  id: string;
  venue: PublicVenue;
  startTime: string;
  endTime: string;
}

// KAN-48: Vibe options
const VIBE_OPTIONS = [
  { value: 'chill', label: '😌 Chill & Relaxed' },
  { value: 'social', label: '🎉 Social & Lively' },
  { value: 'romantic', label: '🌹 Romantic' },
  { value: 'competitive', label: '🏆 Competitive / Game Night' },
  { value: 'wild', label: '🔥 Wild Night Out' },
  { value: 'classy', label: '🥂 Classy & Upscale' },
];

// Party size number slide variants (direction-aware)
const numberVariants = {
  enter: (dir: 1 | -1) => ({
    y: dir === 1 ? -18 : 18,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: (dir: 1 | -1) => ({
    y: dir === 1 ? 18 : -18,
    opacity: 0,
    transition: { duration: 0.12, ease: [0.55, 0, 1, 0.45] },
  }),
};

export default function PlanANight() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: venues, isLoading } = useVenues();
  const createPlannedNight = useCreatePlannedNight();

  const [plannedStops, setPlannedStops] = useState<PlannedStop[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('22:00');
  const [plannedDate, setPlannedDate] = useState<Date | undefined>(undefined);

  // KAN-48: New fields
  const [partySize, setPartySize] = useState<number>(1);
  const [partySizeDir, setPartySizeDir] = useState<1 | -1>(1);
  const [preferredVibe, setPreferredVibe] = useState<string>('');
  const [planNotes, setPlanNotes] = useState<string>('');

  // Save validation
  const [saveAttempted, setSaveAttempted] = useState(false);
  const saveValidationError: string | null = saveAttempted
    ? !plannedDate
      ? 'Please select a date.'
      : plannedStops.length === 0
      ? 'Please add at least one stop.'
      : null
    : null;

  // Full 24-hour time slots: 00:00 → 23:00
  const timeSlots = Array.from({ length: 24 }, (_, i) =>
    `${i.toString().padStart(2, '00')}:00`
  );

  // Midnight-crossing support: 23:00 → 01:00 is valid (2h span)
  const startH = parseInt(startTime.split(':')[0]);
  const endH = parseInt(endTime.split(':')[0]);
  const isTimeRangeValid =
    endH > startH || (startH >= 20 && endH <= 5 && endH !== startH);

  const incrementPartySize = () => {
    if (partySize >= 200) return;
    setPartySizeDir(1);
    setPartySize(p => p + 1);
  };

  const decrementPartySize = () => {
    if (partySize <= 1) return;
    setPartySizeDir(-1);
    setPartySize(p => p - 1);
  };

  const addStop = () => {
    if (!selectedVenueId || !venues) return;
    const venue = venues.find(v => v.id === selectedVenueId);
    if (!venue) return;

    const newStop: PlannedStop = {
      id: crypto.randomUUID(),
      venue,
      startTime,
      endTime,
    };

    setPlannedStops([...plannedStops, newStop]);
    setSelectedVenueId('');

    // Auto-advance: next start = current end, next end = +2h (wraps past midnight)
    const curEndH = parseInt(endTime.split(':')[0]);
    const nextEndH = (curEndH + 2) % 24;
    setStartTime(endTime);
    setEndTime(`${nextEndH.toString().padStart(2, '0')}:00`);
  };

  const removeStop = (id: string) => {
    setPlannedStops(plannedStops.filter(stop => stop.id !== id));
  };

  // Duration-aware of midnight wrapping: 23:00→01:00 = 2h (not -22h)
  const calcStopDuration = (start: string, end: string): number => {
    const s = parseInt(start.split(':')[0]);
    const e = parseInt(end.split(':')[0]);
    return e > s ? e - s : 24 - s + e;
  };

  const calculateTotalDuration = () => {
    if (plannedStops.length === 0) return 0;
    return plannedStops.reduce(
      (total, stop) => total + calcStopDuration(stop.startTime, stop.endTime),
      0
    );
  };

  const handleSavePlan = async () => {
    setSaveAttempted(true);

    if (!user) {
      toast.error('Please sign in to save your plan');
      navigate('/auth');
      return;
    }

    if (!plannedDate) return;
    if (plannedStops.length === 0) return;

    // Validate party size
    if (partySize < 1 || partySize > 200) {
      toast.error('Party size must be between 1 and 200');
      return;
    }

    // Auto-generate name based on date
    const name = `Night Out - ${format(plannedDate, 'MMM d')}`;

    // Build notes string with KAN-48 metadata
    const metaLines: string[] = [];
    if (partySize > 1) metaLines.push(`Party size: ${partySize}`);
    if (preferredVibe) {
      const vibeLabel = VIBE_OPTIONS.find(v => v.value === preferredVibe)?.label ?? preferredVibe;
      metaLines.push(`Vibe: ${vibeLabel}`);
    }
    if (planNotes.trim()) metaLines.push(`Notes: ${planNotes.trim()}`);
    const combinedNotes = metaLines.join(' · ');

    try {
      await createPlannedNight.mutateAsync({
        name,
        planned_date: format(plannedDate, 'yyyy-MM-dd'),
        notes: combinedNotes || undefined,
        stops: plannedStops.map((stop, index) => ({
          venue_id: stop.venue.id,
          start_time: stop.startTime,
          end_time: stop.endTime,
          order_index: index,
        })),
      });

      toast.success('Night plan saved successfully!');
      navigate('/profile');
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    }
  };

  const venueTypeColorMap: Record<string, string> = {
    cafe: 'bg-orange-500',
    karaoke: 'bg-pink-500',
    pool_snooker: 'bg-blue-500',
    lounge: 'bg-purple-500',
  };

  return (
    <Layout>
      <PageTransition variant="rise" distance={48}>
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Moon className="h-8 w-8 text-primary" />
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Plan a <span className="text-gradient">Night</span>
            </h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Create your perfect night out. Set your vibe, group size, and build a
            venue timeline — all in one place.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Left Panel ── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-foreground">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal bg-secondary border-border',
                      !plannedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {plannedDate ? format(plannedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={plannedDate}
                    onSelect={setPlannedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* KAN-48 — Party Size (premium stepper) */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                Party Size
              </Label>

              <div className="flex items-center justify-between bg-secondary border border-border rounded-lg px-4 py-3">
                {/* Decrement */}
                <button
                  type="button"
                  onClick={decrementPartySize}
                  disabled={partySize <= 1}
                  className={cn(
                    'w-8 h-8 rounded-md flex items-center justify-center transition-all duration-150',
                    'text-muted-foreground hover:text-foreground hover:bg-white/5 active:scale-95',
                    partySize <= 1 && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground'
                  )}
                  aria-label="Decrease party size"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* Animated number */}
                <div
                  className="relative overflow-hidden flex items-center justify-center"
                  style={{ width: '4rem', height: '3rem' }}
                >
                  <AnimatePresence mode="popLayout" custom={partySizeDir}>
                    <motion.span
                      key={partySize}
                      custom={partySizeDir}
                      variants={numberVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="absolute font-display font-bold text-3xl text-foreground tabular-nums"
                    >
                      {partySize}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {/* Increment */}
                <button
                  type="button"
                  onClick={incrementPartySize}
                  disabled={partySize >= 200}
                  className={cn(
                    'w-8 h-8 rounded-md flex items-center justify-center transition-all duration-150',
                    'text-muted-foreground hover:text-foreground hover:bg-white/5 active:scale-95',
                    partySize >= 200 && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground'
                  )}
                  aria-label="Increase party size"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                {partySize === 1 ? 'Just you' : `${partySize} people in your group`}
              </p>
            </div>

            {/* KAN-48 — Preferred Vibe */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                Preferred Vibe
                <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Select value={preferredVibe} onValueChange={setPreferredVibe}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Pick a vibe…" />
                </SelectTrigger>
                <SelectContent>
                  {VIBE_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add Stop Card */}
            <Card className="sticky top-24 card-dark border-border">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Add a Stop
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Venue</Label>
                  <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Choose a venue…" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoading ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">Loading…</div>
                      ) : venues && venues.length > 0 ? (
                        venues.map(venue => (
                          <SelectItem key={venue.id} value={venue.id}>
                            <div className="flex items-center gap-2">
                              <span>{venue.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({venueTypeLabels[venue.venue_type]})
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-2 px-3 text-sm text-muted-foreground">No venues available</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger className="bg-secondary border-border">
                        <Clock className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Select value={endTime} onValueChange={setEndTime}>
                      <SelectTrigger className="bg-secondary border-border">
                        <Clock className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!isTimeRangeValid && (
                      <p className="text-xs text-destructive">Invalid time range</p>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full gradient-primary"
                  onClick={addStop}
                  disabled={!selectedVenueId || !isTimeRangeValid}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Plan
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Add venues in the order you want to visit them
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Timeline ── */}
          <div className="lg:col-span-2">
            <Card className="card-dark border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Your Night Timeline
                </CardTitle>
                {plannedStops.length > 0 && (
                  <Badge variant="secondary">
                    {calculateTotalDuration()} hours total
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {plannedStops.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No stops planned yet</p>
                    <p className="text-sm">
                      Select venues from the left panel to build your perfect night out
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {plannedStops.map((stop, index) => (
                      <div key={stop.id} className="relative">
                        {/* Connector line */}
                        {index < plannedStops.length - 1 && (
                          <div className="absolute left-6 top-full h-4 w-0.5 bg-border" />
                        )}

                        <div className="rounded-xl p-4 flex items-center gap-4 bg-secondary/50 border border-border">
                          {/* Order number */}
                          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                            {index + 1}
                          </div>

                          {/* Venue info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-display font-semibold text-foreground">
                                {stop.venue.name}
                              </h4>
                              <Badge
                                className={`${venueTypeColorMap[stop.venue.venue_type]} text-white border-0 text-xs`}
                              >
                                {venueTypeLabels[stop.venue.venue_type]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {stop.startTime} – {stop.endTime}
                                <span className="text-xs text-muted-foreground/60">
                                  ({calcStopDuration(stop.startTime, stop.endTime)}h)
                                </span>
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {stop.venue.city}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Link to={`/venues/${stop.venue.id}`}>
                              <Button variant="ghost" size="sm">
                                View <ChevronRight className="ml-1 h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeStop(stop.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* KAN-48 — Notes section */}
                    <div className="mt-4 space-y-2">
                      <Label className="text-foreground text-sm">
                        Additional Notes
                        <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                      </Label>
                      <Textarea
                        placeholder="Dietary requirements, special requests, anything the venues should know…"
                        value={planNotes}
                        onChange={(e) => setPlanNotes(e.target.value)}
                        rows={3}
                        className="resize-none bg-secondary border-border text-sm"
                      />
                    </div>

                    {/* Summary stats */}
                    <div className="mt-6 pt-6 border-t border-border">
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Stops</p>
                          <p className="font-display font-semibold text-lg">{plannedStops.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="font-display font-semibold text-lg text-primary">
                            {calculateTotalDuration()}h
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Party</p>
                          <p className="font-display font-semibold text-lg">
                            {partySize} {partySize === 1 ? 'person' : 'people'}
                          </p>
                        </div>
                      </div>

                      {/* Vibe badge */}
                      {preferredVibe && (
                        <div className="mb-4">
                          <Badge variant="outline" className="text-xs">
                            <Zap className="h-3 w-3 mr-1 text-primary" />
                            {VIBE_OPTIONS.find(v => v.value === preferredVibe)?.label}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Save Plan — always visible ── */}
                <div className={cn('pt-6', plannedStops.length > 0 ? 'border-t border-border mt-0' : 'border-t border-border mt-6')}>
                  <Button
                    className="w-full gradient-primary"
                    size="lg"
                    onClick={handleSavePlan}
                    disabled={createPlannedNight.isPending}
                  >
                    {createPlannedNight.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Plan
                      </>
                    )}
                  </Button>

                  {/* Inline validation error */}
                  <AnimatePresence>
                    {saveValidationError && (
                      <motion.p
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="text-xs text-destructive mt-2 text-center"
                      >
                        {saveValidationError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {!user && (
                    <p className="text-xs text-center text-muted-foreground mt-3">
                      <Link to="/auth" className="text-primary hover:underline">
                        Sign in
                      </Link>{' '}
                      to save your plan
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </PageTransition>
    </Layout>
  );
}
