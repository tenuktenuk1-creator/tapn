-- Migration: partner_applications system
-- Date: 2026-04-05
-- Creates the full partner application pipeline tables with RLS policies

-- ============================================================
-- Helper: is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- Helper: handle_updated_at()
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. partner_applications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_applications (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status: draft | submitted | under_verification | needs_more_information | approved | rejected | withdrawn
  status                    TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_verification','needs_more_information','approved','rejected','withdrawn')),
  submitted_at              TIMESTAMPTZ,
  approved_at               TIMESTAMPTZ,
  rejected_at               TIMESTAMPTZ,
  rejection_reason          TEXT,
  rejection_notes           TEXT,
  reapply_after             TIMESTAMPTZ,

  -- Step 1: Applicant identity
  full_name                 TEXT,
  role_at_venue             TEXT CHECK (role_at_venue IN ('owner','general_manager','authorized_manager')),
  phone                     TEXT,
  business_email            TEXT,
  national_id               TEXT,
  linkedin_url              TEXT,

  -- Step 2: Venue details
  venue_name                TEXT,
  venue_category            TEXT CHECK (venue_category IN ('restaurant','bar','private_dining','event_space','rooftop','club','lounge','other')),
  address_line1             TEXT,
  address_line2             TEXT,
  city                      TEXT,
  country                   TEXT DEFAULT 'Mongolia',
  google_maps_link          TEXT,
  website_url               TEXT,
  instagram_handle          TEXT,
  facebook_url              TEXT,
  seating_capacity          INTEGER,
  private_hire_available    BOOLEAN DEFAULT FALSE,
  opening_hours             JSONB,
  avg_spend_per_person      INTEGER,
  description               TEXT,

  -- Step 3: Business proof
  business_reg_number       TEXT,

  -- Application metadata
  completeness_score        INTEGER DEFAULT 0,
  fraud_flags               JSONB DEFAULT '[]'::jsonb,
  risk_level                TEXT DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  declaration_confirmed     BOOLEAN DEFAULT FALSE,
  declaration_confirmed_at  TIMESTAMPTZ,

  -- Admin
  assigned_to               UUID REFERENCES auth.users(id),
  current_step              INTEGER DEFAULT 1,

  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own rows
CREATE POLICY "partner_applications_user_select"
  ON public.partner_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can INSERT their own rows
CREATE POLICY "partner_applications_user_insert"
  ON public.partner_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can UPDATE their own rows ONLY when status = 'draft' OR 'needs_more_information'
CREATE POLICY "partner_applications_user_update"
  ON public.partner_applications
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status IN ('draft', 'needs_more_information')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status IN ('draft', 'needs_more_information')
  );

-- Admins can SELECT all rows where status != 'draft'
CREATE POLICY "partner_applications_admin_select"
  ON public.partner_applications
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    AND status != 'draft'
  );

-- Admins can UPDATE all rows (status transitions, assigned_to, etc.)
CREATE POLICY "partner_applications_admin_update"
  ON public.partner_applications
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- updated_at trigger for partner_applications
CREATE TRIGGER handle_partner_applications_updated_at
  BEFORE UPDATE ON public.partner_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 2. partner_application_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_application_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   UUID NOT NULL REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type    TEXT NOT NULL CHECK (document_type IN (
    'business_registration','trade_license','proof_of_address','applicant_id',
    'authorization_letter','owner_id','lease_agreement','venue_photo','venue_photo_extra'
  )),
  storage_path     TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  file_size        INTEGER,
  mime_type        TEXT,
  uploaded_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed         BOOLEAN DEFAULT FALSE,
  review_notes     TEXT,
  reviewed_by      UUID REFERENCES auth.users(id),
  reviewed_at      TIMESTAMPTZ
);

ALTER TABLE public.partner_application_documents ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own docs
CREATE POLICY "partner_application_documents_user_select"
  ON public.partner_application_documents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can INSERT their own docs
CREATE POLICY "partner_application_documents_user_insert"
  ON public.partner_application_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can DELETE their own docs (to replace)
