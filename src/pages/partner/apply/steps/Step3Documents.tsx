import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  X,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import {
  useUploadDocument,
  useDeleteDocument,
  useDocumentSignedUrl,
} from '@/hooks/usePartnerApplication';
import {
  PartnerApplication,
  ApplicationDocument,
  DocumentType,
  DOCUMENT_LABELS,
  REQUIRED_DOCS_BY_ROLE,
} from '@/types/application';

interface Step3DocumentsProps {
  formData: Partial<PartnerApplication>;
  applicationId: string | null;
  onNext: () => void;
  onBack: () => void;
  documents: ApplicationDocument[];
}

const OPTIONAL_DOC_TYPES: DocumentType[] = ['lease_agreement', 'venue_photo_extra'];

const DOCUMENT_DESCRIPTIONS: Partial<Record<DocumentType, string>> = {
  business_registration: 'Official certificate proving your business is registered.',
  trade_license: 'Current operating / trade license from local authorities.',
  proof_of_address:
    'Utility bill or lease agreement showing your venue address (max 6 months old).',
  applicant_id: 'Government-issued photo ID (passport or national ID) for the applicant.',
  authorization_letter: 'Signed letter from the venue owner authorizing you to act on their behalf.',
  owner_id: 'Government-issued photo ID of the venue owner.',
  venue_photo: 'High-quality photo of the main entrance or interior of the venue.',
  lease_agreement: 'Signed lease agreement for the venue premises.',
  venue_photo_extra: 'Additional photos of the venue (interior, exterior, etc.).',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageDoc(doc: ApplicationDocument): boolean {
  return doc.mime_type?.startsWith('image/') ?? false;
}

// Sub-component: preview button with signed URL
function PreviewButton({ doc }: { doc: ApplicationDocument }) {
  const { data: signedUrl, isLoading } = useDocumentSignedUrl(doc.storage_path);

  if (!isImageDoc(doc)) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      disabled={isLoading || !signedUrl}
      className="h-8 border border-white/10 bg-white/5 px-2 text-muted-foreground hover:text-white"
    >
      <a href={signedUrl ?? '#'} target="_blank" rel="noopener noreferrer">
        <Eye className="h-3.5 w-3.5" />
      </a>
    </Button>
  );
}

