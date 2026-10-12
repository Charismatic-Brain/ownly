import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Paperclip,
  FileText,
  Link as LinkIcon,
  Layers,
  Sparkles
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import type { Item, ItemKind } from '../types';

export const TrashPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: trashedItems = [], isLoading } = useQuery<Item[]>({
    queryKey: ['trash'],
    queryFn: vaultApi.getTrash,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => vaultApi.restoreItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => vaultApi.permanentlyDeleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: vaultApi.emptyTrash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });

  const handleEmptyTrash = () => {
    if (
      confirm(
        `Permanently delete all ${trashedItems.length} items and their attached storage files? This action CANNOT be undone.`
      )
    ) {
      emptyTrashMutation.mutate();
    }
  };

  const handlePermanentDelete = (item: Item) => {
    if (
      confirm(
        `Permanently delete "${item.title}"? Any attached files in MongoDB GridFS will be deleted immediately.`
      )
    ) {
      permanentDeleteMutation.mutate(item.id);
    }
  };

  const getItemKindBadge = (kind: ItemKind) => {
    switch (kind) {
      case 'file':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <Paperclip className="w-3 h-3" />
            <span>File</span>
          </span>
        );
      case 'note':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileText className="w-3 h-3" />
            <span>Note</span>
          </span>
        );
      case 'link':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <LinkIcon className="w-3 h-3" />
            <span>Link</span>
          </span>
        );
      case 'record':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Layers className="w-3 h-3" />
            <span>Record</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Trash2 className="w-6 h-6 text-rose-400" />
            <span>Trash</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Items in the trash can be restored back to your vault or permanently deleted.
          </p>
        </div>

        {trashedItems.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            disabled={emptyTrashMutation.isPending}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-sm font-medium transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Empty Trash ({trashedItems.length})</span>
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="p-16 text-center text-slate-400 space-y-3">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Loading trash...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && trashedItems.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-16 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
          <h4 className="text-base font-semibold text-white">Trash is empty</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Deleted notes, bookmarks, and documents will appear here with an option to restore them.
          </p>
        </div>
      )}

      {/* Trashed Items List */}
      {!isLoading && trashedItems.length > 0 && (
        <div className="space-y-3">
          {trashedItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  {getItemKindBadge(item.kind)}
                  <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                </div>
                {item.description && (
                  <p className="text-xs text-slate-400 line-clamp-1">{item.description}</p>
                )}
                {item.deletedAt && (
                  <p className="text-[11px] text-slate-500">
                    Deleted on {new Date(item.deletedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => restoreMutation.mutate(item.id)}
                  disabled={restoreMutation.isPending}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-brand-400 text-xs font-medium border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
                <button
                  onClick={() => handlePermanentDelete(item)}
                  disabled={permanentDeleteMutation.isPending}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 text-xs font-medium border border-rose-500/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Forever</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

