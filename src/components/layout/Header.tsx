import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from 'framer-motion';
import { MapPin, Menu, X, User, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── NavItem ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  to: string;
  label: string;
  isActive: boolean;
  showPill: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick?: () => void;
}

function NavItem({
  to,
  label,
  isActive,
  showPill,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative px-4 py-2 text-sm font-medium"
    >
      {showPill && (
        <motion.div
          layoutId="nav-pill"
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(255,47,179,0.18) 0%, rgba(155,48,245,0.12) 100%)',
            boxShadow:
              '0 0 16px rgba(255,47,179,0.2), inset 0 0 12px rgba(255,47,179,0.06)',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      )}
      <span
        className={cn(
          'relative z-10 transition-colors duration-200',
          isActive || showPill
            ? 'text-white'
            : 'text-white/50 hover:text-white/80',
        )}
      >
        {label}
      </span>
    </Link>
  );
}

// ─── CursorGlow ───────────────────────────────────────────────────────────────

interface CursorGlowProps {
  x: MotionValue<number>;
  y: MotionValue<number>;
  visible: boolean;
}

function CursorGlow({ x, y, visible }: CursorGlowProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 300,
          height: 300,
          x,
          y,
          background:
            'radial-gradient(circle, rgba(255,47,179,0.13) 0%, rgba(155,48,245,0.07) 50%, transparent 70%)',
          filter: 'blur(8px)',
        }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
    </div>
  );
}

// ─── CTAButton ────────────────────────────────────────────────────────────────

interface CTAButtonProps {
  onClick: () => void;
}

function CTAButton({ onClick }: CTAButtonProps) {
  return (
    <motion.div
      animate={{ scale: [1, 1.03, 1] }}
      transition={{
        duration: 3.5,
        repeat: Infinity,
        repeatType: 'loop',
        ease: 'easeInOut',
      }}
    >
      <motion.button
        onClick={onClick}
        whileHover={{
          y: -2,
          boxShadow: '0 8px 32px rgba(255,47,179,0.45)',
        }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="relative overflow-hidden rounded-full px-6 py-2 text-sm font-semibold text-white"
        style={{
          background: 'linear-gradient(135deg, #ff2fb3 0%, #9b30f5 100%)',
          boxShadow: '0 4px 20px rgba(255,47,179,0.3)',
        }}
      >
        {/* Shimmer streak */}
        <motion.div
          className="absolute inset-y-0 w-16 -skew-x-12"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)',
          }}
          animate={{ left: ['-20%', '130%'] }}
          transition={{
            duration: 0.65,
            repeat: Infinity,
            repeatDelay: 3.2,
            ease: 'easeInOut',
          }}
        />
        <span className="relative z-10">Sign Up</span>
      </motion.button>
    </motion.div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/venues', label: 'Venues' },
  { to: '/plan-a-night', label: 'Plan a Night' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/partner', label: 'Partner With Us' },
];

export function Header() {
  const { user, isAdmin, isPartner, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [glowVisible, setGlowVisible] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);

  // Cursor glow tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 500, damping: 50 });
  const springY = useSpring(mouseY, { stiffness: 500, damping: 50 });
  const glowX = useTransform(springX, (v) => v - 150);
  const glowY = useTransform(springY, (v) => v - 150);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = headerRef.current?.getBoundingClientRect();
    if (rect) {
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    }
  };

  const showPartnerLink = !isAdmin && !isPartner;
  const visibleItems = NAV_ITEMS.filter(
    (item) => item.to !== '/partner' || showPartnerLink,
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="fixed top-0 z-50 w-full">
      {/* Glass background — fades in on scroll */}
      <motion.div
        className="absolute inset-0 border-b"
        animate={
          scrolled
            ? {
                opacity: 1,
                borderColor: 'rgba(255,47,179,0.12)',
              }
            : {
                opacity: 0,
                borderColor: 'rgba(255,255,255,0)',
              }
        }
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          background: 'rgba(8, 8, 16, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      />

      {/* Bottom glow line on scroll */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px"
        animate={{ opacity: scrolled ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,47,179,0.4) 30%, rgba(155,48,245,0.4) 70%, transparent 100%)',
        }}
      />

      {/* Main header content */}
      <div
        ref={headerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setGlowVisible(true)}
        onMouseLeave={() => {
          setGlowVisible(false);
          setHoveredItem(null);
        }}
        className="relative"
      >
        <CursorGlow x={glowX} y={glowY} visible={glowVisible} />

        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="relative z-10 flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                duration: 0.7,
                repeat: Infinity,
                repeatDelay: 4.5,
                ease: 'easeInOut',
              }}
            >
              <MapPin className="h-5 w-5 text-primary" />
            </motion.div>
            <span className="font-display text-xl font-bold tracking-tight text-white">
              TAPN
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="relative z-10 hidden items-center gap-1 md:flex">
            {visibleItems.map((item) => {
              const isActive = location.pathname === item.to;
              const showPill = hoveredItem
                ? hoveredItem === item.to
                : isActive;
              return (
                <NavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  isActive={isActive}
                  showPill={showPill}
                  onMouseEnter={() => setHoveredItem(item.to)}
                  onMouseLeave={() => setHoveredItem(null)}
                />
              );
            })}
          </nav>

          {/* Desktop Auth */}
          <div className="relative z-10 hidden items-center gap-3 md:flex">
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-sm font-medium text-white/50 transition-colors hover:text-white"
                  >
                    Admin
                  </Link>
                )}
                {isPartner && !isAdmin && (
                  <Link
                    to="/partner/dashboard"
                    className="text-sm font-medium text-white/50 transition-colors hover:text-white"
                  >
                    Partner
                  </Link>
                )}
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:text-white"
                    >
                      <User className="h-4 w-4" />
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 border-white/10 bg-[#0d0d1c]"
                  >
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    {isPartner && !isAdmin && (
                      <DropdownMenuItem
                        onClick={() => navigate('/partner/dashboard')}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Partner Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => navigate('/auth')}
                  whileHover={{ color: 'rgba(255,255,255,1)' }}
                  className="text-sm font-medium text-white/50 transition-colors hover:text-white"
                >
                  Sign In
                </motion.button>
                <CTAButton onClick={() => navigate('/auth?mode=signup')} />
              </div>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="relative z-10 flex items-center gap-2 md:hidden">
            {user && <NotificationBell />}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden border-t border-white/5 md:hidden"
            style={{
              background: 'rgba(8, 8, 16, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <nav className="container flex flex-col gap-1 py-4">
              {visibleItems.map((item, i) => (
                <motion.div
                  key={item.to}
                  initial={{ x: -12, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                >
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'block rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                      location.pathname === item.to
                        ? 'bg-primary/10 text-white'
                        : 'text-white/50 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: visibleItems.length * 0.05 + 0.05 }}
                className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-4"
              >
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-xl px-4 py-3 text-sm font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      My Profile
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-xl px-4 py-3 text-sm font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    {isPartner && !isAdmin && (
                      <Link
                        to="/partner/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-xl px-4 py-3 text-sm font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        Partner Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleSignOut();
                        setMobileOpen(false);
                      }}
                      className="rounded-xl px-4 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-white/5"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        navigate('/auth');
                        setMobileOpen(false);
                      }}
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/5"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        navigate('/auth?mode=signup');
                        setMobileOpen(false);
                      }}
                      className="relative overflow-hidden rounded-full px-4 py-3 text-sm font-semibold text-white"
                      style={{
                        background:
                          'linear-gradient(135deg, #ff2fb3 0%, #9b30f5 100%)',
                      }}
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
