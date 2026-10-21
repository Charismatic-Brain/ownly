import React, { useState } from 'react';
import { X, Folder, Heart, Briefcase, Landmark, FileText, Shield, Car, Plane, Key, Loader2 } from 'lucide-react';
import type { Collection } from '../types';

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  onSubmit: (data: { name: string; description: string; icon: string; parentId: string | null }) => Promise<void>;
}

const ICONS = [
  { name: 'folder', icon: Folder, label: 'General' },
  { name: 'heart-pulse', icon: Heart, label: 'Health' },
  { name: 'briefcase', icon: Briefcase, label: 'Work' },
  { name: 'landmark', icon: Landmark, label: 'Finance' },
  { name: 'file-text', icon: FileText, label: 'Docs' },
  { name: 'shield', icon: Shield, label: 'Security' },
  { name: 'car', icon: Car, label: 'Vehicles' },
  { name: 'plane', icon: Plane, label: 'Travel' },
  { name: 'key', icon: Key, label: 'Accounts' },
];

export const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
  isOpen,
  onClose,
  collections,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [parentId, setParentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        icon: selectedIcon,
        parentId: parentId ? parentId : null,
      });
      setName('');
      setDescription('');
      setSelectedIcon('folder');
      setParentId('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create collection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-surface max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-900/60">
          <h3 className="text-base font-bold text-white tracking-tight">Create New Collection</h3>
          <button
            onClick={onClose}
            className="icon-btn min-h-[36px] min-w-[36px]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="field-label">Collection Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Identity & Passports, Healthcare, Vehicles"
              className="field"
            />
          </div>

          <div>
            <label className="field-label">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief note about what belongs here"
              className="field"
            />
          </div>

          <div>
            <label className="field-label">Parent Collection (Nesting)</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="field cursor-pointer"
            >
              <option value="">None (Top-Level Root Collection)</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label mb-2">Choose Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {ICONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-150 active:scale-95 select-none ${
                      isSelected
                        ? 'bg-brand-500/20 border-brand-500/50 text-brand-300 shadow-sm'
                        : 'bg-slate-950/40 border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <IconComp className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn btn-primary"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create Collection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
