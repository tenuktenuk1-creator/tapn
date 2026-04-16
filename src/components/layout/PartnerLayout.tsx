import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import { PartnerNavbar } from './PartnerNavbar';

export function PartnerLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col bg-[hsl(240_10%_4%)]">
      <PartnerNavbar />
      {/* 60px top offset to clear the fixed navbar */}
      <main className="flex-1 pt-[60px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
