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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">Create New Collection</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
              Collection Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Identity & Passports, Healthcare, Vehicles"
              className="w-full bg-slate-850 border border-slate-750 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief note about what belongs here"
              className="w-full bg-slate-850 border border-slate-750 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
              Parent Collection (Nesting)
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full bg-slate-850 border border-slate-750 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
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
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
              Choose Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ICONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-brand-600/20 border-brand-500 text-brand-400 shadow-md shadow-brand-500/10'
                        : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <IconComp className="w-5 h-5 mb-1" />
                    <span className="text-[10px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors shadow-lg shadow-brand-600/25 disabled:opacity-50"
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

