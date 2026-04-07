-- Migration: Fix partner application RLS for submission flow
-- Date: 2026-04-07
--
-- Fixes two RLS issues that blocked the applicant submission flow:
--
-- 1. partner_applications_user_update WITH CHECK was checking the new row's
--    status, so setting status='submitted' was rejected because 'submitted' is
--    not in ('draft','needs_more_information'). Fix: allow 'submitted' as a
--    valid destination status in WITH CHECK while keeping the USING guard so
--    users can only update rows that are currently draft or needs_more_information.
--
-- 2. partner_review_logs had no INSERT policy for regular users, so the
--    application_submitted log entry written by useSubmitApplication was blocked.
--    Fix: add a policy that lets applicants insert log entries for their own
--    applications when acting as 'applicant'.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Replace user update policy on partner_applications
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "partner_applications_user_update" ON public.partner_applications;

CREATE POLICY "partner_applications_user_update"
  ON public.partner_applications
  FOR UPDATE
  TO authenticated
  USING (
    -- Can only UPDATE rows that are currently editable
    user_id = auth.uid()
    AND status IN ('draft', 'needs_more_information')
  )
  WITH CHECK (
    -- New row must still belong to the same user, and status may be
    -- draft (save), needs_more_information (save), or submitted (final submit)
    user_id = auth.uid()
    AND status IN ('draft', 'needs_more_information', 'submitted')
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Allow applicants to insert their own review log entries
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY "partner_review_logs_applicant_insert"
  ON public.partner_review_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_type = 'applicant'
    AND actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.partner_applications pa
      WHERE pa.id = application_id
        AND pa.user_id = auth.uid()
    )
  );
