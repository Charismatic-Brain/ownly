import React from 'react';
import {
  User,
  Shield,
  Globe,
  LogOut,
  Clock,
  Database,
  Lock,
  KeyRound,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">System & Security Settings</h1>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
          Cryptographic security parameters, account identity, and sovereign vault storage.
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Profile & Identity */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/[0.07] pb-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-300 border border-brand-500/20 text-sm font-bold">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{user?.displayName || 'Vault Owner'}</h2>
              <p className="text-xs text-slate-400">{user?.email || 'owner@sovereign.vault'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="rounded-xl bg-slate-950/70 border border-white/[0.06] p-3 space-y-1">
              <span className="source-list-header !p-0">Display Name</span>
              <p className="text-slate-200 font-medium">{user?.displayName || 'Owner'}</p>
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-white/[0.06] p-3 space-y-1">
              <span className="source-list-header !p-0">Email Address</span>
              <p className="text-slate-200 font-medium truncate">{user?.email || 'owner@sovereign.vault'}</p>
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-white/[0.06] p-3 space-y-1">
              <span className="source-list-header !p-0">Timezone</span>
              <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                <Globe className="h-3.5 w-3.5 text-slate-500" />
                <span>{user?.settings?.timezone || 'Asia/Kolkata (UTC+05:30)'}</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-white/[0.06] p-3 space-y-1">
              <span className="source-list-header !p-0">Vault Established</span>
              <div className="flex items-center gap-1.5 text-slate-200 font-medium tabular-nums">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Session'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Cryptographic Security Enclave */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-3.5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-brand-400" />
              <h2 className="text-sm font-semibold text-white">Cryptographic Security Specification</h2>
            </div>
            <span className="rounded bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-300 border border-brand-500/20">
              Verified Architecture
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-slate-950/70 border border-white/[0.06] p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-brand-300 text-[11px] font-semibold">
                <KeyRound className="h-3.5 w-3.5" />
                <span>Password Hashing</span>
              </div>
              <p className="font-mono text-slate-200 text-xs">Argon2id</p>
              <p className="text-[10px] text-slate-500">RFC 9106 salted memory-hard hashing with timing attack prevention.</p>
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-white/[0.06] p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-teal-300 text-[11px] font-semibold">
                <Lock className="h-3.5 w-3.5" />
                <span>Binary Storage</span>
              </div>
              <p className="font-mono text-slate-200 text-xs">AES-256-GCM GridFS</p>
              <p className="text-[10px] text-slate-500">Authenticated payload encryption at rest with unique per-file initialization vectors.</p>
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-white/[0.06] p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-purple-300 text-[11px] font-semibold">
                <FileCheck className="h-3.5 w-3.5" />
                <span>Session Tokens</span>
              </div>
              <p className="font-mono text-slate-200 text-xs">httpOnly Cookie + JWT</p>
              <p className="text-[10px] text-slate-500">Protected against cross-site scripting (XSS) with instant revocation on logout.</p>
            </div>
          </div>
        </div>

        {/* Section 3: Demo Environment & Storage */}
        <div className="panel p-5 space-y-3.5">
          <div className="flex items-center gap-2 border-b border-white/[0.07] pb-3.5 text-brand-400">
            <Database className="h-4 w-4" />
            <h2 className="text-sm font-semibold text-white">Sovereign Data Storage & Demo Seed</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Ownly stores encrypted artifacts inside dedicated MongoDB GridFS chunks. Synthetic seed data provides realistic verification of multi-tier collections, family groups, and encrypted attachments.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/70 border border-white/[0.06] rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-brand-300 uppercase tracking-wider block">Demo Account 1</span>
              <p className="text-slate-200 font-mono text-[11px]">shubham@ownly.dev</p>
              <p className="text-[10px] text-slate-500">Seed user with seeded files, finance records & family circles</p>
            </div>

            <div className="p-3 bg-slate-950/70 border border-white/[0.06] rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-teal-300 uppercase tracking-wider block">Demo Account 2</span>
              <p className="text-slate-200 font-mono text-[11px]">family.member@ownly.dev</p>
              <p className="text-[10px] text-slate-500">Secondary user testing cross-account vault permissions</p>
            </div>
          </div>
        </div>

        {/* Section 4: Account Actions */}
        <div className="panel p-5 flex items-center justify-between border-rose-500/20 bg-rose-950/10">
          <div>
            <h3 className="text-xs font-semibold text-white">Sign Out of Sovereign Vault</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Clears the secure httpOnly session cookie and locks local decryption keys.</p>
          </div>
          <button
            onClick={logout}
            className="btn-danger !text-xs !py-1.5 !px-3"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
