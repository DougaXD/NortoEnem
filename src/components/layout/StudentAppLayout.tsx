import React from 'react';
import { DesktopSidebar } from '../navigation/DesktopSidebar';
import { MobileBottomNav } from '../navigation/MobileBottomNav';
import { TopBar } from '../navigation/TopBar';

export const StudentAppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <TopBar />
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Bottom Navigation Mobile */}
      <MobileBottomNav />
    </div>
  );
};
