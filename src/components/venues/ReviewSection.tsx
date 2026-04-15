import { useState, useRef } from 'react';
import {
  Star, Pencil, Trash2, MessageSquare, ThumbsUp, AlertCircle, RefreshCw,
  Camera, X, Reply, Send, ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  useVenueReviews, useMyReview, useUpsertReview, useDeleteReview,
  useCreateReply, useDeleteReply, useToggleHelpful,
  VenueReview, ReviewReply,
} from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface ReviewSectionProps {
  venueId: string;
}

// ─── Star Picker ──────────────────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);
  const cls = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hovered ? star <= hovered : star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            onMouseEnter={() => onChange && setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            disabled={!onChange}
            className={`transition-transform ${onChange ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
          >
            <Star
              className={cn(
                cls,
                'transition-colors',
                filled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

// ─── Rating Bar ───────────────────────────────────────────────────────────────

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground w-4 text-right">{label}</span>
      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-yellow-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-muted-foreground w-6 text-right">{count}</span>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  src,
  size = 'md',
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md';
}) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const cls = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-10 h-10 text-xs';
  return (
    <div
      className={cn(
        cls,
        'rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-border/50'
      )}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-primary">{initials}</span>
      )}
    </div>
  );
}

// ─── Reply Card ───────────────────────────────────────────────────────────────

function ReplyCard({
  reply,
  isOwn,
  onDelete,
}: {
  reply: ReviewReply;
  isOwn: boolean;
  onDelete: () => void;
}) {
  const authorName = reply.profiles?.full_name || 'Anonymous';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex gap-2.5 py-2"
    >
      <Avatar name={authorName} src={reply.profiles?.avatar_url} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{authorName}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
          </span>
          {isOwn && (
            <button
              onClick={onDelete}
              className="text-muted-foreground/60 hover:text-red-400 transition-colors ml-auto"
              aria-label="Delete reply"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed break-words">{reply.body}</p>
      </div>
    </motion.div>
  );
}

// ─── Inline Reply Form ────────────────────────────────────────────────────────

function InlineReplyForm({
  reviewId,
  venueId,
  onClose,
}: {
  reviewId: string;
  venueId: string;
  onClose: () => void;
}) {
  const [body, setBody] = useState('');
  const createReply = useCreateReply();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      await createReply.mutateAsync({ reviewId, venueId, body: trimmed });
      setBody('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('[reply submit]', err);
      toast.error('Failed to post reply. Please try again.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="flex gap-2 pt-2">
        <input
          ref={inputRef}
          autoFocus
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Write a reply..."
          className="flex-1 text-xs bg-secondary/60 border border-border rounded-full px-4 py-2 outline-none focus:border-primary/50 focus:bg-secondary text-foreground placeholder:text-muted-foreground transition-colors"
        />
        <Button
          size="icon"
          className="h-8 w-8 flex-shrink-0 gradient-primary border-0 rounded-full"
          disabled={!body.trim() || createReply.isPending}
          onClick={handleSubmit}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  venueId,
  isOwn,
  isLoggedIn,
  onEdit,
  onDelete,
}: {
  review: VenueReview;
  venueId: string;
  isOwn: boolean;
  isLoggedIn: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const toggleHelpful = useToggleHelpful();
  const deleteReply = useDeleteReply();
  const { user } = useAuth();

  const authorName = review.profiles?.full_name || 'Anonymous';
  const hasReplies = (review.replies?.length ?? 0) > 0;

  const handleHelpful = async () => {
    if (!isLoggedIn) { toast.error('Sign in to vote'); return; }
    try {
      await toggleHelpful.mutateAsync({ reviewId: review.id, venueId });
    } catch (err) {
      console.error('[helpful]', err);
      toast.error('Failed to update vote. Please try again.');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      await deleteReply.mutateAsync({ replyId, venueId });
    } catch (err) {
      console.error('[delete reply]', err);
      toast.error('Failed to delete reply');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-dark rounded-2xl p-5 space-y-3 hover:ring-1 hover:ring-primary/20 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={authorName} src={review.profiles?.avatar_url} />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{authorName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <StarPicker value={review.rating} size="sm" />
              <span className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {isOwn && (
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Edit review">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" aria-label="Delete review">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete review?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently remove your review and any replies.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
          {review.comment}
        </p>
      )}

      {/* Photos */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {review.images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(img)}
              className="group relative rounded-lg overflow-hidden border border-border/50 hover:border-primary/60 transition-all"
            >
              <img
                src={img}
                alt={`Review photo ${i + 1}`}
                className="w-20 h-20 object-cover group-hover:scale-105 transition-transform"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightbox}
              alt="Review photo"
              className="max-w-full max-h-full rounded-xl object-contain"
            />
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-sm transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1">
        <button
          onClick={handleHelpful}
          disabled={toggleHelpful.isPending}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all',
            review.user_has_voted_helpful
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <ThumbsUp className={cn('h-3.5 w-3.5 transition-all', review.user_has_voted_helpful && 'fill-primary')} />
          <span>Useful</span>
          {review.helpful_count > 0 && (
            <span className={cn(
              'tabular-nums',
              review.user_has_voted_helpful ? 'text-primary' : 'text-muted-foreground'
            )}>
              · {review.helpful_count}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            if (!isLoggedIn) { toast.error('Sign in to reply'); return; }
            setShowReplyForm(v => !v);
          }}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all',
            showReplyForm
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <Reply className="h-3.5 w-3.5" />
          <span>Reply</span>
          {hasReplies && (
            <span className="text-muted-foreground tabular-nums">· {review.replies!.length}</span>
          )}
        </button>
      </div>

      {/* Replies */}
      {hasReplies && (
        <div className="border-l-2 border-border/40 pl-3 ml-2 space-y-0">
          <AnimatePresence initial={false}>
            {review.replies!.map(reply => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                isOwn={user?.id === reply.user_id}
                onDelete={() => handleDeleteReply(reply.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Reply form */}
      <AnimatePresence>
        {showReplyForm && (
          <InlineReplyForm
            reviewId={review.id}
            venueId={venueId}
            onClose={() => setShowReplyForm(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Review Form (Write/Edit) ─────────────────────────────────────────────────

function ReviewForm({
  venueId,
  existingReview,
  onDone,
}: {
  venueId: string;
  existingReview?: VenueReview | null;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? '');
  const [imageUrls, setImageUrls] = useState<string[]>(existingReview?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upsert = useUpsertReview();

  const RATING_LABELS = ['Tap a star', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Limit total to 6 photos
    if (imageUrls.length + files.length > 6) {
      toast.error('You can upload up to 6 photos');
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      // Client-side size check (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `review-photos/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('venue-images')
        .upload(path, file, { contentType: file.type, cacheControl: '3600' });

      if (error) {
        console.error('[upload]', error);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from('venue-images').getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    setImageUrls(prev => [...prev, ...newUrls]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (newUrls.length > 0) toast.success(`${newUrls.length} photo${newUrls.length !== 1 ? 's' : ''} added`);
  };

  const removeImage = (idx: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a star rating');
      return;
    }

    try {
      await upsert.mutateAsync({
        venueId,
        rating,
        comment,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        existingId: existingReview?.id,
      });
      toast.success(existingReview ? 'Review updated!' : 'Review submitted! Thanks for your feedback.');
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review');
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="card-dark rounded-2xl p-5 space-y-4 border border-primary/30 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground">
          {existingReview ? 'Edit your review' : 'Write a review'}
        </h4>
        <button
          type="button"
          onClick={onDone}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Star picker */}
      <div className="space-y-1.5">
        <StarPicker value={rating} onChange={setRating} size="lg" />
        <p className={cn(
          'text-sm font-medium transition-colors',
          rating > 0 ? 'text-primary' : 'text-muted-foreground'
        )}>
          {RATING_LABELS[rating]}
        </p>
      </div>

      {/* Comment */}
      <Textarea
        placeholder="Share your experience — what did you like or dislike?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        className="resize-none text-sm"
        maxLength={2000}
      />
      <div className="flex justify-end -mt-2">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {comment.length}/2000
        </span>
      </div>

      {/* Photo upload */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={uploading || imageUrls.length >= 6}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5 mr-1.5" />
                Add Photos
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
          <span className="text-[11px] text-muted-foreground">
            {imageUrls.length}/6 photos
          </span>
        </div>

        {imageUrls.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {imageUrls.map((url, i) => (
              <motion.div
                key={url}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group"
              >
                <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={upsert.isPending || uploading || rating === 0}
          className="gradient-primary border-0 flex-1 sm:flex-initial"
        >
          {upsert.isPending ? 'Saving…' : existingReview ? 'Update Review' : 'Submit Review'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={upsert.isPending}>
          Cancel
        </Button>
      </div>
    </motion.form>
  );
}

// ─── Main ReviewSection ───────────────────────────────────────────────────────

export function ReviewSection({ venueId }: ReviewSectionProps) {
  const { user } = useAuth();
  const { data: reviews = [], isLoading, isError, refetch } = useVenueReviews(venueId);
  const { data: myReview } = useMyReview(venueId);
  const deleteReview = useDeleteReview();

  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<VenueReview | null>(null);
  const [sort, setSort] = useState<'recent' | 'helpful' | 'rating'>('recent');

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sort === 'helpful') return (b.helpful_count ?? 0) - (a.helpful_count ?? 0);
    if (sort === 'rating') return b.rating - a.rating;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  const photoCount = reviews.reduce((sum, r) => sum + (r.images?.length ?? 0), 0);

  const handleEdit = (review: VenueReview) => {
    setEditingReview(review);
    setShowForm(true);
    // Scroll to form
    requestAnimationFrame(() => {
      window.scrollTo({ top: window.scrollY - 50, behavior: 'smooth' });
    });
  };

  const handleDelete = async (review: VenueReview) => {
    try {
      await deleteReview.mutateAsync({ reviewId: review.id, venueId });
      toast.success('Review deleted');
    } catch {
      toast.error('Failed to delete review');
    }
  };

  const handleFormDone = () => {
    setShowForm(false);
    setEditingReview(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-display font-semibold text-xl flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Reviews
          {reviews.length > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {reviews.length}
            </Badge>
          )}
        </h3>

        {user && !myReview && !showForm && (
          <Button
            size="sm"
            className="gradient-primary border-0"
            onClick={() => { setEditingReview(null); setShowForm(true); }}
          >
            <Star className="h-4 w-4 mr-1.5" />
            Write a Review
          </Button>
        )}
        {user && myReview && !showForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(myReview)}
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            Edit My Review
          </Button>
        )}
      </div>

      {/* Rating summary */}
      {reviews.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-dark rounded-2xl p-5 flex flex-col sm:flex-row gap-6 items-center"
        >
          <div className="text-center flex-shrink-0">
            <div className="text-5xl font-display font-bold text-foreground leading-none">
              {avgRating.toFixed(1)}
            </div>
            <div className="mt-2 flex justify-center">
              <StarPicker value={Math.round(avgRating)} size="sm" />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              {photoCount > 0 && (
                <> · <ImageIcon className="inline h-3 w-3 -mt-0.5" /> {photoCount}</>
              )}
            </p>
          </div>
          <div className="flex-1 w-full space-y-1.5">
            {ratingCounts.map(({ star, count }) => (
              <RatingBar key={star} label={String(star)} count={count} total={reviews.length} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <ReviewForm
            venueId={venueId}
            existingReview={editingReview}
            onDone={handleFormDone}
          />
        )}
      </AnimatePresence>

      {/* Not logged in */}
      {!user && (
        <div className="text-center py-6 text-muted-foreground text-sm card-dark rounded-2xl">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Sign in to leave a review or reply</p>
        </div>
      )}

      {/* Sort bar */}
      {reviews.length > 1 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Sort:</span>
          {(['recent', 'helpful', 'rating'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setSort(opt)}
              className={cn(
                'px-3 py-1 rounded-full font-medium capitalize transition-all',
                sort === opt
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              {opt === 'recent' ? 'Most recent' : opt === 'helpful' ? 'Most useful' : 'Highest rated'}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card-dark rounded-2xl p-5 h-28 animate-pulse bg-secondary/30" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-10 card-dark rounded-2xl space-y-3">
          <AlertCircle className="h-10 w-10 mx-auto text-destructive/60" />
          <p className="text-muted-foreground text-sm">Failed to load reviews.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 card-dark rounded-2xl text-muted-foreground">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm mt-1">Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {sortedReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                venueId={venueId}
                isOwn={user?.id === review.user_id}
                isLoggedIn={!!user}
                onEdit={() => handleEdit(review)}
                onDelete={() => handleDelete(review)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
