import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Share2,
  Shield,
  Clock,
  Trash2,
  Mail,
  Check,
  X,
  FileText,
  Paperclip,
  Download,
  AlertCircle,
  Loader2,
  ExternalLink,
  Crown,
  Eye,
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import type {
  Family,
  FamilyPendingInvite,
  ShareGrant,
  SharedItem,
  FamilyRole,
} from '../types';

export const FamilyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'groups' | 'inbound' | 'outbound'>('groups');

  // Groups state
  const [families, setFamilies] = useState<Family[]>([]);
  const [pendingInvites, setPendingInvites] = useState<FamilyPendingInvite[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);

  // Modals state
  const [createFamilyOpen, setCreateFamilyOpen] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<FamilyRole>('member');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Shares state
  const [inboundShares, setInboundShares] = useState<ShareGrant[]>([]);
  const [outboundShares, setOutboundShares] = useState<ShareGrant[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  // Shared item viewer modal
  const [viewingSharedItem, setViewingSharedItem] = useState<SharedItem | null>(null);
  const [loadingItemDetail, setLoadingItemDetail] = useState(false);

  useEffect(() => {
    loadFamilyData();
    loadSharesData();
  }, []);

  const loadFamilyData = async () => {
    setLoadingGroups(true);
    try {
      const [fams, invites] = await Promise.all([
        vaultApi.getFamilies(),
        vaultApi.getPendingFamilyInvites(),
      ]);
      setFamilies(fams);
      setPendingInvites(invites);
      if (fams.length > 0 && !selectedFamily) {
        // Load details for first family
        const details = await vaultApi.getFamily(fams[0].id);
        setSelectedFamily(details);
      }
    } catch (err: any) {
      console.error('Failed to load family data', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadSharesData = async () => {
    setLoadingShares(true);
    try {
      const [inbound, outbound] = await Promise.all([
        vaultApi.getInboundShares(),
        vaultApi.getOutboundShares(),
      ]);
      setInboundShares(inbound);
      setOutboundShares(outbound);
    } catch (err: any) {
      console.error('Failed to load shares', err);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleSelectFamily = async (famId: string) => {
    try {
      const details = await vaultApi.getFamily(famId);
      setSelectedFamily(details);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load family details');
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const newFam = await vaultApi.createFamily(newFamilyName.trim());
      setNewFamilyName('');
      setCreateFamilyOpen(false);
      await loadFamilyData();
      setSelectedFamily(newFam);
      setActionSuccess('Family group created successfully!');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to create family group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamily || !inviteEmail.trim()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await vaultApi.inviteFamilyMember(selectedFamily.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteModalOpen(false);
      const updated = await vaultApi.getFamily(selectedFamily.id);
      setSelectedFamily(updated);
      setActionSuccess(`Invitation sent to ${inviteEmail}!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to send invite');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespondInvite = async (inviteId: string, status: 'accepted' | 'rejected') => {
    try {
      await vaultApi.respondFamilyInvite(inviteId, status);
      await loadFamilyData();
      setActionSuccess(status === 'accepted' ? 'You joined the family group!' : 'Invite declined');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to respond to invite');
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!selectedFamily) return;
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await vaultApi.removeFamilyMember(selectedFamily.id, targetUserId);
      const updated = await vaultApi.getFamily(selectedFamily.id);
      setSelectedFamily(updated);
      setActionSuccess('Member removed.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove member');
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!confirm('Revoke access immediately? Recipient will no longer be able to view this resource.')) return;
    try {
      await vaultApi.revokeShare(shareId);
      await loadSharesData();
      setActionSuccess('Access revoked immediately.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to revoke share');
    }
  };

  const handleOpenSharedItem = async (itemId: string) => {
    setLoadingItemDetail(true);
    try {
      const item = await vaultApi.getSharedItem(itemId);
      setViewingSharedItem(item);
    } catch (err: any) {
      alert(err.message || 'Failed to open shared item. Access may have expired or been revoked.');
    } finally {
      setLoadingItemDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Users className="w-7 h-7 text-brand-400" />
            <span>Family Vault & Sharing</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your family group, coordinate trusted access, and inspect shared vault records.
          </p>
        </div>

        {/* Create Family Button */}
        <button
          onClick={() => setCreateFamilyOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Family Group</span>
        </button>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="p-3.5 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center space-x-2.5 text-xs text-teal-400 animate-fade-in">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2.5 text-xs text-red-400 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Pending Invitations Banner */}
      {pendingInvites.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-brand-600/20 via-brand-500/10 to-teal-500/10 border border-brand-500/30 rounded-2xl shadow-lg space-y-3">
          <div className="flex items-center space-x-2 text-brand-400 text-sm font-semibold">
            <Mail className="w-4 h-4" />
            <span>Pending Family Invitations</span>
          </div>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-900/80 border border-slate-800 rounded-xl gap-3"
              >
                <div>
                  <span className="text-sm font-medium text-white">{inv.familyName}</span>
                  <span className="text-xs text-slate-400 block">
                    Invited by {inv.invitedByEmail || 'Family Administrator'} • Role: {inv.role}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRespondInvite(inv.id, 'accepted')}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => handleRespondInvite(inv.id, 'rejected')}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'groups'
              ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Family Groups</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-slate-300">
            {families.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inbound')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'inbound'
              ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Shared With Me</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-slate-300">
            {inboundShares.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('outbound')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'outbound'
              ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Shared By Me</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-slate-300">
            {outboundShares.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Family Groups */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Families List Sidebar */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Your Family Vaults
            </h3>
            {loadingGroups ? (
              <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                <span>Loading families...</span>
              </div>
            ) : families.length === 0 ? (
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">You don't belong to any family group yet.</p>
                <button
                  onClick={() => setCreateFamilyOpen(true)}
                  className="px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 text-brand-400 text-xs font-semibold rounded-lg transition-colors"
                >
                  Create Your First Group
                </button>
              </div>
            ) : (
              families.map((fam) => (
                <div
                  key={fam.id}
                  onClick={() => handleSelectFamily(fam.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedFamily?.id === fam.id
                      ? 'bg-slate-850 border-brand-500/40 shadow-lg shadow-brand-500/5'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{fam.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-brand-400 border border-brand-500/20">
                      {fam.userRole === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-400 mt-2">
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3 text-slate-500" />
                      <span>{fam.memberCount} members</span>
                    </span>
                    <span>•</span>
                    <span>Created {new Date(fam.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Family Details & Member Roster */}
          <div className="lg:col-span-2">
            {selectedFamily ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                      <span>{selectedFamily.name}</span>
                      <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                        {selectedFamily.members.length} members
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Established on {new Date(selectedFamily.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {selectedFamily.userRole === 'admin' && (
                    <button
                      onClick={() => setInviteModalOpen(true)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-semibold text-xs rounded-xl shadow-md shadow-brand-500/10 transition-colors self-start sm:self-auto"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Invite Member</span>
                    </button>
                  )}
                </div>

                {/* Member Roster */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Member Roster & Permissions
                  </h4>
                  <div className="space-y-2">
                    {selectedFamily.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 uppercase border border-slate-700">
                            {member.displayName?.slice(0, 2) || member.email?.slice(0, 2) || 'FM'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-white">
                                {member.displayName || member.email}
                              </span>
                              {member.role === 'admin' ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  <Crown className="w-2.5 h-2.5" />
                                  <span>Admin</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                                  Member
                                </span>
                              )}
                              {member.status === 'pending' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  Pending Invite
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">{member.email}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        {selectedFamily.userRole === 'admin' && member.role !== 'admin' && (
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
                Select a family group to inspect members and manage invitations.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Shared With Me (Inbound) */}
      {activeTab === 'inbound' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Documents & Items Granted to You
            </h3>
            <span className="text-xs text-slate-500">{inboundShares.length} shared records</span>
          </div>

          {loadingShares ? (
            <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              <span>Checking permissions...</span>
            </div>
          ) : inboundShares.length === 0 ? (
            <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
              <Shield className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">No items shared with you</p>
              <p className="text-xs text-slate-500">
                When a family member or user grants you access to a document or note, it appears here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inboundShares.map((share) => (
                <div
                  key={share.id}
                  className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                        <FileText className="w-3 h-3" />
                        <span className="capitalize">{share.resourceType}</span>
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                        {share.permissions === 'view' ? 'View Only' : 'Can Edit'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white leading-snug truncate">
                      {share.resourceTitle || 'Shared Document'}
                    </h4>

                    <div className="space-y-1 text-xs text-slate-400">
                      <p className="flex items-center space-x-1.5 text-slate-400">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span className="truncate">Shared by {share.ownerEmail || 'Vault Owner'}</span>
                      </p>
                      {share.expiresAt && (
                        <p className="flex items-center space-x-1.5 text-amber-400">
                          <Clock className="w-3 h-3" />
                          <span>Expires {new Date(share.expiresAt).toLocaleDateString()}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenSharedItem(share.resourceId)}
                    disabled={loadingItemDetail}
                    className="w-full mt-2 py-2 px-3 bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 text-brand-300 text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Record</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Shared By Me (Outbound) */}
      {activeTab === 'outbound' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Access Grants Given to Others
            </h3>
            <span className="text-xs text-slate-500">{outboundShares.length} active shares</span>
          </div>

          {loadingShares ? (
            <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              <span>Loading access grants...</span>
            </div>
          ) : outboundShares.length === 0 ? (
            <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
              <Share2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">You haven't shared any vault items</p>
              <p className="text-xs text-slate-500">
                You can share individual documents or notes securely from your Vault page with granular permissions.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Resource</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Permission</th>
                      <th className="py-3 px-4">Expires</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {outboundShares.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white block max-w-xs truncate">
                            {s.resourceTitle || 'Untitled Item'}
                          </span>
                          <span className="text-[10px] text-slate-500 capitalize">{s.resourceType}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {s.recipientEmail || 'Registered User'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-brand-300">
                            {s.permissions === 'view' ? 'View Only' : 'Can Edit'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : 'Indefinite'}
                        </td>
                        <td className="py-3 px-4">
                          {s.isActive ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-500">
                              Revoked / Expired
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {s.isActive && (
                            <button
                              onClick={() => handleRevokeShare(s.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-lg transition-colors border border-rose-500/20"
                            >
                              Revoke Access
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Family Group */}
      {createFamilyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Users className="w-4 h-4 text-brand-400" />
                <span>Create Family Group</span>
              </h3>
              <button
                onClick={() => setCreateFamilyOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFamily} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Family Group Name
                </label>
                <input
                  type="text"
                  required
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  placeholder="e.g. The Anderson Household"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateFamilyOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-slate-950 text-xs font-semibold rounded-xl transition-all"
                >
                  {submitting ? 'Creating...' : 'Create Family'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invite Family Member */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-brand-400" />
                <span>Invite Family Member</span>
              </h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInviteMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Member Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="family.member@example.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Recipient must be a registered Ownly account holder.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Assigned Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteRole('member')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      inviteRole === 'member'
                        ? 'bg-brand-500/15 border-brand-500 text-brand-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteRole('admin')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      inviteRole === 'admin'
                        ? 'bg-brand-500/15 border-brand-500 text-brand-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Administrator
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-slate-950 text-xs font-semibold rounded-xl transition-all"
                >
                  {submitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Shared Item Details */}
      {viewingSharedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white truncate max-w-md">
                    {viewingSharedItem.title}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Shared by {viewingSharedItem.ownerEmail || 'Vault Owner'} • {viewingSharedItem.permissions === 'view' ? 'View Only' : 'Can Edit'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingSharedItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {viewingSharedItem.description && (
                <div>
                  <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Description
                  </h5>
                  <p className="text-sm text-slate-300">{viewingSharedItem.description}</p>
                </div>
              )}

              {viewingSharedItem.content && (
                <div>
                  <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Content
                  </h5>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 whitespace-pre-wrap font-mono">
                    {viewingSharedItem.content}
                  </div>
                </div>
              )}

              {viewingSharedItem.url && (
                <div>
                  <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Bookmark URL
                  </h5>
                  <a
                    href={viewingSharedItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-brand-400 hover:underline flex items-center space-x-1"
                  >
                    <span>{viewingSharedItem.url}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Attachments */}
              {viewingSharedItem.files && viewingSharedItem.files.length > 0 && (
                <div>
                  <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Authorized Attachments ({viewingSharedItem.files.length})
                  </h5>
                  <div className="space-y-2">
                    {viewingSharedItem.files.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl"
                      >
                        <div className="flex items-center space-x-2.5 truncate mr-3">
                          <Paperclip className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <span className="text-xs text-white truncate font-medium">
                            {f.originalName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({(f.sizeBytes / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={`/api/shares/files/${f.id}/download?preview=true`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Preview</span>
                          </a>
                          <a
                            href={`/api/shares/files/${f.id}/download`}
                            download={f.originalName}
                            className="px-2.5 py-1 bg-brand-500 hover:bg-brand-600 text-slate-950 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t border-slate-800 bg-slate-900/50">
              <button
                onClick={() => setViewingSharedItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
