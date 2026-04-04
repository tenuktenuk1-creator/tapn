import { ReactNode } from 'react';
import { PartnerNavbar } from './PartnerNavbar';

interface PartnerLayoutProps {
  children: ReactNode;
}

export function PartnerLayout({ children }: PartnerLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[hsl(240_10%_4%)]">
      <PartnerNavbar />
      {/* 60px top offset to clear the fixed navbar */}
      <main className="flex-1 pt-[60px]">{children}</main>
    </div>
  );
}
