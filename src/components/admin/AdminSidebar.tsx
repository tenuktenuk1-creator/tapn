import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Building2, Users, BookOpen, BarChart2,
  CreditCard, Bell, Settings, ChevronLeft, ChevronRight,
  Zap, LogOut, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Dashboard',     href: '/admin/dashboard',      icon: LayoutDashboard },
  { label: 'Venues',        href: '/admin/venues',          icon: Building2       },
  { label: 'Partners',      href: '/admin/partners',        icon: Users           },
  { label: 'Bookings',      href: '/admin/bookings',        icon: BookOpen        },
  { label: 'Analytics',     href: '/admin/analytics',       icon: BarChart2       },
  { label: 'Payments',      href: '/admin/payments',        icon: CreditCard      },
  { label: 'Notifications', href: '/admin/notifications',   icon: Bell            },
  { label: 'Settings',      href: '/admin/settings',        icon: Settings        },
] as const;

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isActive = (href: string) =>
    href === '/admin/dashboard'
      ? location.pathname === href
      : location.pathname.startsWith(href);

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'A';

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 228 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      className="fixed top-0 left-0 bottom-0 z-40 flex flex-col bg-[hsl(240_12%_5%)] border-r border-[hsl(240_10%_11%)] overflow-hidden"
    >
      {/* Logo */}
      <div className={cn('flex items-center h-14 px-3 border-b border-[hsl(240_10%_11%)] shrink-0', collapsed ? 'justify-center' : 'gap-2.5')}>
        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="font-display font-bold text-sm">
                tapn<span className="text-primary">.</span>
              </span>
              <span className="ml-1.5 text-[10px] font-semibold text-muted-foreground border border-[hsl(240_10%_18%)] rounded px-1.5 py-0.5">
                ADMIN
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              to={href}
              title={collapsed ? label : undefined}
              className={cn(
                'relative flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 group',
                collapsed ? 'justify-center' : '',
                active
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-[hsl(240_10%_10%)] hover:text-foreground',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0 transition-colors', active ? 'text-primary' : 'group-hover:text-foreground')} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {active && (
                <motion.span
                  layoutId="admin-nav-active"
                  className="absolute inset-0 rounded-xl ring-1 ring-primary/25"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: user + collapse toggle */}
      <div className="shrink-0 border-t border-[hsl(240_10%_11%)] p-2 space-y-1">
        {/* Admin badge */}
        {!collapsed && (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[hsl(240_10%_9%)]">
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck className="h-3 w-3 text-primary/70" />
                <span className="text-[10px] text-primary/70 font-medium">Admin</span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center px-2.5 py-2 rounded-xl text-muted-foreground hover:bg-[hsl(240_10%_10%)] hover:text-foreground transition-colors text-xs font-medium gap-2',
            collapsed ? 'justify-center' : '',
          )}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>
          }
        </button>
      </div>
    </motion.aside>
  );
}
