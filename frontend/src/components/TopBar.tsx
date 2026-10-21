import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TopBarProps {
  onOpenSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenSidebar }) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Press "/" anywhere (outside a text field) to jump to search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.08] bg-slate-950/75 px-4 backdrop-blur-2xl sm:px-6 lg:px-10">
      <button
        onClick={onOpenSidebar}
        className="icon-btn min-h-[44px] min-w-[44px] lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Global search */}
      <form onSubmit={handleSearchSubmit} role="search" className="relative min-w-0 max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your vault (Press '/' to focus)"
          aria-label="Search your vault"
          className="field h-10 rounded-xl bg-slate-900/60 pl-10 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus:bg-slate-950/90 transition-all duration-150"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/10 bg-white/[0.04] px-1.5 text-[11px] font-medium leading-5 text-slate-400 sm:block">
          /
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2.5 rounded-xl p-1.5 transition-all duration-150 ease-out hover:bg-white/[0.05] active:scale-[0.98] text-left"
          title="Account Settings"
          aria-label="Account Settings"
        >
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-semibold leading-tight text-slate-100">{user?.displayName || 'User'}</p>
            <p className="truncate text-[11px] leading-tight text-slate-400">{user?.email}</p>
          </div>

          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500/25 to-brand-700/25 text-sm font-semibold text-brand-200 border border-brand-400/30 shadow-[0_1px_0_0_rgb(255_255_255/0.1)_inset]">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
          </div>
        </button>

        <button
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          className="icon-btn min-h-[40px] min-w-[40px] hover:text-rose-300 hover:bg-rose-500/10 active:scale-[0.95]"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
