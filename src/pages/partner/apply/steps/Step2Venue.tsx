import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  Globe,
  Instagram,
  Facebook,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PartnerApplication,
  VenueCategory,
  VENUE_CATEGORY_LABELS,
  OpeningHours,
  highlightField,
} from '@/types/application';

interface Step2VenueProps {
  formData: Partial<PartnerApplication>;
  onNext: (data: Partial<PartnerApplication>) => void;
  onBack: () => void;
  initialFocusField?: string | null;
  onClearHighlight?: () => void;
}

interface FormErrors {
  venue_name?: string;
  venue_category?: string;
  description?: string;
  address_line1?: string;
  city?: string;
  google_maps_link?: string;
  seating_capacity?: string;
  avg_spend_per_person?: string;
  opening_hours?: string;
  business_reg_number?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function buildDefaultHours(existing?: OpeningHours | null): OpeningHours {
  const defaults: OpeningHours = {};
  DAY_KEYS.forEach((day, i) => {
    if (existing?.[day]) {
      defaults[day] = existing[day];
    } else {
      const isWeekend = i >= 5;
      defaults[day] = {
        open: isWeekend ? '15:00' : '17:00',
        close: '02:00',
        closed: false,
      };
    }
  });
  return defaults;
}

export function Step2Venue({ formData, onNext, onBack, initialFocusField, onClearHighlight }: Step2VenueProps) {
  const [venueName, setVenueName] = useState(formData.venue_name ?? '');
  const [venueCategory, setVenueCategory] = useState<VenueCategory | ''>(
    formData.venue_category ?? ''
  );
  const [description, setDescription] = useState(formData.description ?? '');
  const [addressLine1, setAddressLine1] = useState(formData.address_line1 ?? '');
  const [addressLine2, setAddressLine2] = useState(formData.address_line2 ?? '');
  const [city, setCity] = useState(formData.city ?? '');
  const [country, setCountry] = useState(formData.country ?? 'Mongolia');
  const [googleMapsLink, setGoogleMapsLink] = useState(formData.google_maps_link ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(formData.website_url ?? '');
  const [instagramHandle, setInstagramHandle] = useState(formData.instagram_handle ?? '');
  const [facebookUrl, setFacebookUrl] = useState(formData.facebook_url ?? '');
  const [seatingCapacity, setSeatingCapacity] = useState<string>(
    formData.seating_capacity ? String(formData.seating_capacity) : ''
  );
  const [privateHireAvailable, setPrivateHireAvailable] = useState(
    formData.private_hire_available ?? false
  );
  const [avgSpend, setAvgSpend] = useState<string>(
    formData.avg_spend_per_person ? String(formData.avg_spend_per_person) : ''
  );
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    buildDefaultHours(formData.opening_hours)
  );
  const [businessRegNumber, setBusinessRegNumber] = useState(formData.business_reg_number ?? '');
  const [errors, setErrors] = useState<FormErrors>({});

  // Scroll-to-field requested from Step 4 missing-items list
  useEffect(() => {
    if (!initialFocusField) return;
    const timer = setTimeout(() => {
      highlightField(initialFocusField);
      onClearHighlight?.();
    }, 120);
    return () => clearTimeout(timer);
  }, [initialFocusField, onClearHighlight]);

  function updateHours(day: string, field: 'open' | 'close' | 'closed', value: string | boolean) {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!venueName.trim()) newErrors.venue_name = 'Venue name is required';
    if (!venueCategory) newErrors.venue_category = 'Please select a venue category';
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length < 50) {
      newErrors.description = `Description must be at least 50 characters (${description.length}/50)`;
    }
    if (!addressLine1.trim()) newErrors.address_line1 = 'Address is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!googleMapsLink.trim()) newErrors.google_maps_link = 'Google Maps link is required';
    if (!seatingCapacity || Number(seatingCapacity) <= 0)
      newErrors.seating_capacity = 'Seating capacity is required';
    if (!avgSpend || Number(avgSpend) <= 0)
      newErrors.avg_spend_per_person = 'Average spend per person is required';

    const hasOpenDay = DAY_KEYS.some((day) => !openingHours[day]?.closed);
    if (!hasOpenDay)
      newErrors.opening_hours = 'At least one day must be open';