CREATE POLICY "partner_application_documents_user_delete"
  ON public.partner_application_documents
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can SELECT all docs
CREATE POLICY "partner_application_documents_admin_select"
  ON public.partner_application_documents
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 3. partner_verification_checks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_verification_checks (
  id                               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id                   UUID NOT NULL REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  documents_reviewed               BOOLEAN DEFAULT FALSE,
  phone_call_verified              BOOLEAN DEFAULT FALSE,
  business_registration_confirmed  BOOLEAN DEFAULT FALSE,
  address_confirmed                BOOLEAN DEFAULT FALSE,
  website_verified                 BOOLEAN DEFAULT FALSE,
  social_media_verified            BOOLEAN DEFAULT FALSE,
  owner_identity_confirmed         BOOLEAN DEFAULT FALSE,
  notes                            TEXT,
  created_at                       TIMESTAMPTZ DEFAULT NOW(),
  updated_at                       TIMESTAMPTZ DEFAULT NOW(),
  updated_by                       UUID REFERENCES auth.users(id)
);

ALTER TABLE public.partner_verification_checks ENABLE ROW LEVEL SECURITY;

-- Admins can SELECT all rows
CREATE POLICY "partner_verification_checks_admin_select"
  ON public.partner_verification_checks
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can INSERT all rows
CREATE POLICY "partner_verification_checks_admin_insert"
  ON public.partner_verification_checks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can UPDATE all rows
CREATE POLICY "partner_verification_checks_admin_update"
  ON public.partner_verification_checks
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can SELECT their own via application_id → user_id
CREATE POLICY "partner_verification_checks_user_select"
  ON public.partner_verification_checks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_applications pa
      WHERE pa.id = application_id
        AND pa.user_id = auth.uid()
    )
  );

-- updated_at trigger for partner_verification_checks
CREATE TRIGGER handle_partner_verification_checks_updated_at
  BEFORE UPDATE ON public.partner_verification_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 4. partner_review_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_review_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   UUID NOT NULL REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL CHECK (event_type IN (
    'application_created','application_submitted','review_started','status_changed',
    'note_added','info_requested','applicant_responded','document_uploaded','document_reviewed',
    'checklist_updated','application_approved','application_rejected','role_upgraded',
    'role_revoked','reapplication_allowed'
  )),
  actor_id         UUID REFERENCES auth.users(id),
  actor_type       TEXT CHECK (actor_type IN ('applicant','admin','system')),
  old_status       TEXT,
  new_status       TEXT,
  metadata         JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.partner_review_logs ENABLE ROW LEVEL SECURITY;

-- Admins can SELECT all logs
CREATE POLICY "partner_review_logs_admin_select"
  ON public.partner_review_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can INSERT all logs
CREATE POLICY "partner_review_logs_admin_insert"
  ON public.partner_review_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Users can SELECT logs for their own application
CREATE POLICY "partner_review_logs_user_select"
  ON public.partner_review_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_applications pa
      WHERE pa.id = application_id
        AND pa.user_id = auth.uid()
    )
  );

-- ============================================================
-- 5. partner_info_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_info_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  requested_items       JSONB NOT NULL,
  message_to_applicant  TEXT NOT NULL,
  sent_at               TIMESTAMPTZ DEFAULT NOW(),
  sent_by               UUID REFERENCES auth.users(id),
  responded_at          TIMESTAMPTZ,
  response_note         TEXT
);

ALTER TABLE public.partner_info_requests ENABLE ROW LEVEL SECURITY;

-- Admins can SELECT all info requests
CREATE POLICY "partner_info_requests_admin_select"
  ON public.partner_info_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can INSERT all info requests
CREATE POLICY "partner_info_requests_admin_insert"
  ON public.partner_info_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can UPDATE all info requests
CREATE POLICY "partner_info_requests_admin_update"
  ON public.partner_info_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can SELECT info requests for their own application
CREATE POLICY "partner_info_requests_user_select"
  ON public.partner_info_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_applications pa
      WHERE pa.id = application_id
        AND pa.user_id = auth.uid()
    )
  );
