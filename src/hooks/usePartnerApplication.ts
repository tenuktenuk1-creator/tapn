/**
 * usePartnerApplication.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React Query hooks for the partner application system.
 *
 * Tables touched:
 *   partner_applications, partner_application_documents,
 *   partner_verification_checks, partner_review_logs,
 *   partner_info_requests, user_roles
 *
 * Storage bucket: partner-documents
 *
 * NOTE: partner_applications is NOT yet in the Supabase generated types, so
 * every query against it uses `(supabase as any).from(...)` to satisfy TS.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  PartnerApplication,
  ApplicationDocument,
  VerificationChecks,
  ReviewLog,
  InfoRequest,
  DocumentType,
  getMissingRequirements,
  computeCompletenessScore,
  computeFraudFlags,
  computeRiskLevel,
} from '@/types/application';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Typed shorthand so every call doesn't repeat the cast. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase as any);

// ─── 1. useMyApplication ──────────────────────────────────────────────────────

/**
 * Fetches the current user's most recent non-withdrawn partner application,
 * together with its associated documents.
 *
 * @returns `{ data: PartnerApplication | null, isLoading, refetch }`
 */
export function useMyApplication() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-partner-application', user?.id],
    queryFn: async (): Promise<PartnerApplication | null> => {
      if (!user) return null;

      // Fetch most recent non-withdrawn application
      const { data: appData, error: appError } = await db
        .from('partner_applications')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'withdrawn')
        .order('created_at', { ascending: false })
        .limit(1);

      if (appError) throw appError;

      const app = appData?.[0] as PartnerApplication | undefined;
      if (!app) return null;

      // Fetch associated documents
      const { data: docsData, error: docsError } = await db
        .from('partner_application_documents')
        .select('*')
        .eq('application_id', app.id)
        .order('uploaded_at', { ascending: false });

      if (docsError) throw docsError;

      return {
        ...app,
        documents: (docsData ?? []) as ApplicationDocument[],
      };
    },
    enabled: !!user,
  });
}

// ─── 2. useUpsertDraft ────────────────────────────────────────────────────────

/**
 * Creates or updates a partner application draft.
 *
 * - When `applicationId` is null, INSERTs a new row with `status: 'draft'`.
 * - When `applicationId` is set, UPDATEs the existing row (only while draft).
 *
 * @param applicationId - The existing application's id, or null to create one.
 * @returns A mutation whose `mutate` function accepts `Partial<PartnerApplication>`
 *   and resolves to the application id.
 */
export function useUpsertDraft(applicationId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<PartnerApplication>): Promise<string> => {
      if (!user) throw new Error('Not authenticated');

      // Strip relational/computed fields that are not DB columns — these come from
      // useMyApplication merging joined relations into the PartnerApplication object.
      const {
        documents: _documents,
        verification_checks: _vc,
        review_logs: _rl,
        info_requests: _ir,
        document_count: _dc,
        ...dbData
      } = data;

      if (!applicationId) {
        // INSERT a new draft
        const { data: inserted, error } = await db
          .from('partner_applications')
          .insert({
            ...dbData,
            user_id: user.id,
            status: 'draft',
          })
          .select('id')
          .single();

        if (error) throw new Error(error.message ?? JSON.stringify(error));
        return (inserted as { id: string }).id;
      }

      // UPDATE existing draft
      const { data: updated, error } = await db
        .from('partner_applications')
        .update({
          ...dbData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .eq('user_id', user.id)
        .select('id')
        .single();

      if (error) throw new Error(error.message ?? JSON.stringify(error));
      return (updated as { id: string }).id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-partner-application', user?.id] });
    },
    onError: (error: Error) => {
      toast.error(`Draft save failed: ${error.message}`);
    },
  });
}

// ─── 3. useSubmitApplication ──────────────────────────────────────────────────

/**
 * Final submission hook. Validates the application for completeness before
 * marking it as submitted. Computes fraud flags and risk level at submission
 * time and persists them.
 *
 * Throws (and shows a toast) when there are missing requirements.
 */
