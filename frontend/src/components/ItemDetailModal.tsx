import React, { useState, useRef } from 'react';
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
  Share2
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
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/80">
            <Paperclip className="w-3 h-3" />
            <span>File</span>
          </span>
        );
      case 'note':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
            <FileText className="w-3 h-3" />
            <span>Note</span>
          </span>
        );
      case 'link':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
            <LinkIcon className="w-3 h-3" />
            <span>Link</span>
          </span>
        );
      case 'record':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
            <Layers className="w-3 h-3" />
            <span>Record</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span>{item.kind}</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white border border-black/[0.08] rounded-3xl w-full max-w-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="space-y-1.5 pr-4">
            <div className="flex items-center space-x-2">
              {getKindBadge()}
              {collection && (
                <span className="text-xs text-slate-600 bg-slate-200/70 font-medium px-2.5 py-0.5 rounded-full">
                  {collection.name}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-900 leading-snug tracking-tight">{item.title}</h3>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => onToggleFavorite(item.id)}
              className="p-2 rounded-xl text-slate-500 hover:text-amber-800 hover:bg-slate-100 transition-colors"
              title="Toggle Favorite"
            >
              <Star className={`w-5 h-5 ${item.favorite ? 'fill-amber-400 text-amber-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Description */}
          {item.description && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Description
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Attached files */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Paperclip className="h-4 w-4 text-teal-600" />
                Attached files
                {item.files && item.files.length > 0 && (
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium tabular-nums text-slate-600">
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
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-300 shadow-xs disabled:opacity-50"
                >
                  {uploadingAttachment ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Attach file
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
                      className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200/80">
                        <FileTypeIcon className="h-[18px] w-[18px]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900" title={file.originalName}>
                          {file.originalName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {formatFileSize(file.sizeBytes)} · {file.mimeType}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => vaultApi.downloadFile(file.id, file.originalName, true)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                          title="Preview"
                          aria-label={`Preview ${file.originalName}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => vaultApi.downloadFile(file.id, file.originalName, false)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                          title="Download"
                          aria-label={`Download ${file.originalName}`}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAttachment(file.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete"
                          aria-label={`Delete ${file.originalName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-5 text-center text-sm text-slate-500">
                No files attached yet.
              </p>
            )}
          </div>

          {/* Note content */}
          {item.kind === 'note' && item.content && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Content
                </h4>
                <button
                  onClick={() => handleCopy(item.content!)}
                  className="inline-flex items-center space-x-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
                {item.content}
              </div>
            </div>
          )}

          {/* Link URL */}
          {item.kind === 'link' && item.url && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Target Link
              </h4>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 hover:bg-sky-50 text-sky-800 text-sm font-medium transition-colors w-full break-all"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                <span>{item.url}</span>
              </a>
            </div>
          )}

          {/* Record custom fields */}
          {item.kind === 'record' && Object.keys(item.customFields || {}).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Custom Fields
              </h4>
              <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 bg-white">
                {Object.entries(item.customFields).map(([k, v]) => (
                  <div key={k} className="flex justify-between p-3 text-xs bg-white odd:bg-slate-50/50">
                    <span className="font-semibold text-slate-600">{k}</span>
                    <span className="text-slate-900 font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5" />
                <span>Tags</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata & Dates */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            {item.eventDate && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">Event date</span>
                  <span className="text-slate-700 font-medium">{new Date(item.eventDate).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            {item.expiresAt && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">Expires</span>
                  <span className="text-amber-600 font-semibold">{new Date(item.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            <div className="col-span-2 text-[11px] text-slate-500">
              Created {new Date(item.createdAt).toLocaleString()} • Last modified {new Date(item.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-white border border-rose-200/80 hover:bg-rose-50 shadow-xs transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Move to Trash</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Close
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
