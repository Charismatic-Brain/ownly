import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileText,
  Link as LinkIcon,
  Layers,
  Star,
  ExternalLink,
  Trash2,
  Calendar,
  Clock,
  Tag,
  Copy,
  Check,
  Download,
  Eye,
  Paperclip,
  Upload,
  Loader2,
  Share2,
  Lock,
} from 'lucide-react';
import type { Item, Collection } from '../types';
import { vaultApi } from '../lib/vaultApi';
import { ShareItemModal } from './ShareItemModal';
import { fileIconFor, formatFileSize } from './ItemCard';

interface ItemDetailModalProps {
  item: Item | null;
  collections: Collection[];
  onClose: () => void;
  onRefresh: () => void;
  onToggleFavorite: (id: string) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  collections,
  onClose,
  onRefresh,
  onToggleFavorite,
  onDeleteItem,
}) => {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Escape to dismiss QuickLook
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === 'Escape' && !isTyping) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!item) return null;

  const collection = collections.find((c) => c.id === item.collectionId);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (confirm('Move this item to trash? You can restore it later.')) {
      setDeleting(true);
      await onDeleteItem(item.id);
      setDeleting(false);
      onClose();
    }
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploadingAttachment(true);
    try {
      await vaultApi.uploadAttachment(item.id, formData);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to attach file');
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (fileId: string) => {
    if (confirm('Delete this file from your private vault?')) {
      try {
        await vaultApi.deleteFile(fileId);
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'Failed to delete file');
      }
    }
  };

  const getKindBadge = () => {
    switch (item.kind) {
      case 'file':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/15 text-brand-300 border border-brand-500/30">
            <Paperclip className="w-3 h-3" />
            <span>File</span>
          </span>
        );
      case 'note':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <FileText className="w-3 h-3" />
            <span>Note</span>
          </span>
        );
      case 'link':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <LinkIcon className="w-3 h-3" />
            <span>Link</span>
          </span>
        );
      case 'record':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Layers className="w-3 h-3" />
            <span>Record</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            <span>{item.kind}</span>
          </span>
        );
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-surface max-w-2xl bg-slate-900 border border-white/10 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* macOS QuickLook Sheet Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-950/70 backdrop-blur-xl">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            {getKindBadge()}
            {collection && (
              <span className="text-xs text-slate-300 bg-white/[0.06] border border-white/[0.08] px-2.5 py-0.5 rounded-full font-medium truncate max-w-[160px]">
                {collection.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-300 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-full">
              <Lock className="w-2.5 h-2.5" />
              AES-256-GCM
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleFavorite(item.id)}
              className="icon-btn h-8 w-8 hover:text-amber-400"
              title="Toggle Favorite"
              aria-label="Toggle Favorite"
            >
              <Star className={`w-4 h-4 ${item.favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
            </button>
            <button
              onClick={onClose}
              className="icon-btn h-8 w-8"
              aria-label="Close QuickLook"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Item Title Bar */}
        <div className="px-6 pt-5 pb-3 bg-slate-900">
          <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
            {item.title}
          </h3>
          {item.description && (
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* QuickLook Inspection Body */}
        <div className="px-6 py-4 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Note content viewer */}
          {item.kind === 'note' && item.content && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Decrypted Note
                </h4>
                <button
                  onClick={() => handleCopy(item.content!)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-brand-300 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="bg-slate-950/80 border border-white/[0.07] rounded-xl p-4 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                {item.content}
              </div>
            </div>
          )}

          {/* Link URL preview */}
          {item.kind === 'link' && item.url && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Target Link
              </h4>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-950/80 border border-white/[0.08] hover:border-brand-500/50 text-brand-300 text-xs font-medium transition-colors w-full break-all"
              >
                <span className="truncate">{item.url}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              </a>
            </div>
          )}

          {/* Record custom fields */}
          {item.kind === 'record' && Object.keys(item.customFields || {}).length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Record Attributes
              </h4>
              <div className="rounded-xl border border-white/[0.07] overflow-hidden divide-y divide-white/[0.06] bg-slate-950/60">
                {Object.entries(item.customFields).map(([k, v]) => (
                  <div key={k} className="flex justify-between p-3 text-xs">
                    <span className="font-medium text-slate-400">{k}</span>
                    <span className="text-slate-100 font-mono tabular-nums">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Files & Attachments Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Paperclip className="h-3.5 w-3.5 text-brand-400" />
                Attached Assets
                {item.files && item.files.length > 0 && (
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.2 text-[10px] font-semibold tabular-nums text-slate-300">
                    {item.files.length}
                  </span>
                )}
              </h4>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAttachFile}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.json,.docx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="btn-secondary !text-xs !h-7 !px-2.5"
                >
                  {uploadingAttachment ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  Attach File
                </button>
              </div>
            </div>

            {item.files && item.files.length > 0 ? (
              <ul className="space-y-2">
                {item.files.map((file) => {
                  const FileTypeIcon = fileIconFor(file.mimeType);
                  return (
                    <li
                      key={file.id}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-slate-950/70 p-3"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-300 ring-1 ring-inset ring-brand-400/20">
                        <FileTypeIcon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white" title={file.originalName}>
                          {file.originalName}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 tabular-nums">
                          {formatFileSize(file.sizeBytes)} · {file.mimeType}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => vaultApi.downloadFile(file.id, file.originalName, true)}
                          className="icon-btn h-7 w-7 hover:text-brand-300"
                          title="Instant Preview"
                          aria-label={`Preview ${file.originalName}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => vaultApi.downloadFile(file.id, file.originalName, false)}
                          className="icon-btn h-7 w-7"
                          title="Download Decrypted File"
                          aria-label={`Download ${file.originalName}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAttachment(file.id)}
                          className="icon-btn h-7 w-7 hover:text-rose-300"
                          title="Delete File"
                          aria-label={`Delete ${file.originalName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 px-4 py-4 text-center text-xs text-slate-500">
                No encrypted files attached to this entry.
              </p>
            )}
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span>Tags</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-white/[0.06]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cryptographic Provenance & Dates */}
          <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-white/[0.07] text-xs text-slate-400">
            {item.eventDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Event Date</span>
                  <span className="text-slate-300 tabular-nums">{new Date(item.eventDate).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            {item.expiresAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Expires</span>
                  <span className="text-amber-400 font-semibold tabular-nums">{new Date(item.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            <div className="col-span-2 text-[10px] text-slate-500 tabular-nums">
              Created {new Date(item.createdAt).toLocaleString()} · Updated {new Date(item.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* QuickLook Sheet Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/[0.08] bg-slate-950/70 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShareOpen(true)}
              className="btn-secondary !text-xs !py-1 !px-3"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger !text-xs !py-1 !px-3"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Move to Trash</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="btn-ghost !text-xs !py-1 !px-3.5"
          >
            Done
          </button>
        </div>
      </div>

      <ShareItemModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        resourceId={item.id}
        resourceTitle={item.title}
        resourceType="item"
      />
    </div>
  );
};
