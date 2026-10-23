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

  // Spotlight keyboard shortcut: ⌘K, Ctrl+K, or "/"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !isTyping && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.07] bg-slate-950/80 backdrop-blur-2xl backdrop-saturate-150 px-4 sm:px-6 lg:px-8">
      {/* Mobile Sidebar Toggle Button (44x44 touch target) */}
      <button
        onClick={onOpenSidebar}
        className="icon-btn min-h-[44px] min-w-[44px] lg:hidden"
        aria-label="Open navigation sidebar"
      >
        <Menu className="h-5 w-5 text-slate-300" />
      </button>

      {/* Spotlight Search Field */}
      <form onSubmit={handleSearchSubmit} role="search" className="relative min-w-0 max-w-lg flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Spotlight Search (⌘K or /)..."
          aria-label="Spotlight Search"
          className="field h-9 rounded-xl bg-slate-900/60 pl-9 pr-14 text-[13px] text-slate-100 placeholder:text-slate-500 focus:bg-slate-950/90 transition-all duration-150"
        />
        <div className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex">
          <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium leading-none text-slate-400">
            ⌘K
          </kbd>
        </div>
      </form>

      {/* Trailing Controls & User Info */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Account Button */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2.5 rounded-xl p-1.5 transition-all duration-150 ease-out hover:bg-white/[0.05] active:scale-[0.98] text-left"
          title="Account Settings"
          aria-label="Account Settings"
        >
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-xs font-semibold leading-tight text-slate-100">
              {user?.displayName || 'Personal Vault'}
            </p>
            <p className="truncate text-[10px] leading-tight text-slate-400 tabular-nums">
              {user?.email || 'Secured'}
            </p>
          </div>

          <div className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-800 border border-white/10 shadow-sm text-xs font-medium text-slate-200">
            {user?.displayName ? (
              user.displayName.charAt(0).toUpperCase()
            ) : (
              <UserIcon className="h-4 w-4 text-slate-400" />
            )}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-950"
              title="Vault Unlocked"
            />
          </div>
        </button>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          title="Sign out of vault"
          aria-label="Sign out of vault"
          className="icon-btn min-h-[36px] min-w-[36px] hover:text-rose-300 hover:bg-rose-500/10 active:scale-[0.95]"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
