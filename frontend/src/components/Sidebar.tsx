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
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const sections: NavSection[] = [
    {
      title: 'Library',
      items: [
        { name: 'Overview', to: '/', icon: LayoutDashboard },
        { name: 'My Vault', to: '/vault', icon: FolderLock },
        { name: 'Search', to: '/search', icon: Search },
      ],
    },
    {
      title: 'Collections',
      items: [
        { name: 'Memories', to: '/memories', icon: Image },
        { name: 'Finance & Bills', to: '/finance', icon: Wallet },
        { name: 'Family Vault', to: '/family', icon: Users },
        { name: 'Reminders', to: '/reminders', icon: Bell },
      ],
    },
    {
      title: 'System',
      items: [
        { name: 'Activity', to: '/activity', icon: Activity },
        { name: 'Trash', to: '/trash', icon: Trash2 },
        { name: 'Settings', to: '/settings', icon: Settings },
      ],
    },
  ];

  const renderLink = (item: NavItem) => (
    <NavLink
      key={item.name}
      to={item.to}
      end={item.to === '/'}
      onClick={() => onClose()}
      className={({ isActive }) =>
        `group relative flex h-[34px] items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-150 ease-out select-none ${
          isActive
            ? 'bg-brand-500/15 text-brand-300 font-semibold border border-brand-500/25 shadow-sm'
            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
              isActive ? 'text-brand-300' : 'text-slate-400 group-hover:text-slate-200'
            }`}
          />
          <span className="truncate">{item.name}</span>
          {item.badge && (
            <span className="ml-auto rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 tabular-nums">
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
        <div
          className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-md lg:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* macOS Source List Sidebar */}
      <aside
        aria-label="Source List"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/[0.07] bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/[0.07] px-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-[0_1px_0_0_rgb(255_255_255/0.3)_inset,0_4px_12px_-3px_rgb(20_184_166/0.7)]">
              <ShieldCheck className="h-4.5 w-4.5 text-slate-950 font-bold" />
            </div>
            <div className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight text-white">Ownly</span>
              <span className="block text-[10px] font-medium tracking-wide text-slate-400 uppercase">Sovereign Vault</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn min-h-[44px] min-w-[44px] lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Source List Navigation Groups */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {sections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <div className="source-list-header">{section.title}</div>
              <div className="space-y-0.5">
                {section.items.map(renderLink)}
              </div>
            </div>
          ))}
        </nav>

        {/* Cryptographic Security Badge */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-slate-900/60 p-2.5">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-300 border border-brand-500/20">
              <Lock className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-200">Zero-Knowledge Enclave</p>
              <p className="truncate text-[10px] text-slate-400 tabular-nums">AES-256-GCM · Protected</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
