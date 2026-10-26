import React from 'react';
import {
  Settings,
  User,
  Shield,
  Globe,
  LogOut,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2.5">
          <Settings className="w-7 h-7 text-brand-700" />
          <span>Account & Security Settings</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your account profile, cryptographic storage parameters, and application preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-200/80 pb-3">
            <User className="w-4 h-4 text-brand-700" />
            <span>Profile Information</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Display Name</label>
              <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-semibold text-slate-900">
                {user?.displayName || 'User'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email Address</label>
              <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-700 truncate">
                {user?.email || 'user@example.test'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Timezone</label>
              <div className="flex items-center space-x-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-700">
                <Globe className="w-4 h-4 text-slate-500" />
                <span>{user?.settings?.timezone || 'Asia/Kolkata (UTC+05:30)'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Account Created</label>
              <div className="flex items-center space-x-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-700">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Parameters Badge */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-200/80 pb-3">
            <Shield className="w-4 h-4 text-teal-700" />
            <span>Cryptographic Spec</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-brand-700 tracking-wider block">
                Password Hashing
              </span>
              <p className="text-slate-700 font-mono">Argon2id (RFC 9106)</p>
              <span className="text-[11px] text-slate-500 block">Salted memory-hard hashing</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider block">
                Binary Storage
              </span>
              <p className="text-slate-700 font-mono">AES-256-GCM at rest (GridFS)</p>
              <span className="text-[11px] text-slate-500 block">Per-file keys, server-held master key</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider block">
                Session Tokens
              </span>
              <p className="text-slate-700 font-mono">httpOnly cookie + JWT (HS256)</p>
              <span className="text-[11px] text-slate-500 block">Revocable on logout, CSRF-protected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Credentials Card */}
      <div className="panel p-6 space-y-4">
        <div className="flex items-center space-x-2.5 text-brand-700">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-base font-bold text-slate-900">Synthetic Demo Environment</h2>
        </div>
        <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
          Arkive includes a comprehensive synthetic seed script populated with realistic demo users,
          multi-tier collections, GridFS documents, family groups, and cross-account item shares.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl">
            <span className="text-[11px] font-bold text-brand-700 block mb-1">
              Primary Account (Family Admin)
            </span>
            <p className="font-mono text-slate-700">Email: demo@ownly.dev</p>
            <p className="font-mono text-slate-500">Password: DemoPassword123!</p>
          </div>

          <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl">
            <span className="text-[11px] font-bold text-teal-700 block mb-1">
              Partner Account (Family Member)
            </span>
            <p className="font-mono text-slate-700">Email: partner@ownly.dev</p>
            <p className="font-mono text-slate-500">Password: DemoPassword123!</p>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          To reset synthetic data: <code>python backend/scripts/seed_demo_data.py</code>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200/60 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Sign Out</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Terminate your session: it is revoked on the server and the session cookie is cleared from this browser.
          </p>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-500 text-red-700 hover:text-slate-900 border border-red-200/60 text-xs font-semibold rounded-xl transition-all self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Arkive</span>
        </button>
      </div>
    </div>
  );
};
