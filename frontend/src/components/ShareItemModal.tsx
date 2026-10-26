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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-black/[0.08] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Share Resource</h2>
              <p className="text-xs text-slate-500 truncate max-w-[240px]">{resourceTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200/80 rounded-2xl flex items-center space-x-2.5 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center space-x-2.5 text-xs text-emerald-700 font-medium">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Share grant created successfully!</span>
            </div>
          )}

          {/* Recipient Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Recipient Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="family.member@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-200 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Recipient must be a registered Arkive user.
            </p>
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Permission Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPermissions('view')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  permissions === 'view'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs border-slate-100'
                    : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>View Only</span>
              </button>
              <button
                type="button"
                onClick={() => setPermissions('edit')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  permissions === 'edit'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs border-slate-100'
                    : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Can Edit</span>
              </button>
            </div>
          </div>

          {/* Expiration Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Expiry Date (Optional)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-200 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Leave blank for indefinite access until manually revoked.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98]"
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

