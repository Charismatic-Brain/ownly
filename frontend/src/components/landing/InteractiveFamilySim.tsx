import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  FileText,
  Image,
  Wallet,
  BookOpen,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  relation: string;
  avatar: string;
  badgeColor: string;
  description: string;
}

interface VaultItemSimulation {
  id: string;
  title: string;
  category: string;
  icon: any;
  permissions: {
    [memberId: string]: {
      status: 'full' | 'view' | 'emergency' | 'sealed';
      label: string;
    };
  };
}

const FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'owner',
    name: 'You (Vault Owner)',
    role: 'Root Master Admin',
    relation: 'Account Holder',
    avatar: '👑',
    badgeColor: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
    description: 'Holds root encryption keys. Manages all collections, finance, and delegation grants.'
  },
  {
    id: 'partner',
    name: 'Elena (Partner)',
    role: 'Family Co-Admin',
    relation: 'Spouse',
    avatar: '💍',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Shared co-ownership on family assets, deeds, health records, and memories. Personal records remain isolated.'
  },
  {
    id: 'kids',
    name: 'Leo & Maya (Children)',
    role: 'Family Members',
    relation: 'Dependents',
    avatar: '🎒',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: 'Restricted view access to emergency medical cards, school records, and shared family photo albums.'
  },
  {
    id: 'trustee',
    name: 'Marcus (Estate Trustee)',
    role: 'Designated Keyholder',
    relation: 'Estate Attorney',
    avatar: '⚖️',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    description: 'Emergency conditional access to living will, title deeds, and life insurance policies upon verified activation.'
  }
];

const VAULT_ITEMS: VaultItemSimulation[] = [
  {
    id: 'deed',
    title: 'Deed of Conveyance #9482 (Maple Ridge Property)',
    category: 'Real Estate Title',
    icon: FileText,
    permissions: {
      owner: { status: 'full', label: 'Full Root Owner' },
      partner: { status: 'full', label: 'Co-Owner (View & Edit)' },
      kids: { status: 'sealed', label: 'Sealed (Hidden)' },
      trustee: { status: 'view', label: 'Verified Read-Only' }
    }
  },
  {
    id: 'passports',
    title: 'Family Medical History & Emergency Directives',
    category: 'Identity & Health',
    icon: ShieldCheck,
    permissions: {
      owner: { status: 'full', label: 'Full Root Owner' },
      partner: { status: 'full', label: 'Co-Admin Access' },
      kids: { status: 'view', label: 'Emergency Medical Card' },
      trustee: { status: 'emergency', label: 'Emergency Conditional' }
    }
  },
  {
    id: 'memories',
    title: 'Uncompressed Family Milestones & 4K Photo Reels',
    category: 'Living Memory Archive',
    icon: Image,
    permissions: {
      owner: { status: 'full', label: 'Full Root Owner' },
      partner: { status: 'full', label: 'Shared Contributor' },
      kids: { status: 'view', label: 'Family Album Access' },
      trustee: { status: 'sealed', label: 'Sealed (Hidden)' }
    }
  },
  {
    id: 'finance',
    title: 'Bank Accounts, Fixed Deposits & Investment Ledgers',
    category: 'Personal Wealth',
    icon: Wallet,
    permissions: {
      owner: { status: 'full', label: 'Full Root Owner' },
      partner: { status: 'full', label: 'Joint Balance Visibility' },
      kids: { status: 'sealed', label: 'Sealed (Hidden)' },
      trustee: { status: 'emergency', label: 'Time-Locked Directive' }
    }
  },
  {
    id: 'will',
    title: 'Last Will & Testament / Power of Attorney',
    category: 'Estate Directives',
    icon: Key,
    permissions: {
      owner: { status: 'full', label: 'Full Root Owner' },
      partner: { status: 'view', label: 'Primary Beneficiary' },
      kids: { status: 'sealed', label: 'Sealed (Hidden)' },
      trustee: { status: 'full', label: 'Designated Executor' }
    }
  },
  {
    id: 'journal',
    title: 'Personal Reflection Journal & Cryptographic Master Key',
    category: 'Strictly Confidential',
    icon: BookOpen,
    permissions: {
      owner: { status: 'full', label: 'Full Root Owner' },
      partner: { status: 'sealed', label: 'Zero-Knowledge Sealed' },
      kids: { status: 'sealed', label: 'Zero-Knowledge Sealed' },
      trustee: { status: 'sealed', label: 'Zero-Knowledge Sealed' }
    }
  }
];

