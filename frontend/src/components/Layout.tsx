import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950 text-slate-100 lg:flex-row">
      {/* Soft teal wash behind the content area */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_70%_0%,rgb(20_184_166/0.10),transparent)]"
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
