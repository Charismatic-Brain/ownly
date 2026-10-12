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
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
          <Settings className="w-7 h-7 text-brand-400" />
          <span>Account & Security Settings</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review your account profile, cryptographic storage parameters, and application preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
            <User className="w-4 h-4 text-brand-400" />
            <span>Profile Information</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Display Name</label>
              <div className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white">
                {user?.displayName || 'User'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
              <div className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 truncate">
                {user?.email || 'user@example.test'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Timezone</label>
              <div className="flex items-center space-x-2 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300">
                <Globe className="w-4 h-4 text-slate-500" />
                <span>{user?.settings?.timezone || 'Asia/Kolkata (UTC+05:30)'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Account Created</label>
              <div className="flex items-center space-x-2 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Parameters Badge */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Shield className="w-4 h-4 text-teal-400" />
            <span>Cryptographic Spec</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider block">
                Password Hashing
              </span>
              <p className="text-slate-300 font-mono">Argon2id (RFC 9106)</p>
              <span className="text-[11px] text-slate-500 block">Salted memory-hard hashing</span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider block">
                Binary Storage
              </span>
              <p className="text-slate-300 font-mono">MongoDB GridFS Buckets</p>
              <span className="text-[11px] text-slate-500 block">Chunked private byte streaming</span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block">
                Session Tokens
              </span>
              <p className="text-slate-300 font-mono">Bearer JWT (HS256)</p>
              <span className="text-[11px] text-slate-500 block">Scoped principal derivation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Credentials Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-2.5 text-brand-400">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-base font-bold text-white">Synthetic Demo Environment</h2>
        </div>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          Ownly includes a comprehensive synthetic seed script populated with realistic demo users,
          multi-tier collections, GridFS documents, family groups, and cross-account item shares.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
            <span className="text-[11px] font-bold text-brand-400 block mb-1">
              Primary Account (Family Admin)
            </span>
            <p className="font-mono text-slate-300">Email: demo@ownly.dev</p>
            <p className="font-mono text-slate-400">Password: DemoPassword123!</p>
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
            <span className="text-[11px] font-bold text-teal-400 block mb-1">
              Partner Account (Family Member)
            </span>
            <p className="font-mono text-slate-300">Email: partner@ownly.dev</p>
            <p className="font-mono text-slate-400">Password: DemoPassword123!</p>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          To reset synthetic data: <code>python backend/scripts/seed_demo_data.py</code>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Sign Out</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Terminate your authenticated session and clear stored tokens from this browser.
          </p>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 text-xs font-semibold rounded-xl transition-all self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Ownly</span>
        </button>
      </div>
    </div>
  );
};