export const InteractiveFamilySim: React.FC = () => {
  const [selectedMemberId, setSelectedMemberId] = useState('partner');
  const [revokedItems, setRevokedItems] = useState<{ [key: string]: boolean }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeMember =
    FAMILY_MEMBERS.find((m) => m.id === selectedMemberId) || FAMILY_MEMBERS[1];

  const handleToggleRevoke = (itemId: string, itemTitle: string) => {
    const isNowRevoked = !revokedItems[itemId];
    setRevokedItems((prev) => ({
      ...prev,
      [itemId]: isNowRevoked
    }));

    const actionText = isNowRevoked ? 'Revoked access to' : 'Restored access to';
    setToastMessage(
      `Audit Logged: ${actionText} "${itemTitle.slice(0, 30)}..." for ${activeMember.name}. Access token voided.`
    );

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleReset = () => {
    setRevokedItems({});
    setToastMessage('Simulation reset to baseline sharing grants.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <section id="interactive-sim" className="py-24 sm:py-32 relative bg-[#fbfbfd] border-t border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-mono mb-4">
            <Users className="w-3.5 h-3.5 text-brand-600" />
            <span>INTERACTIVE FAMILY VAULT SIMULATOR</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.03em] text-slate-900 leading-[1.12]">
            Sharing without surrender. <br />
            <span className="bg-gradient-to-r from-teal-700 via-brand-600 to-emerald-600 bg-clip-text text-transparent">
              Click a family member to see what they unlock.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Arkive ensures sharing one house deed or medical card never compromises your
            personal journal, banking transactions, or unshared items.
          </p>
        </div>

        {/* Member Selector Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {FAMILY_MEMBERS.map((member) => {
            const isSelected = member.id === selectedMemberId;
            return (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`p-4 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] relative overflow-hidden ${
                  isSelected
                    ? 'bg-white border-2 border-slate-900 shadow-md ring-2 ring-slate-900/5'
                    : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300 shadow-xs'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />
                )}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{member.avatar}</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{member.name}</h3>
                    <p className="text-[11px] text-slate-500">{member.relation}</p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                  {member.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Simulated View Header */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-xl shadow-xs">
              {activeMember.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  Perspective: Viewing as {activeMember.name}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${memberBadgeClass(activeMember.id)}`}>
                  {activeMember.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                The items below update instantly to reflect their cryptographic clearance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3 h-3 text-slate-400" />
              <span>Reset Grants</span>
            </button>
          </div>
        </div>

        {/* Dynamic Simulated Vault Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VAULT_ITEMS.map((item) => {
            const rawPermission = item.permissions[selectedMemberId] || {
              status: 'sealed',
              label: 'Sealed'
            };
            const isManuallyRevoked = revokedItems[item.id];
            const isOwner = selectedMemberId === 'owner';

            // Effective status
            const isAccessible = !isManuallyRevoked && rawPermission.status !== 'sealed';
            const statusLabel = isManuallyRevoked
              ? 'Access Revoked (Keys Voided)'
              : rawPermission.label;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isAccessible
                    ? 'bg-white border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300'
                    : 'bg-slate-50/70 border-slate-200/50 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isAccessible
                          ? 'bg-brand-50 text-brand-700 border border-brand-200/60'
                          : 'bg-slate-100 text-slate-400 border border-slate-200/60'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isAccessible ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Unlock className="w-3 h-3" />
                          <span>UNLOCKED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          <Lock className="w-3 h-3" />
                          <span>SEALED</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase block mb-1">
                    {item.category}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mb-2">
                    {item.title}
                  </h4>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                  <div className="text-[11px] font-medium text-slate-600 truncate max-w-[170px]">
                    {statusLabel}
                  </div>

                  {!isOwner && rawPermission.status !== 'sealed' && (
                    <button
                      onClick={() => handleToggleRevoke(item.id, item.title)}
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all active:scale-95 ${
                        isManuallyRevoked
                          ? 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 font-semibold'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      {isManuallyRevoked ? 'Restore Access' : 'Revoke 1-Click'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Simulation Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 max-w-md p-4 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs shadow-xl z-50 flex items-start gap-3 backdrop-blur-xl animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold text-slate-900 block">Audit Log Recorded</span>
              <span className="text-slate-600">{toastMessage}</span>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};

function memberBadgeClass(memberId: string) {
  switch (memberId) {
    case 'owner':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'partner':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'kids':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'trustee':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

