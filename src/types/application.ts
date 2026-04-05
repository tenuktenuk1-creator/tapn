export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_verification'
  | 'needs_more_information'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type DocumentType =
  | 'business_registration'
  | 'trade_license'
  | 'proof_of_address'
  | 'applicant_id'
  | 'authorization_letter'
  | 'owner_id'
  | 'lease_agreement'
  | 'venue_photo'
  | 'venue_photo_extra';

export type VenueRoleAtVenue = 'owner' | 'general_manager' | 'authorized_manager';

export type VenueCategory =
  | 'restaurant' | 'bar' | 'private_dining' | 'event_space'
  | 'rooftop' | 'club' | 'lounge' | 'other';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface FraudFlag {
  id: string;
  label: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface OpeningHours {
  [day: string]: { open: string; close: string; closed?: boolean };
}

export interface PartnerApplication {
  id: string;
  user_id: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  rejection_notes: string | null;
  reapply_after: string | null;

  // Step 1
  full_name: string | null;
  role_at_venue: VenueRoleAtVenue | null;
  phone: string | null;
  business_email: string | null;
  national_id: string | null;
  linkedin_url: string | null;

  // Step 2
  venue_name: string | null;
  venue_category: VenueCategory | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  country: string | null;
  google_maps_link: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  facebook_url: string | null;
  seating_capacity: number | null;
  private_hire_available: boolean;
  opening_hours: OpeningHours | null;
  avg_spend_per_person: number | null;
  description: string | null;

  // Step 3
  business_reg_number: string | null;

  // Metadata
  completeness_score: number;
  fraud_flags: FraudFlag[];
  risk_level: RiskLevel;
  declaration_confirmed: boolean;
  declaration_confirmed_at: string | null;

  assigned_to: string | null;
  current_step: number;
  created_at: string;
  updated_at: string;

  // Joined
  documents?: ApplicationDocument[];
  verification_checks?: VerificationChecks;
  review_logs?: ReviewLog[];
  info_requests?: InfoRequest[];
}

export interface ApplicationDocument {
  id: string;
  application_id: string;
  user_id: string;
  document_type: DocumentType;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
  reviewed: boolean;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface VerificationChecks {
  id: string;
  application_id: string;
  documents_reviewed: boolean;
  phone_call_verified: boolean;
  business_registration_confirmed: boolean;
  address_confirmed: boolean;
  website_verified: boolean;
  social_media_verified: boolean;
  owner_identity_confirmed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface ReviewLog {
  id: string;
  application_id: string;
  event_type: string;
  actor_id: string | null;
  actor_type: 'applicant' | 'admin' | 'system';
  old_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface InfoRequest {
  id: string;
  application_id: string;
  requested_items: string[];
  message_to_applicant: string;
  sent_at: string;
  sent_by: string | null;
  responded_at: string | null;
  response_note: string | null;
}

// Required docs per role
export const REQUIRED_DOCS_BY_ROLE: Record<VenueRoleAtVenue, DocumentType[]> = {
  owner: ['business_registration', 'trade_license', 'proof_of_address', 'applicant_id', 'venue_photo'],
  general_manager: ['business_registration', 'trade_license', 'proof_of_address', 'applicant_id', 'venue_photo', 'authorization_letter', 'owner_id'],
  authorized_manager: ['business_registration', 'trade_license', 'proof_of_address', 'applicant_id', 'venue_photo', 'authorization_letter', 'owner_id'],
};

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  business_registration: 'Business Registration Certificate',
  trade_license: 'Trade / Operating License',
  proof_of_address: 'Proof of Address (utility bill or lease, max 6 months old)',
  applicant_id: 'Government-issued ID (applicant)',
  authorization_letter: 'Authorization Letter from Venue Owner',
  owner_id: 'Venue Owner Government ID',
  lease_agreement: 'Lease Agreement',
  venue_photo: 'Main Venue Photo',
  venue_photo_extra: 'Additional Venue Photo',
};

export const VENUE_CATEGORY_LABELS: Record<VenueCategory, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  private_dining: 'Private Dining',
  event_space: 'Event Space',
  rooftop: 'Rooftop',
  club: 'Club / Nightclub',
  lounge: 'Lounge',
  other: 'Other',
};

// Validation
export function computeCompletenessScore(
  app: Partial<PartnerApplication>,
  docs: ApplicationDocument[]
): number {
  const requiredFields = [
    'full_name', 'role_at_venue', 'phone', 'business_email', 'national_id',
    'venue_name', 'venue_category', 'address_line1', 'city', 'country',
    'google_maps_link', 'seating_capacity', 'avg_spend_per_person', 'description',
    'business_reg_number',
  ];

  const filledFields = requiredFields.filter(f => {
    const val = (app as Record<string, unknown>)[f];
    return val !== null && val !== undefined && val !== '' && val !== 0;
  }).length;

  const openingHoursScore = app.opening_hours &&
    Object.values(app.opening_hours).some(h => !h.closed) ? 1 : 0;
  const declarationScore = app.declaration_confirmed ? 1 : 0;

  const totalFieldsScore = (filledFields + openingHoursScore + declarationScore) / (requiredFields.length + 2);

  const role = app.role_at_venue ?? 'owner';
  const requiredDocs = REQUIRED_DOCS_BY_ROLE[role];
  const uploadedRequiredDocTypes = docs.map(d => d.document_type);
  const uploadedRequiredCount = requiredDocs.filter(d => uploadedRequiredDocTypes.includes(d)).length;
  const docsScore = requiredDocs.length > 0 ? uploadedRequiredCount / requiredDocs.length : 1;

  return Math.round(totalFieldsScore * 70 + docsScore * 30);
}

export function getMissingRequirements(
  app: Partial<PartnerApplication>,
  docs: ApplicationDocument[]
): { id: string; label: string }[] {
  const missing: { id: string; label: string }[] = [];

  const required: Array<{ key: keyof PartnerApplication; label: string }> = [
    { key: 'full_name', label: 'Full legal name' },
    { key: 'role_at_venue', label: 'Your role at the venue' },
    { key: 'phone', label: 'Phone number' },
    { key: 'business_email', label: 'Business email' },
    { key: 'national_id', label: 'National ID or passport number' },
    { key: 'venue_name', label: 'Venue name' },
    { key: 'venue_category', label: 'Venue category' },
    { key: 'address_line1', label: 'Venue address' },
    { key: 'city', label: 'City' },
    { key: 'google_maps_link', label: 'Google Maps link' },
    { key: 'seating_capacity', label: 'Seating capacity' },
    { key: 'avg_spend_per_person', label: 'Average spend per person' },
    { key: 'description', label: 'Venue description (min 50 characters)' },
    { key: 'business_reg_number', label: 'Business registration number' },
  ];

  for (const { key, label } of required) {
    const val = app[key];
    if (val === null || val === undefined || val === '') {
      missing.push({ id: key, label });
    }
    if (key === 'description' && typeof val === 'string' && val.length < 50) {
      missing.push({ id: 'description_length', label: 'Venue description must be at least 50 characters' });
    }
  }

  if (!app.opening_hours || !Object.values(app.opening_hours).some(h => !h.closed)) {
    missing.push({ id: 'opening_hours', label: 'Opening hours (at least one day)' });
  }

  if (!app.declaration_confirmed) {
    missing.push({ id: 'declaration', label: 'Declaration checkbox' });
  }

  // Check required docs
  const role = app.role_at_venue ?? 'owner';
  const requiredDocs = REQUIRED_DOCS_BY_ROLE[role];
  const uploadedDocTypes = docs.map(d => d.document_type);
  for (const docType of requiredDocs) {
    if (!uploadedDocTypes.includes(docType)) {
      missing.push({ id: `doc_${docType}`, label: `Missing document: ${DOCUMENT_LABELS[docType]}` });
    }
  }

  return missing;
}

export function computeFraudFlags(app: Partial<PartnerApplication>): FraudFlag[] {
  const flags: FraudFlag[] = [];
  const FREE_DOMAINS = ['gmail.com','yahoo.com','hotmail.com','outlook.com','mail.com'];

  if (app.business_email) {
    const domain = app.business_email.split('@')[1]?.toLowerCase();
    if (domain && FREE_DOMAINS.includes(domain)) {
      flags.push({ id: 'free_email_domain', label: 'Business email uses a free domain (gmail/yahoo/hotmail)', severity: 'MEDIUM' });
    }
  }

  if (!app.website_url && !app.instagram_handle && !app.facebook_url) {
    flags.push({ id: 'no_online_presence', label: 'No website or social media provided', severity: 'MEDIUM' });
  }

  if (app.seating_capacity && app.seating_capacity < 10) {
    flags.push({ id: 'low_capacity', label: 'Declared seating capacity below 10', severity: 'MEDIUM' });
  }

  return flags;
}

export function computeRiskLevel(flags: FraudFlag[]): RiskLevel {
  if (flags.some(f => f.severity === 'HIGH')) return 'high';
  if (flags.some(f => f.severity === 'MEDIUM')) return 'medium';
  return 'low';
}
