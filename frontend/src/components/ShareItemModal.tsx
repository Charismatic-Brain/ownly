import React, { useState } from 'react';
import { X, Share2, Mail, Shield, Calendar, Check, AlertCircle, Loader2 } from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import type { ResourceType, SharePermission } from '../types';

interface ShareItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: string;
  resourceTitle: string;
  resourceType?: ResourceType;
  onShared?: () => void;
}

export const ShareItemModal: React.FC<ShareItemModalProps> = ({
  isOpen,
  onClose,
  resourceId,
  resourceTitle,
  resourceType = 'item',
  onShared,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [permissions, setPermissions] = useState<SharePermission>('view');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      setError('Please enter a recipient email address.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await vaultApi.createShare({
        resourceType,
        resourceId,
        recipientEmail: recipientEmail.trim(),
        permissions,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setSuccess(true);
      if (onShared) onShared();
      setTimeout(() => {
        setSuccess(false);
        setRecipientEmail('');
        setExpiresAt('');
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to share item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-surface max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Share Resource</h2>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">{resourceTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center space-x-2.5 text-xs text-teal-400">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Share grant created successfully!</span>
            </div>
          )}

          {/* Recipient Email */}
          <div>
            <label className="field-label">
              Recipient Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="family.member@example.com"
                className="field pl-9"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Recipient must be a registered Ownly user.
            </p>
          </div>

          {/* Permissions */}
          <div>
            <label className="field-label">
              Permission Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPermissions('view')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all active:scale-[0.98] ${
                  permissions === 'view'
                    ? 'bg-brand-500/15 border-brand-500 text-brand-300 shadow-sm'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>View Only</span>
              </button>
              <button
                type="button"
                onClick={() => setPermissions('edit')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all active:scale-[0.98] ${
                  permissions === 'edit'
                    ? 'bg-brand-500/15 border-brand-500 text-brand-300 shadow-sm'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Can Edit</span>
              </button>
            </div>
          </div>

          {/* Expiration Date */}
          <div>
            <label className="field-label">
              Expiry Date (Optional)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="field pl-9"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Leave blank for indefinite access until manually revoked.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : success ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Shared</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Grant Access</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

