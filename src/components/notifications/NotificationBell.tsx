import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Calendar,
  Building2,
  UserCheck,
  UserX,
  CheckCircle,
  XCircle,
  AlertCircle,
  Inbox,
  Loader2,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  type Notification,
} from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

// ─── Icon map per notification type ─────────────────────────────────────────

const TYPE_META: Record<
  string,
  { Icon: React.ElementType; color: string; bg: string }
> = {
  booking_confirmed: { Icon: CheckCircle,  color: 'text-green-400',  bg: 'bg-green-500/10'  },
  booking_rejected:  { Icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-500/10'    },
  booking_cancelled: { Icon: AlertCircle,  color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
  booking_received:  { Icon: Calendar,     color: 'text-primary',    bg: 'bg-primary/10'    },
  partner_approved:  { Icon: UserCheck,    color: 'text-green-400',  bg: 'bg-green-500/10'  },
  partner_rejected:  { Icon: UserX,        color: 'text-red-400',    bg: 'bg-red-500/10'    },
  partner_submitted: { Icon: UserCheck,    color: 'text-primary',    bg: 'bg-primary/10'    },
  venue_approved:    { Icon: Building2,    color: 'text-green-400',  bg: 'bg-green-500/10'  },
  venue_rejected:    { Icon: Building2,    color: 'text-red-400',    bg: 'bg-red-500/10'    },
  venue_submitted:   { Icon: Building2,    color: 'text-primary',    bg: 'bg-primary/10'    },
};
const FALLBACK_META = { Icon: Bell, color: 'text-primary', bg: 'bg-primary/10' };

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? FALLBACK_META;
}

// ─── Single notification row ──────────────────────────────────────────────────

function NotificationItem({
  notification,
  onRead,
  onClose,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { Icon, color, bg } = getTypeMeta(notification.type);

  const handleClick = useCallback(() => {
    if (!notification.is_read) onRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  }, [notification, onRead, navigate, onClose]);

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'group relative flex gap-3 px-4 py-3 cursor-pointer select-none',
        'transition-colors duration-150',
        notification.is_read
          ? 'hover:bg-white/[0.03]'
          : 'hover:bg-white/[0.05]',
        notification.link ? 'cursor-pointer' : 'cursor-default'
      )}
      onClick={handleClick}
      role={notification.link ? 'button' : 'listitem'}
      tabIndex={notification.link ? 0 : -1}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      {/* Unread left stripe */}
      {!notification.is_read && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-primary" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5',
          bg
        )}
      >
        <Icon className={cn('h-4 w-4', color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-snug truncate',
            notification.is_read ? 'text-muted-foreground font-normal' : 'text-foreground font-medium'
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo}</p>
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2" />
      )}
    </motion.div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

const panelVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0, y: -6, scale: 0.97,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

function NotificationPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead    = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const prefersReduced = useReducedMotion();

  const hasUnread = unreadCount > 0;

  // Group notifications
  const today = new Date();
  const todayStr = today.toDateString();
  const todayItems    = notifications.filter(n => new Date(n.created_at).toDateString() === todayStr);
  const earlierItems  = notifications.filter(n => new Date(n.created_at).toDateString() !== todayStr);

  return (
    <motion.div
      variants={prefersReduced ? undefined : panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'absolute right-0 top-full mt-2 z-50',
        'w-[340px] sm:w-[380px]',
        'rounded-2xl overflow-hidden',
        'border border-border/60',
        'bg-background/95 backdrop-blur-xl',
        'shadow-[0_20px_60px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]',
      )}
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm text-foreground">Notifications</h2>
          {hasUnread && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-white/5"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          <button
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            onClick={onClose}
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[420px] overflow-y-auto overscroll-contain">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">You're all caught up</p>
            <p className="text-xs text-muted-foreground mt-1">No notifications yet.</p>
          </div>
        )}

        {!isLoading && notifications.length > 0 && (
          <div role="list">
            <AnimatePresence initial={false}>
              {todayItems.length > 0 && (
                <motion.div key="today" layout>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">
                    Today
                  </p>
                  {todayItems.map(n => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={id => markAsRead.mutate(id)}
                      onClose={onClose}
                    />
                  ))}
                </motion.div>
              )}

              {earlierItems.length > 0 && (
                <motion.div key="earlier" layout>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">
                    Earlier
                  </p>
                  {earlierItems.map(n => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={id => markAsRead.mutate(id)}
                      onClose={onClose}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer shimmer divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
    </motion.div>
  );
}

// ─── Bell button ──────────────────────────────────────────────────────────────

export function NotificationBell() {
  const { data: unreadCount = 0 } = useUnreadCount();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const hasUnread = unreadCount > 0;
  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <motion.button
        className={cn(
          'relative flex items-center justify-center',
          'w-9 h-9 rounded-full',
          'text-muted-foreground transition-colors duration-150',
          open
            ? 'bg-white/10 text-foreground'
            : 'hover:bg-white/6 hover:text-foreground',
        )}
        whileHover={prefersReduced ? undefined : { scale: 1.08 }}
        whileTap={prefersReduced  ? undefined : { scale: 0.93 }}
        onClick={() => setOpen(v => !v)}
        aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" />

        {/* Unread badge */}
        <AnimatePresence>
          {hasUnread && (
            <motion.span
              key="badge"
              initial={prefersReduced ? { opacity: 1 } : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className={cn(
                'absolute -top-0.5 -right-0.5',
                'min-w-[16px] h-4 px-[3px]',
                'rounded-full',
                'bg-primary text-primary-foreground',
                'text-[9px] font-bold',
                'flex items-center justify-center',
                'leading-none',
                'ring-2 ring-background',
              )}
            >
              {displayCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <NotificationPanel onClose={() => setOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