    if (!businessRegNumber.trim())
      newErrors.business_reg_number = 'Business registration number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleContinue() {
    if (!validate()) return;
    onNext({
      venue_name: venueName.trim(),
      venue_category: venueCategory as VenueCategory,
      description: description.trim(),
      address_line1: addressLine1.trim(),
      address_line2: addressLine2.trim() || null,
      city: city.trim(),
      country: country.trim(),
      google_maps_link: googleMapsLink.trim(),
      website_url: websiteUrl.trim() || null,
      instagram_handle: instagramHandle.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      seating_capacity: Number(seatingCapacity),
      private_hire_available: privateHireAvailable,
      avg_spend_per_person: Number(avgSpend),
      opening_hours: openingHours,
      business_reg_number: businessRegNumber.trim(),
    });
  }

  const inputClass =
    'bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-primary';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Venue Details</h1>
        <p className="mt-1 text-muted-foreground">
          Tell us about your venue so we can verify and showcase it on TAPN.
        </p>
      </div>

      {/* Section 1: Basic Information */}
      <motion.div
        className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-6 space-y-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0 }}
      >
        <div className="flex items-center gap-2 pb-1 border-b border-white/10">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-white">Basic Information</h2>
        </div>

        {/* Venue name */}
        <div className="space-y-2">
          <Label htmlFor="venue_name" className="text-white">
            Venue Name <span className="text-red-400">*</span>
          </Label>
          <Input
            id="venue_name"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="Your venue's name"
            className={inputClass}
          />
          {errors.venue_name && <p className="text-sm text-red-400">{errors.venue_name}</p>}
        </div>

        {/* Venue category */}
        <div className="space-y-2">
          <Label htmlFor="venue_category" className="text-white">
            Venue Category <span className="text-red-400">*</span>
          </Label>
          <Select
            value={venueCategory}
            onValueChange={(val) => setVenueCategory(val as VenueCategory)}
          >
            <SelectTrigger id="venue_category" className={inputClass}>
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(240_10%_8%)] border-white/10">
              {(Object.entries(VENUE_CATEGORY_LABELS) as [VenueCategory, string][]).map(
                ([value, label]) => (
                  <SelectItem
                    key={value}
                    value={value}
                    className="text-white hover:bg-white/10 focus:bg-white/10"
                  >
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          {errors.venue_category && (
            <p className="text-sm text-red-400">{errors.venue_category}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-white">
            Description <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your venue — atmosphere, specialties, unique features..."
            rows={4}
            maxLength={500}
            className={inputClass + ' resize-none'}
          />
          <div className="flex items-center justify-between">
            <div>
              {errors.description && (
                <p className="text-sm text-red-400">{errors.description}</p>
              )}
            </div>
            <span
              className={[
                'text-xs',
                description.length < 50 ? 'text-amber-400' : 'text-muted-foreground',
              ].join(' ')}
            >
              {description.length} / 500
            </span>
          </div>
        </div>
      </motion.div>

      {/* Section 2: Location */}
      <motion.div
        className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-6 space-y-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <div className="flex items-center gap-2 pb-1 border-b border-white/10">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-white">Location</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address_line1" className="text-white">
              Address Line 1 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="address_line1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Street address"
              className={inputClass}
            />
            {errors.address_line1 && (
              <p className="text-sm text-red-400">{errors.address_line1}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address_line2" className="text-white">
              Address Line 2{' '}
              <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-xs text-muted-foreground">
                Optional
              </span>
            </Label>
            <Input
              id="address_line2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Floor, building, suite..."
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city" className="text-white">
              City <span className="text-red-400">*</span>
            </Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ulaanbaatar"
              className={inputClass}
            />
            {errors.city && <p className="text-sm text-red-400">{errors.city}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country" className="text-white">
              Country
            </Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="google_maps_link" className="text-white">
            Google Maps Link <span className="text-red-400">*</span>
          </Label>
          <Input
            id="google_maps_link"
            type="url"
            value={googleMapsLink}
            onChange={(e) => setGoogleMapsLink(e.target.value)}
            placeholder="https://maps.google.com/..."
            className={inputClass}
          />
          {errors.google_maps_link && (
            <p className="text-sm text-red-400">{errors.google_maps_link}</p>
          )}
        </div>
      </motion.div>

      {/* Section 3: Online Presence */}
      <motion.div
        className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-6 space-y-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center gap-2 pb-1 border-b border-white/10">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-white">Online Presence</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website_url" className="text-white">
            Website URL{' '}
            <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-xs text-muted-foreground">
              Optional
            </span>
          </Label>
          <Input
            id="website_url"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourvenue.mn"
            className={inputClass}
          />
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-xs text-amber-400">
              Recommended — helps our team verify your venue faster.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagram_handle" className="text-white">
            Instagram Handle{' '}
            <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-xs text-muted-foreground">
              Optional
            </span>
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <Instagram className="h-4 w-4 text-muted-foreground" />
              <span className="ml-1 text-muted-foreground">@</span>
            </div>
            <Input
              id="instagram_handle"
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ''))}
              placeholder="yourvenue"
              className={inputClass + ' pl-12'}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="facebook_url" className="text-white">
            Facebook Page URL{' '}
            <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-xs text-muted-foreground">
              Optional
            </span>
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <Facebook className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="facebook_url"
              type="url"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/yourvenue"
              className={inputClass + ' pl-10'}
            />
          </div>
        </div>
      </motion.div>

      {/* Section 4: Venue Details */}
      <motion.div
        className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-6 space-y-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="flex items-center gap-2 pb-1 border-b border-white/10">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-white">Venue Details</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="seating_capacity" className="text-white">
              Seating Capacity <span className="text-red-400">*</span>
            </Label>
            <Input
              id="seating_capacity"
              type="number"
              min={1}
              value={seatingCapacity}
              onChange={(e) => setSeatingCapacity(e.target.value)}
              placeholder="e.g. 120"
              className={inputClass}
            />
            {errors.seating_capacity && (
              <p className="text-sm text-red-400">{errors.seating_capacity}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="avg_spend_per_person" className="flex items-center gap-1 text-white">
              <DollarSign className="h-4 w-4 text-primary" />
              Avg. Spend per Person (₮) <span className="text-red-400">*</span>
            </Label>
            <Input
              id="avg_spend_per_person"
              type="number"
              min={0}
              value={avgSpend}
              onChange={(e) => setAvgSpend(e.target.value)}
              placeholder="e.g. 50000"
              className={inputClass}
            />
            {errors.avg_spend_per_person && (
              <p className="text-sm text-red-400">{errors.avg_spend_per_person}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <p className="text-sm font-medium text-white">Private Hire Available</p>
            <p className="text-xs text-muted-foreground">
              Can guests reserve the entire venue exclusively?
            </p>
          </div>
          <Switch
            checked={privateHireAvailable}
            onCheckedChange={setPrivateHireAvailable}
          />
        </div>
      </motion.div>

      {/* Section 5: Opening Hours */}
      <motion.div
        id="opening_hours"
        className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-6 space-y-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex items-center gap-2 pb-1 border-b border-white/10">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-white">Opening Hours</h2>
        </div>

        {errors.opening_hours && (
          <p className="text-sm text-red-400">{errors.opening_hours}</p>
        )}

        <div className="space-y-3">
          {DAYS.map((day, i) => {
            const key = DAY_KEYS[i];
            const hours = openingHours[key] ?? { open: '17:00', close: '02:00', closed: false };
            return (
              <div
                key={day}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
              >
                <div className="w-24 shrink-0">
                  <span className="text-sm font-medium text-white">{day.slice(0, 3)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={!hours.closed}
                    onCheckedChange={(checked) => updateHours(key, 'closed', !checked)}
                    className="data-[state=unchecked]:bg-white/10"
                  />
                  <span className="text-xs text-muted-foreground">
                    {hours.closed ? 'Closed' : 'Open'}
                  </span>
                </div>

                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="time"
                    value={hours.open ?? '17:00'}
                    onChange={(e) => updateHours(key, 'open', e.target.value)}
                    disabled={!!hours.closed}
                    className={[
                      inputClass,
                      'w-32 text-sm',
                      hours.closed ? 'opacity-30 cursor-not-allowed' : '',
                    ].join(' ')}
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="time"
                    value={hours.close ?? '02:00'}
                    onChange={(e) => updateHours(key, 'close', e.target.value)}
                    disabled={!!hours.closed}
                    className={[
                      inputClass,
                      'w-32 text-sm',
                      hours.closed ? 'opacity-30 cursor-not-allowed' : '',
                    ].join(' ')}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Section 6: Business Registration */}
      <motion.div
        className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-6 space-y-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <div className="flex items-center gap-2 pb-1 border-b border-white/10">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-white">Business Registration</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="business_reg_number" className="text-white">
            Business Registration Number <span className="text-red-400">*</span>
          </Label>
          <Input
            id="business_reg_number"
            value={businessRegNumber}
            onChange={(e) => setBusinessRegNumber(e.target.value)}
            placeholder="e.g. 4012345"
            className={inputClass}
          />
          <p className="text-xs text-muted-foreground">
            Found on your business registration certificate.
          </p>
          {errors.business_reg_number && (
            <p className="text-sm text-red-400">{errors.business_reg_number}</p>
          )}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          className="bg-primary px-8 text-white hover:bg-primary/90"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
