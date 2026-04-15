import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  BookOpen,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ─── Nav items ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Dashboard',  href: '/partner/dashboard',   icon: LayoutDashboard },
  { label: 'Venues',     href: '/partner/venues',       icon: Building2       },
  { label: 'Bookings',   href: '/partner/bookings',     icon: BookOpen        },
  { label: 'Calendar',   href: '/partner/calendar',     icon: CalendarDays    },
  { label: 'Settings',   href: '/partner/settings',     icon: Settings        },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function PartnerNavbar() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled,     setScrolled]     = useState(false);

  // Shadow / glass effect on scroll
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/partner');
  };

  const isActive = (href: string) =>
    href === '/partner/dashboard'
      ? location.pathname === href
      : location.pathname.startsWith(href);

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'P';

  return (
    <>
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header
        className={[
          'fixed top-0 left-0 right-0 z-50 h-[60px] transition-all duration-300',
          'bg-[hsl(240_12%_5%)] border-b',
          scrolled
            ? 'border-[hsl(240_10%_14%)] shadow-[0_4px_24px_hsl(240_10%_4%/0.8)]'
            : 'border-[hsl(240_10%_10%)]',
        ].join(' ')}
      >
        {/* subtle ambient glow behind logo */}
        <div className="absolute left-0 top-0 w-64 h-full pointer-events-none overflow-hidden">
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-48 h-32 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="max-w-[1440px] mx-auto h-full px-4 flex items-center gap-6">
          {/* Logo */}
          <Link
            to="/partner/dashboard"
            className="flex items-center gap-2 shrink-0 select-none group"
          >
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors" />
              <Zap className="relative h-4 w-4 text-primary" />
            </div>
            <span className="font-display font-bold text-base tracking-tight">
              <span className="text-foreground">tapn</span>
              <span className="text-primary">.</span>
              <span className="text-xs font-medium text-muted-foreground ml-1 border border-[hsl(240_10%_18%)] rounded px-1.5 py-0.5">
                Partner
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  to={href}
                  className={[
                    'relative flex items-center gap-2 px-3 h-[42px] rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap',
                    active
                      ? 'text-foreground bg-[hsl(240_10%_11%)]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(240_10%_9%)]',
                  ].join(' ')}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : ''}`} />
                  {label}
                  {active && (
                    <motion.span
                      layoutId="partner-nav-pill"
                      className="absolute inset-0 rounded-lg ring-1 ring-primary/20"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-2 h-9 rounded-lg hover:bg-[hsl(240_10%_11%)] transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
                  {initials}
                </div>
                <span className="hidden sm:block max-w-[120px] truncate text-xs">
                  {user?.email}
                </span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-48 z-20 rounded-xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_16%)] shadow-2xl overflow-hidden"
                    >
                      <div className="px-3 py-2.5 border-b border-[hsl(240_10%_13%)]">
                        <p className="text-xs text-muted-foreground">Signed in as</p>
                        <p className="text-sm font-medium truncate">{user?.email}</p>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[hsl(240_10%_11%)] transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-[hsl(240_12%_5%)] border-r border-[hsl(240_10%_12%)] flex flex-col lg:hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 h-[60px] border-b border-[hsl(240_10%_12%)] shrink-0">
                <Link to="/partner/dashboard" className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-display font-bold text-sm">
                    tapn<span className="text-primary">.</span>
                    <span className="text-xs font-medium text-muted-foreground ml-1">Partner</span>
                  </span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[hsl(240_10%_11%)] text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer nav */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      to={href}
                      className={[
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                        active
                          ? 'bg-primary/10 text-foreground ring-1 ring-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(240_10%_10%)]',
                      ].join(' ')}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : ''}`} />
                      {label}
                      {active && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Drawer footer */}
              <div className="p-3 border-t border-[hsl(240_10%_12%)] shrink-0">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[hsl(240_10%_9%)]">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
