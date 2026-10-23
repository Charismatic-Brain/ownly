import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Share2,
  Shield,
  Trash2,
  Mail,
  Check,
  X,
  Paperclip,
  Download,
  AlertCircle,
  Loader2,
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
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Family Vault & Sharing</h1>
          <p className="mt-1 max-w-xl text-xs text-slate-400 sm:text-sm">
            Coordinate sovereign family access, manage circles, and inspect cryptographic shared items.
          </p>
        </div>

        <button
          onClick={() => setCreateFamilyOpen(true)}
          className="btn-primary !text-xs !py-1.5 !px-3.5 self-start sm:self-auto"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>New Family Group</span>
        </button>
      </header>

      {/* Global Status Alerts */}
      {actionSuccess && (
        <div className="panel p-3 border-teal-500/25 bg-teal-500/10 flex items-center gap-2 text-xs text-teal-300 animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="panel p-3 border-rose-500/25 bg-rose-500/10 flex items-center gap-2 text-xs text-rose-300 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Pending Invitations Banner */}
      {pendingInvites.length > 0 && (
        <div className="panel p-4 border-brand-500/30 bg-slate-900/90 space-y-3 shadow-lift">
          <div className="flex items-center gap-2 text-brand-300 text-xs font-semibold uppercase tracking-wider">
            <Mail className="w-4 h-4" />
            <span>Pending Family Invitations</span>
          </div>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-950/80 border border-white/[0.07] rounded-xl gap-3"
              >
                <div>
                  <span className="text-xs font-semibold text-white">{inv.familyName}</span>
                  <span className="text-[11px] text-slate-400 block">
                    Invited by {inv.invitedByEmail || 'Family Administrator'} · Role: {inv.role}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRespondInvite(inv.id, 'accepted')}
                    className="btn-primary !text-xs !py-1 !px-3"
                  >
                    <Check className="w-3 h-3" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => handleRespondInvite(inv.id, 'rejected')}
                    className="btn-ghost !text-xs !py-1 !px-3"
                  >
                    <X className="w-3 h-3" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recessed Segmented Navigation */}
      <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
        <div className="segmented-track">
          <button
            onClick={() => setActiveTab('groups')}
            className={`segmented-item ${activeTab === 'groups' ? 'segmented-item-active' : ''}`}
          >
            Family Circles ({families.length})
          </button>
          <button
            onClick={() => setActiveTab('inbound')}
            className={`segmented-item ${activeTab === 'inbound' ? 'segmented-item-active' : ''}`}
          >
            Shared With Me ({inboundShares.length})
          </button>
          <button
            onClick={() => setActiveTab('outbound')}
            className={`segmented-item ${activeTab === 'outbound' ? 'segmented-item-active' : ''}`}
          >
            Shared By Me ({outboundShares.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Family Groups */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] gap-6 items-start">
          {/* Families List Rail */}
          <div className="panel p-3 space-y-2">
            <h3 className="source-list-header !p-1">Your Circles</h3>
            {loadingGroups ? (
              <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                <span>Loading circles...</span>
              </div>
            ) : families.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-white/10 text-center space-y-2">
                <Users className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">No family groups created.</p>
                <button
                  onClick={() => setCreateFamilyOpen(true)}
                  className="btn-primary !text-xs !py-1 !px-2.5 mt-1"
                >
                  Create Group
                </button>
              </div>
            ) : (
              families.map((fam) => (
                <div
                  key={fam.id}
                  onClick={() => handleSelectFamily(fam.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all select-none ${
                    selectedFamily?.id === fam.id
                      ? 'bg-slate-800/80 border-brand-500/40 shadow-sm'
                      : 'bg-slate-950/60 border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate pr-2">{fam.name}</span>
                    <span className="rounded bg-brand-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-brand-300 border border-brand-500/20 uppercase">
                      {fam.userRole === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 tabular-nums">
                    <span>{fam.memberCount} members</span>
                    <span>·</span>
                    <span>{new Date(fam.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Family Details & Member Roster */}
          <div className="min-w-0">
            {selectedFamily ? (
              <div className="panel p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{selectedFamily.name}</span>
                      <span className="text-xs font-normal text-slate-400 bg-slate-800 border border-white/[0.08] px-2 py-0.5 rounded-full tabular-nums">
                        {selectedFamily.members.length} members
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                      Circle created on {new Date(selectedFamily.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {selectedFamily.userRole === 'admin' && (
                    <button
                      onClick={() => setInviteModalOpen(true)}
                      className="btn-primary !text-xs !py-1 !px-3 self-start sm:self-auto"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Invite Member</span>
                    </button>
                  )}
                </div>

                {/* Member Roster */}
                <div className="space-y-2.5">
                  <h4 className="source-list-header !p-0">Member Roster & Permissions</h4>
                  <div className="space-y-1.5">
                    {selectedFamily.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-slate-950/70 border border-white/[0.06] rounded-xl"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 border border-white/10 uppercase">
                            {member.displayName?.slice(0, 2) || member.email?.slice(0, 2) || 'FM'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white truncate">
                                {member.displayName || member.email}
                              </span>
                              {member.role === 'admin' ? (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-amber-300 border border-amber-500/20">
                                  <Crown className="w-2.5 h-2.5" />
                                  <span>Admin</span>
                                </span>
                              ) : (
                                <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-medium text-slate-400">
                                  Member
                                </span>
                              )}
                              {member.status === 'pending' && (
                                <span className="rounded bg-purple-500/10 px-1.5 py-0.2 text-[9px] font-medium text-purple-300 border border-purple-500/20">
                                  Pending Invite
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 truncate block">{member.email}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        {selectedFamily.userRole === 'admin' && member.role !== 'admin' && (
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="icon-btn h-7 w-7 hover:text-rose-400"
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
              <div className="panel p-12 text-center text-slate-400 text-xs">
                Select a family group to inspect members and manage circle permissions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Shared With Me (Inbound) */}
      {activeTab === 'inbound' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="source-list-header !p-0">Items Granted to You</h3>
            <span className="text-xs text-slate-500 tabular-nums">{inboundShares.length} shared records</span>
          </div>

          {loadingShares ? (
            <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              <span>Verifying cryptographic access...</span>
            </div>
          ) : inboundShares.length === 0 ? (
            <div className="panel p-12 text-center space-y-2 border-dashed">
              <Shield className="w-7 h-7 text-slate-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">No items shared with you</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                When a family member or user grants you access to an encrypted document or note, it appears here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {inboundShares.map((share) => (
                <div
                  key={share.id}
                  className="panel p-4 space-y-3 flex flex-col justify-between hover:border-brand-500/25 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="rounded bg-brand-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-brand-300 border border-brand-500/20 uppercase">
                        {share.resourceType}
                      </span>
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        {share.expiresAt ? `Expires ${new Date(share.expiresAt).toLocaleDateString()}` : 'Never expires'}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white truncate">{share.resourceTitle}</h4>
                    <p className="text-[10px] text-slate-500">Shared by {share.ownerEmail || 'Family Member'}</p>
                  </div>

                  <button
                    onClick={() => handleOpenSharedItem(share.resourceId)}
                    disabled={loadingItemDetail}
                    className="btn-secondary !text-xs !py-1 w-full"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>QuickLook Preview</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Shared By Me (Outbound) */}
      {activeTab === 'outbound' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="source-list-header !p-0">Items You Granted</h3>
            <span className="text-xs text-slate-500 tabular-nums">{outboundShares.length} active shares</span>
          </div>

          {loadingShares ? (
            <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              <span>Loading shares...</span>
            </div>
          ) : outboundShares.length === 0 ? (
            <div className="panel p-12 text-center space-y-2 border-dashed">
              <Share2 className="w-7 h-7 text-slate-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">No active outbound shares</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                You haven't shared any vault items with others yet. Use the "Share" action inside any item card.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {outboundShares.map((share) => (
                <div
                  key={share.id}
                  className="panel p-4 space-y-3 flex flex-col justify-between hover:border-brand-500/25 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="rounded bg-brand-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-brand-300 border border-brand-500/20 uppercase">
                        {share.resourceType}
                      </span>
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        {share.expiresAt ? `Expires ${new Date(share.expiresAt).toLocaleDateString()}` : 'Indefinite'}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white truncate">{share.resourceTitle}</h4>
                    <p className="text-[10px] text-slate-500">Recipient: {share.recipientEmail || 'Member'}</p>
                  </div>

                  <button
                    onClick={() => handleRevokeShare(share.id)}
                    className="btn-danger !text-xs !py-1 w-full"
                  >
                    <span>Revoke Access</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Family Modal */}
      {createFamilyOpen && (
        <div className="modal-backdrop" onClick={() => setCreateFamilyOpen(false)}>
          <div className="modal-surface max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-950/70">
              <h2 className="text-sm font-semibold text-white">Create Family Circle</h2>
              <button onClick={() => setCreateFamilyOpen(false)} className="icon-btn h-8 w-8" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFamily} className="p-6 space-y-4">
              <div>
                <label className="field-label">Family Group Name</label>
                <input
                  type="text"
                  required
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  placeholder="e.g. Sharma Family Vault"
                  className="field !h-9 text-xs"
                />
              </div>
              <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2">
                <button type="button" onClick={() => setCreateFamilyOpen(false)} className="btn-ghost !text-xs !py-1 !px-3">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary !text-xs !py-1.5 !px-3.5">
                  {submitting ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="modal-backdrop" onClick={() => setInviteModalOpen(false)}>
          <div className="modal-surface max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-950/70">
              <h2 className="text-sm font-semibold text-white">Invite to {selectedFamily?.name}</h2>
              <button onClick={() => setInviteModalOpen(false)} className="icon-btn h-8 w-8" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInviteMember} className="p-6 space-y-4">
              <div>
                <label className="field-label">Member Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="family.member@example.com"
                  className="field !h-9 text-xs"
                />
              </div>
              <div>
                <label className="field-label">Role & Permissions</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as FamilyRole)}
                  className="field !h-9 text-xs"
                >
                  <option value="member">Member (Can view and access shared items)</option>
                  <option value="admin">Administrator (Can invite members and manage circle)</option>
                </select>
              </div>
              <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2">
                <button type="button" onClick={() => setInviteModalOpen(false)} className="btn-ghost !text-xs !py-1 !px-3">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary !text-xs !py-1.5 !px-3.5">
                  {submitting ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared Item Viewer Modal */}
      {viewingSharedItem && (
        <div className="modal-backdrop" onClick={() => setViewingSharedItem(null)}>
          <div className="modal-surface max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-950/70">
              <div className="flex items-center gap-2">
                <span className="rounded bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-300 border border-brand-500/20">
                  Shared Asset
                </span>
                <span className="text-xs text-slate-400">Granted by {viewingSharedItem.ownerEmail || 'Family Member'}</span>
              </div>
              <button onClick={() => setViewingSharedItem(null)} className="icon-btn h-8 w-8">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <h3 className="text-base font-bold text-white">{viewingSharedItem.title}</h3>
                {viewingSharedItem.description && (
                  <p className="text-xs text-slate-400 mt-1">{viewingSharedItem.description}</p>
                )}
              </div>

              {viewingSharedItem.content && (
                <div className="space-y-1">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Content</h4>
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-white/[0.07] text-xs font-mono text-slate-200 whitespace-pre-wrap">
                    {viewingSharedItem.content}
                  </div>
                </div>
              )}

              {viewingSharedItem.files && viewingSharedItem.files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Attached Files ({viewingSharedItem.files.length})
                  </h4>
                  <div className="space-y-1.5">
                    {viewingSharedItem.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-white/[0.07] text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                          <span className="text-white truncate">{file.originalName}</span>
                        </div>
                        <button
                          onClick={() => vaultApi.downloadFile(file.id, file.originalName, false)}
                          className="btn-secondary !text-xs !py-0.5 !px-2 shrink-0"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/[0.08] bg-slate-950/70 flex justify-end">
              <button onClick={() => setViewingSharedItem(null)} className="btn-ghost !text-xs !py-1 !px-3">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
