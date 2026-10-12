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
  X
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
  const navItems: NavItem[] = [
    { name: 'Overview', to: '/', icon: LayoutDashboard },
    { name: 'My Vault', to: '/vault', icon: FolderLock },
    { name: 'Search', to: '/search', icon: Search },
    { name: 'Trash', to: '/trash', icon: Trash2 },
    { name: 'Memories', to: '/memories', icon: Image },
    { name: 'Finance & Bills', to: '/finance', icon: Wallet },
    { name: 'Family Vault', to: '/family', icon: Users },
    { name: 'Reminders', to: '/reminders', icon: Bell },
    { name: 'Activity', to: '/activity', icon: Activity },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <ShieldCheck className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">Ownly</span>
              <span className="block text-[10px] uppercase font-semibold text-brand-500 tracking-wider">
                Digital Vault
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-400 rounded">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer badge */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800 text-xs text-slate-400">
            <div className="flex items-center space-x-1.5 text-brand-400 font-semibold mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              <span>Private Vault Active</span>
            </div>
            <p className="text-[11px] text-slate-400">MongoDB GridFS encryption-ready</p>
          </div>
        </div>
      </aside>
    </>
  );
};