export function useSubmitApplication() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (applicationId: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      // Fetch the full application
      const { data: appData, error: appError } = await db
        .from('partner_applications')
        .select('*')
        .eq('id', applicationId)
        .eq('user_id', user.id)
        .single();

      if (appError) throw appError;
      const app = appData as PartnerApplication;

      // Fetch its documents
      const { data: docsData, error: docsError } = await db
        .from('partner_application_documents')
        .select('*')
        .eq('application_id', applicationId);

      if (docsError) throw docsError;
      const docs = (docsData ?? []) as ApplicationDocument[];

      // Validate
      const missing = getMissingRequirements(app, docs);
      if (missing.length > 0) {
        const firstLabel =
          typeof missing[0] === 'string'
            ? missing[0]
            : (missing[0] as { label: string }).label;
        throw new Error(`Missing: ${firstLabel}`);
      }

      // Compute derived fields
      const completenessScore = computeCompletenessScore(app, docs);
      const fraudFlags = computeFraudFlags(app);
      const riskLevel = computeRiskLevel(fraudFlags);

      const now = new Date().toISOString();

      // Update application status
      const { error: updateError } = await db
        .from('partner_applications')
        .update({
          status: 'submitted',
          submitted_at: now,
          completeness_score: completenessScore,
          fraud_flags: fraudFlags,
          risk_level: riskLevel,
          updated_at: now,
        })
        .eq('id', applicationId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Insert review log
      const { error: logError } = await db
        .from('partner_review_logs')
        .insert({
          application_id: applicationId,
          event_type: 'application_submitted',
          actor_type: 'applicant',
          actor_id: user.id,
          new_status: 'submitted',
          metadata: { completeness_score: completenessScore },
          created_at: now,
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-partner-application', user?.id] });
      toast.success('Application submitted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─── 4. useUploadDocument ─────────────────────────────────────────────────────

interface UploadDocumentInput {
  applicationId: string;
  file: File;
  documentType: DocumentType;
  userId: string;
}

/**
 * Uploads a document file to Supabase Storage and inserts a record into
 * `partner_application_documents`.
 *
 * Storage path: `partner-documents/{userId}/{applicationId}/{documentType}/{file.name}`
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      file,
      documentType,
      userId,
    }: UploadDocumentInput): Promise<ApplicationDocument> => {
      const storagePath = `${userId}/${applicationId}/${documentType}/${file.name}`;

      // Upload to storage
      const { error: storageError } = await supabase.storage
        .from('partner-documents')
        .upload(storagePath, file, { upsert: true });

      if (storageError) throw storageError;

      const now = new Date().toISOString();

      // Insert document record (store path, not URL)
      const { data: docData, error: dbError } = await db
        .from('partner_application_documents')
        .insert({
          application_id: applicationId,
          user_id: userId,
          document_type: documentType,
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_at: now,
        })
        .select('*')
        .single();

      if (dbError) throw dbError;

      return docData as ApplicationDocument;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-partner-application'] });
      queryClient.invalidateQueries({
        queryKey: ['application-documents-' + variables.applicationId],
      });
      toast.success('Document uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

// ─── 5. useDeleteDocument ─────────────────────────────────────────────────────

interface DeleteDocumentInput {
  documentId: string;
  storagePath: string;
  applicationId: string;
}

/**
 * Removes a document from Supabase Storage and deletes its database record.
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      storagePath,
    }: DeleteDocumentInput): Promise<void> => {
      // Remove from storage
      const { error: storageError } = await supabase.storage
        .from('partner-documents')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete DB record
      const { error: dbError } = await db
        .from('partner_application_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-partner-application'] });
      toast.success('Document removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove document: ${error.message}`);
    },
  });
}

// ─── 6. useDocumentSignedUrl ──────────────────────────────────────────────────

/**
 * Returns a temporary signed URL (valid for 1 hour) for viewing a stored
 * document. The URL is cached for 30 minutes before re-fetching.
 *
 * @param storagePath - The path returned by `useUploadDocument`, or null.
 */
export function useDocumentSignedUrl(storagePath: string | null) {
  return useQuery({
    queryKey: ['doc-signed-url', storagePath],
    queryFn: async (): Promise<string> => {
      if (!storagePath) throw new Error('No storage path provided');

      const { data, error } = await supabase.storage
        .from('partner-documents')
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Could not generate signed URL');

      return data.signedUrl;
    },
    enabled: !!storagePath,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// ─── 7. useAdminApplications ──────────────────────────────────────────────────

/**
 * Admin queue: fetches all non-draft, non-withdrawn applications, optionally
 * filtered by status. Includes document count via a joined select.
 *
 * @param statusFilter - 'all' or a specific `ApplicationStatus`.
 */
export function useAdminApplications(statusFilter: string) {
  return useQuery({
    queryKey: ['admin-applications', statusFilter],
    queryFn: async (): Promise<PartnerApplication[]> => {
      let query = db
        .from('partner_applications')
        .select('*, partner_application_documents(id)')
        .neq('status', 'draft')
        .neq('status', 'withdrawn')
        .order('submitted_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as Record<string, unknown>[]).map((row) => {
        const docs = (row['partner_application_documents'] as { id: string }[]) ?? [];
        const { partner_application_documents: _docs, ...appFields } = row;
        return {
          ...appFields,
          document_count: docs.length,
        } as PartnerApplication;
      });
    },
  });
}

// ─── 8. useAdminApplicationDetail ────────────────────────────────────────────

/**
 * Fetches full detail for a single application including all joined relations:
 * documents, verification checklist, review logs and info requests.
 *
 * @param applicationId - The application id to load, or null (query disabled).
 */
export function useAdminApplicationDetail(applicationId: string | null) {
  return useQuery({
    queryKey: ['admin-application-detail', applicationId],
    queryFn: async (): Promise<PartnerApplication | null> => {
      if (!applicationId) return null;

      const { data, error } = await db
        .from('partner_applications')
        .select(
          '*, partner_application_documents(*), partner_verification_checks(*), partner_review_logs(*), partner_info_requests(*)'
        )
        .eq('id', applicationId)
        .single();

      if (error) throw error;
      if (!data) return null;

      const row = data as Record<string, unknown>;

      return {
        ...row,
        documents: (row['partner_application_documents'] as ApplicationDocument[]) ?? [],
        verification_checks:
          ((row['partner_verification_checks'] as VerificationChecks[]) ?? [])[0] ?? null,
        review_logs: (row['partner_review_logs'] as ReviewLog[]) ?? [],
        info_requests: (row['partner_info_requests'] as InfoRequest[]) ?? [],
      } as PartnerApplication;
    },
    enabled: !!applicationId,
  });
}

// ─── 9. useAdminUpdateStatus ──────────────────────────────────────────────────

interface AdminUpdateStatusInput {
  applicationId: string;
  action: 'approve' | 'reject' | 'request_info' | 'start_review';
  rejectionReason?: string;
  rejectionNotes?: string;
  requestedItems?: string[];
  message?: string;
  adminId: string;
}

/**
 * Executes admin status transitions on an application:
 * - `approve`      — marks approved, upgrades user role to 'partner'.
 * - `reject`       — marks rejected with optional reason; sets reapply_after +30d.
 * - `request_info` — sets `needs_more_information`, creates an info request.
 * - `start_review` — assigns the application to the admin and begins verification.
 *
 * All transitions insert a corresponding row into `partner_review_logs`.
 */
export function useAdminUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      action,
      rejectionReason,
      rejectionNotes,
      requestedItems,
      message,
      adminId,
    }: AdminUpdateStatusInput): Promise<void> => {
      const now = new Date().toISOString();

      if (action === 'approve') {
        // Update application
        const { data: appData, error: appError } = await db
          .from('partner_applications')
          .update({ status: 'approved', approved_at: now, updated_at: now })
          .eq('id', applicationId)
          .select('user_id')
          .single();

        if (appError) throw appError;
        const userId = (appData as { user_id: string }).user_id;

        // Upgrade user role to partner
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({ user_id: userId, role: 'partner' }, { onConflict: 'user_id' });

        if (roleError) throw roleError;

        // Review log: approved
        const { error: logError1 } = await db
          .from('partner_review_logs')
          .insert({
            application_id: applicationId,
            event_type: 'application_approved',
            actor_type: 'admin',
            actor_id: adminId,
            new_status: 'approved',
            metadata: {},
            created_at: now,
          });

        if (logError1) throw logError1;

        // Review log: role upgraded
        const { error: logError2 } = await db
          .from('partner_review_logs')
          .insert({
            application_id: applicationId,
            event_type: 'role_upgraded',
            actor_type: 'admin',
            actor_id: adminId,
            new_status: 'approved',
            metadata: { role: 'partner', user_id: userId },
            created_at: now,
          });

        if (logError2) throw logError2;

      } else if (action === 'reject') {
        const reapplyAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error: appError } = await db
          .from('partner_applications')
          .update({
            status: 'rejected',
            rejected_at: now,
            rejection_reason: rejectionReason ?? null,
            rejection_notes: rejectionNotes ?? null,
            reapply_after: reapplyAfter,
            updated_at: now,
          })
          .eq('id', applicationId);

        if (appError) throw appError;

        const { error: logError } = await db
          .from('partner_review_logs')
          .insert({
            application_id: applicationId,
            event_type: 'application_rejected',
            actor_type: 'admin',
            actor_id: adminId,
            new_status: 'rejected',
            metadata: {
              rejection_reason: rejectionReason ?? null,
              rejection_notes: rejectionNotes ?? null,
            },
            created_at: now,
          });

        if (logError) throw logError;

      } else if (action === 'request_info') {
        // Update application status
        const { error: appError } = await db
          .from('partner_applications')
          .update({ status: 'needs_more_information', updated_at: now })
          .eq('id', applicationId);

        if (appError) throw appError;

        // Insert info request
        const { error: infoError } = await db
          .from('partner_info_requests')
          .insert({
            application_id: applicationId,
            requested_items: requestedItems ?? [],
            message_to_applicant: message ?? null,
            sent_by: adminId,
            sent_at: now,
          });

        if (infoError) throw infoError;

        // Review log
        const { error: logError } = await db
          .from('partner_review_logs')
          .insert({
            application_id: applicationId,
            event_type: 'info_requested',
            actor_type: 'admin',
            actor_id: adminId,
            new_status: 'needs_more_information',
            metadata: { requested_items: requestedItems ?? [], message: message ?? null },
            created_at: now,
          });

        if (logError) throw logError;

      } else if (action === 'start_review') {
        const { error: appError } = await db
          .from('partner_applications')
          .update({
            status: 'under_verification',
            assigned_to: adminId,
            updated_at: now,
          })
          .eq('id', applicationId);

        if (appError) throw appError;

        const { error: logError } = await db
          .from('partner_review_logs')
          .insert({
            application_id: applicationId,
            event_type: 'review_started',
            actor_type: 'admin',
            actor_id: adminId,
            new_status: 'under_verification',
            metadata: { assigned_to: adminId },
            created_at: now,
          });

        if (logError) throw logError;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
      queryClient.invalidateQueries({
        queryKey: ['admin-application-detail', variables.applicationId],
      });

      const messages: Record<string, string> = {
        approve: 'Application approved and partner role granted',
        reject: 'Application rejected',
        request_info: 'Information request sent to applicant',
        start_review: 'Review started',
      };
      toast.success(messages[variables.action] ?? 'Status updated');
    },
    onError: (error: Error) => {
      toast.error(`Action failed: ${error.message}`);
    },
  });
}

// ─── 10. useAdminUpdateChecklist ──────────────────────────────────────────────

interface AdminUpdateChecklistInput {
  applicationId: string;
  checks: Partial<VerificationChecks>;
  adminId: string;
}

/**
 * Upserts the verification checklist for an application and logs the update.
 *
 * @param input.applicationId - The target application.
 * @param input.checks        - Partial checklist fields to save.
 * @param input.adminId       - The admin performing the update.
 */
export function useAdminUpdateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      checks,
      adminId,
    }: AdminUpdateChecklistInput): Promise<void> => {
      const now = new Date().toISOString();

      // Upsert checklist
      const { error: checklistError } = await db
        .from('partner_verification_checks')
        .upsert(
          {
            ...checks,
            application_id: applicationId,
            updated_by: adminId,
            updated_at: now,
          },
          { onConflict: 'application_id' }
        );

      if (checklistError) throw checklistError;

      // Log the update
      const { error: logError } = await db
        .from('partner_review_logs')
        .insert({
          application_id: applicationId,
          event_type: 'checklist_updated',
          actor_type: 'admin',
          actor_id: adminId,
          new_status: null,
          metadata: checks as Record<string, unknown>,
          created_at: now,
        });

      if (logError) throw logError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin-application-detail', variables.applicationId],
      });
      toast.success('Verification checklist saved');
    },
    onError: (error: Error) => {
      toast.error(`Checklist update failed: ${error.message}`);
    },
  });
}

// ─── 11. useAdminAddNote ──────────────────────────────────────────────────────

interface AdminAddNoteInput {
  applicationId: string;
  note: string;
  adminId: string;
}

/**
 * Inserts an internal admin note into the review log for an application.
 *
 * @param input.applicationId - The target application.
 * @param input.note          - The note text to record.
 * @param input.adminId       - The admin adding the note.
 */
export function useAdminAddNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      note,
      adminId,
    }: AdminAddNoteInput): Promise<void> => {
      const { error } = await db
        .from('partner_review_logs')
        .insert({
          application_id: applicationId,
          event_type: 'note_added',
          actor_type: 'admin',
          actor_id: adminId,
          new_status: null,
          metadata: { note },
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin-application-detail', variables.applicationId],
      });
      toast.success('Note added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add note: ${error.message}`);
    },
  });
}
