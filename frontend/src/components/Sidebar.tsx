import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderLock,
  Search,
  Trash2,
  Image,
  Wallet,
  Users,
  Bell,
  Activity,
  Settings,
  ShieldCheck,
  Lock,
  X,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: any;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const primary: NavItem[] = [
    { name: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { name: 'My Vault', to: '/vault', icon: FolderLock },
    { name: 'Search', to: '/search', icon: Search },
    { name: 'Memories', to: '/memories', icon: Image },
    { name: 'Finance & Bills', to: '/finance', icon: Wallet },
    { name: 'Family Vault', to: '/family', icon: Users },
    { name: 'Reminders', to: '/reminders', icon: Bell },
  ];
  const secondary: NavItem[] = [
    { name: 'Activity', to: '/activity', icon: Activity },
    { name: 'Trash', to: '/trash', icon: Trash2 },
    { name: 'Settings', to: '/settings', icon: Settings },
    { name: 'Landing Page', to: '/landing', icon: Sparkles },
  ];

  const renderLink = (item: NavItem) => (
    <NavLink
      key={item.name}
      to={item.to}
      end={item.to === '/dashboard'}
      onClick={() => onClose()}
      className={({ isActive }) =>
        `group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all ${
          isActive
            ? 'bg-slate-100 text-slate-900 font-semibold'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-slate-900" />}
          <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-800'}`} />
          <span className="truncate">{item.name}</span>
          {item.badge && (
            <span className="ml-auto rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden />
      )}

      <aside
        aria-label="Primary"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-xl transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 shadow-sm">
              <ShieldCheck className="h-5 w-5 text-brand-400" />
            </div>
            <div className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-slate-900">Arkive</span>
              <span className="block text-xs text-slate-500">Private vault</span>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn lg:hidden" aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {primary.map(renderLink)}
          <div className="my-3 border-t border-slate-100" />
          {secondary.map(renderLink)}
        </nav>

        {/* Footer */}
        <div className="p-3">
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 shadow-xs">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">Files encrypted at rest</p>
              <p className="mt-0.5 text-xs text-slate-500">AES-256-GCM, per-file keys</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
