import { useState } from 'react';
import { Star, Pencil, Trash2, MessageSquare, ThumbsUp, AlertCircle, RefreshCw } from 'lucide-react';
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
import { useVenueReviews, useMyReview, useUpsertReview, useDeleteReview, VenueReview } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface ReviewSectionProps {
  venueId: string;
}

// Clickable star rating component
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
  const cls = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-6 w-6';

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hovered ? star <= hovered : star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            disabled={!onChange}
            className={`transition-transform ${onChange ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
          >
            <Star
              className={`${cls} transition-colors ${
                filled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

// Rating breakdown bar (e.g. Yelp style)
function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground w-4 text-right">{label}</span>
      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-muted-foreground w-6 text-right">{count}</span>
    </div>
  );
}

// Single review card
function ReviewCard({
  review,
  isOwn,
  onEdit,
  onDelete,
}: {
  review: VenueReview;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const authorName = review.profiles?.full_name || 'Anonymous';
  const initials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="card-dark rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            {review.profiles?.avatar_url ? (
              <img
                src={review.profiles.avatar_url}
                alt={authorName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-primary">{initials}</span>
            )}
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">{authorName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StarPicker value={review.rating} size="sm" />
          {isOwn && (
            <div className="flex gap-1 ml-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete review?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove your review.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={onDelete}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      {review.comment && (
        <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
      )}

      {review.helpful_count > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ThumbsUp className="h-3 w-3" />
          <span>{review.helpful_count} found this helpful</span>
        </div>
      )}
    </div>
  );
}

// Write/Edit review form
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
  const upsert = useUpsertReview();

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
        existingId: existingReview?.id,
      });
      toast.success(existingReview ? 'Review updated!' : 'Review submitted! Thanks for your feedback.');
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review');
    }
  };

  const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <form onSubmit={handleSubmit} className="card-dark rounded-xl p-5 space-y-4 border border-primary/20">
      <h4 className="font-semibold text-foreground">
        {existingReview ? 'Edit your review' : 'Write a review'}
      </h4>

      {/* Star picker */}
      <div className="space-y-1">
        <StarPicker value={rating} onChange={setRating} size="lg" />
        {rating > 0 && (
          <p className="text-sm text-primary font-medium">{RATING_LABELS[rating]}</p>
        )}
      </div>

      {/* Comment */}
      <Textarea
        placeholder="Share your experience — what did you like or dislike? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="resize-none"
      />

      <div className="flex gap-2">
        <Button type="submit" disabled={upsert.isPending} className="gradient-primary border-0">
          {upsert.isPending ? 'Saving…' : existingReview ? 'Update' : 'Submit Review'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Main ReviewSection
export function ReviewSection({ venueId }: ReviewSectionProps) {
  const { user } = useAuth();
  const { data: reviews = [], isLoading, isError, refetch } = useVenueReviews(venueId);
  const { data: myReview } = useMyReview(venueId);
  const deleteReview = useDeleteReview();

  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<VenueReview | null>(null);

  // Rating breakdown
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const handleEdit = (review: VenueReview) => {
    setEditingReview(review);
    setShowForm(true);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <div className="card-dark rounded-xl p-5 flex flex-col sm:flex-row gap-6 items-center">
          {/* Big average */}
          <div className="text-center flex-shrink-0">
            <div className="text-5xl font-display font-bold text-foreground">
              {avgRating.toFixed(1)}
            </div>
            <StarPicker value={Math.round(avgRating)} size="sm" />
            <p className="text-xs text-muted-foreground mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
          </div>
          {/* Breakdown bars */}
          <div className="flex-1 w-full space-y-1.5">
            {ratingCounts.map(({ star, count }) => (
              <RatingBar key={star} label={String(star)} count={count} total={reviews.length} />
            ))}
          </div>
        </div>
      )}

      {/* Write / Edit form */}
      {showForm && (
        <ReviewForm
          venueId={venueId}
          existingReview={editingReview}
          onDone={handleFormDone}
        />
      )}

      {/* Not logged in prompt */}
      {!user && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Sign in to leave a review</p>
        </div>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card-dark rounded-xl p-5 h-24 animate-pulse bg-secondary/50" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-10 card-dark rounded-xl space-y-3">
          <AlertCircle className="h-10 w-10 mx-auto text-destructive/60" />
          <p className="text-muted-foreground text-sm">Failed to load reviews.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm">Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              isOwn={user?.id === review.user_id}
              onEdit={() => handleEdit(review)}
              onDelete={() => handleDelete(review)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