// Sub-component: a single document card
function DocumentCard({
  docType,
  uploadedDoc,
  applicationId,
  userId,
  isRequired,
  isUploading,
  onUpload,
}: {
  docType: DocumentType;
  uploadedDoc: ApplicationDocument | undefined;
  applicationId: string;
  userId: string;
  isRequired: boolean;
  isUploading: boolean;
  onUpload: (file: File) => void;
}) {
  const deleteDocument = useDeleteDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const label = DOCUMENT_LABELS[docType];
  const description = DOCUMENT_DESCRIPTIONS[docType];

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only PDF, JPG, and PNG files are accepted.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File must be under 10 MB.';
    }
    return null;
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    onUpload(file);
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applicationId, userId, docType]
  );

  function handleDelete() {
    if (!uploadedDoc) return;
    deleteDocument.mutate({
      documentId: uploadedDoc.id,
      storagePath: uploadedDoc.storage_path,
      applicationId,
    });
  }

  return (
    <div
      className={[
        'rounded-xl border p-4 transition-colors',
        uploadedDoc
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-white/10 bg-white/5',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white text-sm">{label}</span>
            {isRequired ? (
              <Badge
                variant="outline"
                className={[
                  'text-xs',
                  uploadedDoc
                    ? 'border-green-500/40 text-green-400'
                    : 'border-red-500/40 text-red-400',
                ].join(' ')}
              >
                {uploadedDoc ? 'Uploaded' : 'Required'}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-white/20 text-xs text-muted-foreground"
              >
                Optional
              </Badge>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {uploadedDoc && (
          <CheckCircle className="h-5 w-5 shrink-0 text-green-400" />
        )}
      </div>

      {/* Uploaded file details */}
      {uploadedDoc && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm text-white">{uploadedDoc.file_name}</p>
              {uploadedDoc.file_size && (
                <p className="text-xs text-muted-foreground">
                  {formatBytes(uploadedDoc.file_size)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <PreviewButton doc={uploadedDoc} />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleteDocument.isPending}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
            >
              {deleteDocument.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Upload zone */}
      {!uploadedDoc && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={[
            'mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors',
            dragOver
              ? 'border-primary/60 bg-primary/10'
              : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5',
          ].join(' ')}
        >
          {isUploading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Uploading...</span>
            </div>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="text-primary">Click to browse</span> or drag &amp; drop
              </p>
              <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG — max 10 MB</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {fileError && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {fileError}
        </p>
      )}
    </div>
  );
}

export function Step3Documents({
  formData,
  applicationId,
  onNext,
  onBack,
  documents,
}: Step3DocumentsProps) {
  const { user } = useAuth();
  const uploadDocument = useUploadDocument();
  const [uploadingTypes, setUploadingTypes] = useState<Set<DocumentType>>(new Set());

  const role = formData.role_at_venue ?? 'owner';
  const requiredDocTypes: DocumentType[] = REQUIRED_DOCS_BY_ROLE[role] ?? REQUIRED_DOCS_BY_ROLE['owner'];

  // Find uploaded doc for a given type (latest one if multiple)
  function getUploadedDoc(docType: DocumentType): ApplicationDocument | undefined {
    return documents.find((d) => d.document_type === docType);
  }

  const uploadedRequiredCount = requiredDocTypes.filter(
    (dt) => !!getUploadedDoc(dt)
  ).length;

  const allRequiredUploaded = uploadedRequiredCount === requiredDocTypes.length;

  async function handleUpload(docType: DocumentType, file: File) {
    if (!applicationId || !user) return;
    setUploadingTypes((prev) => new Set(prev).add(docType));
    try {
      await uploadDocument.mutateAsync({
        applicationId,
        file,
        documentType: docType,
        userId: user.id,
      });
    } finally {
      setUploadingTypes((prev) => {
        const next = new Set(prev);
        next.delete(docType);
        return next;
      });
    }
  }

  // No application ID — shouldn't normally happen but guard gracefully
  if (!applicationId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Document Upload</h1>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
          <Info className="mx-auto mb-3 h-8 w-8 text-amber-400" />
          <p className="text-white font-medium">Complete steps 1 and 2 first</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please fill in your identity and venue information before uploading documents.
          </p>
          <Button
            variant="outline"
            onClick={onBack}
            className="mt-4 border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Upload the required documents so we can verify your venue.
        </p>
      </div>

      {/* Summary bar */}
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={[
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                allRequiredUploaded
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/10 text-white',
              ].join(' ')}
            >
              {uploadedRequiredCount}
            </div>
            <span className="text-sm text-muted-foreground">
              of {requiredDocTypes.length} required documents uploaded
            </span>
          </div>
          {allRequiredUploaded && (
            <div className="flex items-center gap-1.5 text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">All required docs uploaded</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{
              width: `${requiredDocTypes.length > 0
                ? (uploadedRequiredCount / requiredDocTypes.length) * 100
                : 0}%`,
            }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Required documents */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Required Documents
        </h2>
        <AnimatePresence mode="popLayout">
          {requiredDocTypes.map((docType) => (
            <motion.div
              key={docType}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <DocumentCard
                docType={docType}
                uploadedDoc={getUploadedDoc(docType)}
                applicationId={applicationId}
                userId={user?.id ?? ''}
                isRequired
                isUploading={uploadingTypes.has(docType)}
                onUpload={(file) => handleUpload(docType, file)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Optional documents */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Optional Documents
        </h2>
        {OPTIONAL_DOC_TYPES.map((docType) => (
          <DocumentCard
            key={docType}
            docType={docType}
            uploadedDoc={getUploadedDoc(docType)}
            applicationId={applicationId}
            userId={user?.id ?? ''}
            isRequired={false}
            isUploading={uploadingTypes.has(docType)}
            onUpload={(file) => handleUpload(docType, file)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
        >
          Back
        </Button>

        {allRequiredUploaded ? (
          <Button
            onClick={onNext}
            className="bg-primary px-8 text-white hover:bg-primary/90"
          >
            Continue to Review
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  disabled
                  className="cursor-not-allowed bg-primary/40 px-8 text-white/50"
                >
                  Continue to Review
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-[hsl(240_10%_8%)] border-white/10 text-white">
              Upload all required documents to continue
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
