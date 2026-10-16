import React, { useState, useRef } from 'react';
import {
  X,
  FileText,
  Link as LinkIcon,
  Layers,
  Upload,
  Plus,
  Trash2,
  Loader2,
  Star,
  Calendar,
  Clock,
  FileCheck
} from 'lucide-react';
import type { Collection, ItemKind } from '../types';
import { vaultApi } from '../lib/vaultApi';

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  defaultCollectionId?: string | null;
  onSuccess: () => void;
  onSubmit: (data: {
    title: string;
    kind: ItemKind;
    description: string;
    collectionId: string | null;
    tags: string[];
    customFields: Record<string, any>;
    content: string | null;
    url: string | null;
    favorite: boolean;
    eventDate: string | null;
    expiresAt: string | null;
  }) => Promise<void>;
}

export const CreateItemModal: React.FC<CreateItemModalProps> = ({
  isOpen,
  onClose,
  collections,
  defaultCollectionId,
  onSuccess,
  onSubmit,
}) => {
  const [kind, setKind] = useState<ItemKind>('file'); // Default to file upload!
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [collectionId, setCollectionId] = useState<string>(defaultCollectionId || '');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic custom fields for 'record'
  const [customFieldsList, setCustomFieldsList] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title.trim()) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleAddField = () => {
    setCustomFieldsList([...customFieldsList, { key: '', value: '' }]);
  };

  const handleRemoveField = (index: number) => {
    setCustomFieldsList(customFieldsList.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...customFieldsList];
    updated[index][field] = val;
    setCustomFieldsList(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (kind === 'file' && !selectedFile) {
      setError('Please choose a file from your computer to upload.');
      return;
    }

    if (kind === 'link' && !url.trim()) {
      setError('Please provide a URL for this web link item.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (kind === 'file' && selectedFile) {
        // Direct file upload to GridFS
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title.trim());
        if (collectionId) formData.append('collectionId', collectionId);

        await vaultApi.uploadDirectFile(formData);
        onSuccess();
      } else {
        // Notes, Links, or Records
        const tags = tagsInput
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0);

        const customFields: Record<string, any> = {};
        customFieldsList.forEach((f) => {
          if (f.key.trim() && f.value.trim()) {
            customFields[f.key.trim()] = f.value.trim();
          }
        });

        await onSubmit({
          title: title.trim(),
          kind,
          description: description.trim(),
          collectionId: collectionId ? collectionId : null,
          tags,
          customFields,
          content: kind === 'note' ? content.trim() : null,
          url: kind === 'link' ? url.trim() : null,
          favorite,
          eventDate: eventDate ? new Date(eventDate).toISOString() : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        });
      }

      // Reset form
      setTitle('');
      setDescription('');
      setContent('');
      setUrl('');
      setTagsInput('');
      setSelectedFile(null);
      setFavorite(false);
      setEventDate('');
      setExpiresAt('');
      setCustomFieldsList([{ key: '', value: '' }]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create item.');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl shadow-black/60 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">New Vault Item</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Kind Selector Tabs (Now includes File Upload!) */}
        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/40 p-2 gap-1.5">
          <button
            type="button"
            onClick={() => setKind('file')}
            className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              kind === 'file'
                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>

          <button
            type="button"
            onClick={() => setKind('note')}
            className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              kind === 'note'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Note</span>
          </button>

          <button
            type="button"
            onClick={() => setKind('link')}
            className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              kind === 'link'
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Web Link</span>
          </button>

          <button
            type="button"
            onClick={() => setKind('record')}
            className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              kind === 'record'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Record</span>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* File Upload Drop Zone */}
          {kind === 'file' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                File *
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.json,.docx"
              />

              {!selectedFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex w-full flex-col items-center rounded-2xl border border-dashed border-white/15 bg-slate-950/40 px-6 py-8 text-center transition-colors hover:border-brand-400/50 hover:bg-brand-500/[0.04]"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/[0.05] text-slate-400 ring-1 ring-inset ring-white/10 transition-colors group-hover:bg-brand-500/10 group-hover:text-brand-300 group-hover:ring-brand-400/30">
                    <Upload className="h-6 w-6" />
                  </span>
                  <span className="mt-3 text-sm font-semibold text-slate-100">Choose a file to upload</span>
                  <span className="mt-1 text-xs text-slate-500">PDF, PNG, JPG, WEBP, TXT or JSON, up to 25 MB</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-brand-400/25 bg-brand-500/[0.05] p-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-300 ring-1 ring-inset ring-brand-400/20">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove file"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="icon-btn hover:text-rose-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
              Item Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === 'file'
                  ? 'e.g. Passport Scan, Health Insurance Policy'
                  : kind === 'note'
                  ? 'e.g. WiFi Passwords, Tax Checklist'
                  : kind === 'link'
                  ? 'e.g. Medical Portal, Bank Login'
                  : 'e.g. Identity Card, Employment Agreement'
              }
              className="w-full bg-slate-850 border border-slate-750 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Collection Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
              Assign to Collection
            </label>
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              className="w-full bg-slate-850 border border-slate-750 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Uncollected (Root Vault)</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Note Specific */}
          {kind === 'note' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Note Content
              </label>
              <textarea
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your private note or instructions..."
                className="w-full bg-slate-850 border border-slate-750 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono text-xs"
              />
            </div>
          )}

          {/* Link Specific */}
          {kind === 'link' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Target URL *
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/portal"
                className="w-full bg-slate-850 border border-slate-750 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          )}

          {/* Record Specific */}
          {kind === 'record' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Custom Key-Value Fields
                </label>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Field</span>
                </button>
              </div>

              {customFieldsList.map((f, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Field name (e.g. Policy #)"
                    value={f.key}
                    onChange={(e) => handleFieldChange(idx, 'key', e.target.value)}
                    className="flex-1 bg-slate-850 border border-slate-750 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. POL-88229)"
                    value={f.value}
                    onChange={(e) => handleFieldChange(idx, 'value', e.target.value)}
                    className="flex-1 bg-slate-850 border border-slate-750 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  {customFieldsList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveField(idx)}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional context or notes"
              className="w-full bg-slate-850 border border-slate-750 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
              Tags (Comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="insurance, medical, tax, priority"
              className="w-full bg-slate-850 border border-slate-750 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Event Date</span>
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-slate-850 border border-slate-750 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Expires At</span>
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full bg-slate-850 border border-slate-750 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Favorite */}
          {kind !== 'file' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setFavorite(!favorite)}
                className={`flex items-center space-x-2 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                  favorite
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Star className={`w-4 h-4 ${favorite ? 'fill-amber-400' : ''}`} />
                <span>{favorite ? 'Starred as Favorite' : 'Mark as Favorite'}</span>
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors shadow-lg shadow-brand-600/25 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{kind === 'file' ? 'Upload to Vault' : 'Save to Vault'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
