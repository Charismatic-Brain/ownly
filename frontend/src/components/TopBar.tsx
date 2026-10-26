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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
      <button onClick={onOpenSidebar} className="icon-btn h-10 w-10 lg:hidden text-slate-700" aria-label="Open navigation">
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
          placeholder="Search your vault (/)"
          aria-label="Search your vault"
          className="field h-10 rounded-full bg-slate-100/80 border border-slate-200/80 pl-10 pr-12 text-slate-900 placeholder:text-slate-400 focus:bg-white"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-medium leading-5 text-slate-400 sm:block shadow-xs">
          /
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden min-w-0 text-right sm:block">
          <p className="truncate text-sm font-semibold leading-tight text-slate-900">{user?.displayName || 'User'}</p>
          <p className="truncate text-xs leading-tight text-slate-500">{user?.email}</p>
        </div>

        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 shadow-xs">
          {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4 text-slate-600" />}
        </div>

        <button onClick={logout} title="Sign out" aria-label="Sign out" className="icon-btn h-9 w-9 text-slate-500 hover:text-rose-600">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
