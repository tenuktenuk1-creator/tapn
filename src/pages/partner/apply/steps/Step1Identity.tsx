import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, User, Phone, Mail, CreditCard, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PartnerApplication, VenueRoleAtVenue, highlightField } from '@/types/application';

interface Step1IdentityProps {
  formData: Partial<PartnerApplication>;
  onNext: (data: Partial<PartnerApplication>) => void;
  initialFocusField?: string | null;
  onClearHighlight?: () => void;
}

interface FormErrors {
  full_name?: string;
  role_at_venue?: string;
  phone?: string;
  business_email?: string;
  national_id?: string;
}

const ROLE_OPTIONS: { value: VenueRoleAtVenue; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'general_manager', label: 'General Manager' },
  { value: 'authorized_manager', label: 'Authorized Manager' },
];

export function Step1Identity({ formData, onNext, initialFocusField, onClearHighlight }: Step1IdentityProps) {
  const [fullName, setFullName] = useState(formData.full_name ?? '');
  const [roleAtVenue, setRoleAtVenue] = useState<VenueRoleAtVenue | ''>(
    formData.role_at_venue ?? ''
  );
  const [phone, setPhone] = useState(formData.phone ?? '');
  const [businessEmail, setBusinessEmail] = useState(formData.business_email ?? '');
  const [nationalId, setNationalId] = useState(formData.national_id ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(formData.linkedin_url ?? '');
  const [errors, setErrors] = useState<FormErrors>({});

  // Scroll to and highlight a field requested from Step 4's missing-items list
  useEffect(() => {
    if (!initialFocusField) return;
    const timer = setTimeout(() => {
      highlightField(initialFocusField);
      onClearHighlight?.();
    }, 120);
    return () => clearTimeout(timer);
  }, [initialFocusField, onClearHighlight]);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!fullName.trim()) newErrors.full_name = 'Full legal name is required';
    if (!roleAtVenue) newErrors.role_at_venue = 'Please select your role at the venue';
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    if (!businessEmail.trim()) {
      newErrors.business_email = 'Business email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
      newErrors.business_email = 'Please enter a valid email address';
    }
    if (!nationalId.trim()) newErrors.national_id = 'National ID or passport number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleContinue() {
    if (!validate()) return;
    onNext({
      full_name: fullName.trim(),
      role_at_venue: roleAtVenue as VenueRoleAtVenue,
      phone: phone.trim(),
      business_email: businessEmail.trim(),
      national_id: nationalId.trim(),
      linkedin_url: linkedinUrl.trim() || null,
    });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Your Identity &amp; Contact</h1>
        <p className="mt-1 text-muted-foreground">
          Tell us about yourself so we can verify your application.
        </p>
      </div>

      <motion.div
        className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-6 space-y-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Full name */}
        <div className="space-y-2">
          <Label htmlFor="full_name" className="flex items-center gap-2 text-white">
            <User className="h-4 w-4 text-primary" />
            Full Legal Name
            <span className="text-red-400">*</span>
          </Label>
          <Input
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="As it appears on your government ID"
            className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-primary"
          />
          {errors.full_name && (
            <p className="text-sm text-red-400">{errors.full_name}</p>
          )}
        </div>

        {/* Role at venue */}
        <div className="space-y-2">
          <Label htmlFor="role_at_venue" className="flex items-center gap-2 text-white">
            Your Role at the Venue
            <span className="text-red-400">*</span>
          </Label>
          <Select
            value={roleAtVenue}
            onValueChange={(val) => setRoleAtVenue(val as VenueRoleAtVenue)}
          >
            <SelectTrigger
              id="role_at_venue"
              className="bg-white/5 border-white/10 text-white focus:border-primary"
            >
              <SelectValue placeholder="Select your role..." />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(240_10%_8%)] border-white/10">
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-white hover:bg-white/10 focus:bg-white/10"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role_at_venue && (
            <p className="text-sm text-red-400">{errors.role_at_venue}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2 text-white">
            <Phone className="h-4 w-4 text-primary" />
            Phone Number
            <span className="text-red-400">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+976 ..."
            className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-primary"
          />
          {errors.phone && (
            <p className="text-sm text-red-400">{errors.phone}</p>
          )}
        </div>

        {/* Business email */}
        <div className="space-y-2">
          <Label htmlFor="business_email" className="flex items-center gap-2 text-white">
            <Mail className="h-4 w-4 text-primary" />
            Business Email Address
            <span className="text-red-400">*</span>
          </Label>
          <Input
            id="business_email"
            type="email"
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
            placeholder="you@yourvenuecompany.mn"
            className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-primary"
          />
          {errors.business_email && (
            <p className="text-sm text-red-400">{errors.business_email}</p>
          )}
        </div>

        {/* National ID */}
        <div className="space-y-2">
          <Label htmlFor="national_id" className="flex items-center gap-2 text-white">
            <CreditCard className="h-4 w-4 text-primary" />
            National ID / Passport Number
            <span className="text-red-400">*</span>
          </Label>
          <Input
            id="national_id"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="ID or passport number"
            className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            Stored securely and only visible to TAPN admin.
          </p>
          {errors.national_id && (
            <p className="text-sm text-red-400">{errors.national_id}</p>
          )}
        </div>

        {/* LinkedIn (optional) */}
        <div className="space-y-2">
          <Label htmlFor="linkedin_url" className="flex items-center gap-2 text-white">
            <Linkedin className="h-4 w-4 text-primary" />
            LinkedIn / Professional Profile URL
            <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-xs text-muted-foreground">
              Optional
            </span>
          </Label>
          <Input
            id="linkedin_url"
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/yourprofile"
            className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
      </motion.div>

      {/* Security info box */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
          <p className="text-sm text-blue-200">
            Your information is encrypted and only accessible by TAPN admin reviewers.
            We never share your personal information with third parties.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
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
