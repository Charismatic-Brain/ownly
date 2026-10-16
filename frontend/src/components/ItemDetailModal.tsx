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
  FileCheck,
  Share2
} from 'lucide-react';
import type { Item, Collection } from '../types';
import { vaultApi } from '../lib/vaultApi';
import { ShareItemModal } from './ShareItemModal';

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getKindBadge = () => {
    switch (item.kind) {
      case 'file':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/15 text-brand-400 border border-brand-500/30">
            <Paperclip className="w-3 h-3" />
            <span>Document / File</span>
          </span>
        );
      case 'note':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <FileText className="w-3 h-3" />
            <span>Note</span>
          </span>
        );
      case 'link':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <LinkIcon className="w-3 h-3" />
            <span>Web Link</span>
          </span>
        );
      case 'record':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Layers className="w-3 h-3" />
            <span>Structured Record</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            <span>{item.kind}</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-800 bg-slate-850/50">
          <div className="space-y-1.5 pr-4">
            <div className="flex items-center space-x-2">
              {getKindBadge()}
              {collection && (
                <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                  📁 {collection.name}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white leading-snug">{item.title}</h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleFavorite(item.id)}
              className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
              title="Toggle Favorite"
            >
              <Star className={`w-5 h-5 ${item.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
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
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Description
              </h4>
              <p className="text-sm text-slate-200">{item.description}</p>
            </div>
          )}

          {/* Attached Files & Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Paperclip className="w-3.5 h-3.5 text-brand-400" />
                <span>Attached Files & Storage (GridFS)</span>
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
                  className="inline-flex items-center space-x-1 text-xs text-brand-400 hover:text-brand-300 font-medium"
                >
                  {uploadingAttachment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Attach File</span>
                </button>
              </div>
            </div>

            {item.files && item.files.length > 0 ? (
              <div className="space-y-2">
                {item.files.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-slate-850 flex items-center justify-center text-brand-400 flex-shrink-0">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-medium text-white truncate">{file.originalName}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatFileSize(file.sizeBytes)} • {file.mimeType}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <button
                        onClick={() => vaultApi.downloadFile(file.id, file.originalName, true)}
                        className="p-2 text-slate-400 hover:text-brand-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Preview File"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => vaultApi.downloadFile(file.id, file.originalName, false)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Download File"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAttachment(file.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete File"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No files attached to this item yet.</p>
            )}
          </div>

          {/* Note content */}
          {item.kind === 'note' && item.content && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Content
                </h4>
                <button
                  onClick={() => handleCopy(item.content!)}
                  className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-brand-400 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {item.content}
              </div>
            </div>
          )}

          {/* Link URL */}
          {item.kind === 'link' && item.url && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Target Link
              </h4>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-brand-500/50 text-brand-400 text-sm font-medium transition-colors w-full break-all"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                <span>{item.url}</span>
              </a>
            </div>
          )}

          {/* Record custom fields */}
          {item.kind === 'record' && Object.keys(item.customFields || {}).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Custom Fields
              </h4>
              <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
                {Object.entries(item.customFields).map(([k, v]) => (
                  <div key={k} className="flex justify-between p-3 text-xs bg-slate-950/40">
                    <span className="font-semibold text-slate-400">{k}</span>
                    <span className="text-white font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5" />
                <span>Tags</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-750"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata & Dates */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
            {item.eventDate && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="block text-[10px] text-slate-500">EVENT DATE</span>
                  <span className="text-slate-300">{new Date(item.eventDate).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            {item.expiresAt && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="block text-[10px] text-slate-500">EXPIRES AT</span>
                  <span className="text-amber-400 font-semibold">{new Date(item.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            <div className="col-span-2 text-[11px] text-slate-500">
              Created {new Date(item.createdAt).toLocaleString()} • Last modified {new Date(item.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-850/50">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-400 hover:text-white hover:bg-brand-500/20 border border-brand-500/30 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-600/80 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Move to Trash</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800"
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
