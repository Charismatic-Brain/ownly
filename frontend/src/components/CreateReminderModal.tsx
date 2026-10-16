import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Bell,
  AlertCircle
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import type { ReminderPriority } from '../types';

interface CreateReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItemId?: string | null;
}

export const CreateReminderModal: React.FC<CreateReminderModalProps> = ({
  isOpen,
  onClose,
  initialItemId,
}) => {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [priority, setPriority] = useState<ReminderPriority>('medium');
  const [itemId, setItemId] = useState<string>(initialItemId || '');
  const [error, setError] = useState<string | null>(null);

  // Fetch items for linking dropdown
  const { data: itemsResponse } = useQuery({
    queryKey: ['items', 'for-reminder'],
    queryFn: () => vaultApi.getItems({ limit: 100 }),
    enabled: isOpen,
  });
  const items = itemsResponse?.items || [];

  const createMutation = useMutation({
    mutationFn: vaultApi.createReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      handleClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create reminder');
    },
  });

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setRemindAt('');
    setPriority('medium');
    setItemId(initialItemId || '');
    setError(null);
    onClose();
  };

  const handleQuickDate = (daysAhead: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    target.setHours(9, 0, 0, 0); // Default to 9:00 AM

    // Format for datetime-local (YYYY-MM-DDTHH:mm)
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const hours = String(target.getHours()).padStart(2, '0');
    const mins = String(target.getMinutes()).padStart(2, '0');

    setRemindAt(`${year}-${month}-${day}T${hours}:${mins}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!remindAt) {
      setError('Please set a reminder due date and time');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      remindAt: new Date(remindAt).toISOString(),
      priority,
      itemId: itemId || null,
      channel: 'in_app',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Create Reminder</h2>
              <p className="text-xs text-slate-400">Set in-app alerts and track critical life deadlines</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Reminder Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Renew Health Insurance, Passport Expiry, Bill payment"
              className="w-full bg-slate-850 border border-slate-750 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>

          {/* Due Date & Time */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Due Date & Time <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                required
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                className="w-full bg-slate-850 border border-slate-750 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>

            {/* Quick date chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 mr-1">Quick set:</span>
              {[
                { label: 'Tomorrow', days: 1 },
                { label: 'In 3 Days', days: 3 },
                { label: 'Next Week', days: 7 },
                { label: 'In 1 Month', days: 30 },
              ].map((q) => (
                <button
                  type="button"
                  key={q.label}
                  onClick={() => handleQuickDate(q.days)}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700 transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'urgent'] as ReminderPriority[]).map((p) => {
                const isSelected = priority === p;
                const colors = {
                  low: isSelected ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-850 text-slate-400 border-slate-750',
                  medium: isSelected ? 'bg-brand-600/30 text-brand-300 border-brand-500/40' : 'bg-slate-850 text-slate-400 border-slate-750',
                  high: isSelected ? 'bg-amber-600/30 text-amber-300 border-amber-500/40' : 'bg-slate-850 text-slate-400 border-slate-750',
                  urgent: isSelected ? 'bg-rose-600/30 text-rose-300 border-rose-500/40' : 'bg-slate-850 text-slate-400 border-slate-750',
                };
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize border transition-colors ${colors[p]}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linked Vault Item (Optional) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Link to Vault Item <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full bg-slate-850 border border-slate-750 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="">-- No item linked --</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  [{it.kind.toUpperCase()}] {it.title}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Notes & Context <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Add policy number, renewal link, or instruction notes..."
              className="w-full bg-slate-850 border border-slate-750 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-brand-600/20 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
