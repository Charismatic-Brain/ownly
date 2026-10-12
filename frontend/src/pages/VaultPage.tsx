import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderLock,
  Plus,
  Search,
  Star,
  FileText,
  Link as LinkIcon,
  Layers,
  Folder,
  Trash2,
  Tag,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Paperclip
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import { CreateCollectionModal } from '../components/CreateCollectionModal';
import { CreateItemModal } from '../components/CreateItemModal';
import { ItemDetailModal } from '../components/ItemDetailModal';
import type { Item, Collection, ItemKind } from '../types';

export const VaultPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null); // null = All, 'none' = Uncollected
  const [filterKind, setFilterKind] = useState<string>('');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isCreateColOpen, setIsCreateColOpen] = useState(false);
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);

  // Queries
  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: vaultApi.getCollections,
  });

  const { data: itemsResponse, isLoading: itemsLoading } = useQuery({
    queryKey: ['items', selectedCollectionId, filterKind, onlyFavorites, searchQuery],
    queryFn: () =>
      vaultApi.getItems({
        collectionId: selectedCollectionId === 'none' ? 'none' : selectedCollectionId || undefined,
        kind: filterKind || undefined,
        favorite: onlyFavorites ? true : undefined,
        search: searchQuery.trim() || undefined,
      }),
  });

  const items = itemsResponse?.items || [];

  // Mutations
  const createCollectionMutation = useMutation({
    mutationFn: vaultApi.createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: vaultApi.deleteCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setSelectedCollectionId(null);
    },
  });

  const createItemMutation = useMutation({
    mutationFn: vaultApi.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: vaultApi.toggleFavorite,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      if (viewingItem && viewingItem.id === updated.id) {
        setViewingItem(updated);
      }
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: vaultApi.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setViewingItem(null);
    },
  });

  const currentCollection = collections.find((c) => c.id === selectedCollectionId);

  const getCollectionTitle = () => {
    if (selectedCollectionId === null) return 'All Vault Items';
    if (selectedCollectionId === 'none') return 'Uncollected Items';
    return currentCollection?.name || 'Collection';
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
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <FolderLock className="w-6 h-6 text-brand-400" />
            <span>My Vault</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Organize personal documents, notes, links, and structured records into custom collections.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCreateColOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-medium transition-colors border border-slate-700"
          >
            <Folder className="w-4 h-4 text-brand-400" />
            <span>New Collection</span>
          </button>
          <button
            onClick={() => setIsCreateItemOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors shadow-lg shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Main Vault Workspace (Split Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Collections List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between px-2 pt-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Collections
            </h3>
            <span className="text-[11px] font-medium text-slate-500">
              {collections.length} total
            </span>
          </div>

          <div className="space-y-1">
            {/* All Items */}
            <button
              onClick={() => setSelectedCollectionId(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                selectedCollectionId === null
                  ? 'bg-brand-600/15 text-brand-400 border border-brand-500/25'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <FolderLock className="w-4 h-4" />
                <span>All Vault Items</span>
              </div>
            </button>

            {/* Uncollected Items */}
            <button
              onClick={() => setSelectedCollectionId('none')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                selectedCollectionId === 'none'
                  ? 'bg-brand-600/15 text-brand-400 border border-brand-500/25'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Folder className="w-4 h-4 text-slate-400" />
                <span>Uncollected</span>
              </div>
            </button>
          </div>

          {/* User Collections */}
          {collections.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <span className="block px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Your Folders
              </span>
              {collections.map((col) => (
                <div
                  key={col.id}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    selectedCollectionId === col.id
                      ? 'bg-brand-600/15 text-brand-400 border border-brand-500/25'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                  onClick={() => setSelectedCollectionId(col.id)}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span className="text-sm">📁</span>
                    <span className="truncate">{col.name}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                      {col.itemCount || 0}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete collection "${col.name}"?`)) {
                          deleteCollectionMutation.mutate(col.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                      title="Delete Collection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {collections.length === 0 && (
            <div className="px-3 py-4 text-center rounded-xl bg-slate-950/40 border border-slate-800/60">
              <p className="text-xs text-slate-400">No collections yet.</p>
              <button
                onClick={() => setIsCreateColOpen(true)}
                className="mt-2 text-xs font-semibold text-brand-400 hover:text-brand-300"
              >
                + Create first folder
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Items Grid and Filters */}
        <div className="lg:col-span-3 space-y-4">
          {/* Controls bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search items by title or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-850 border border-slate-750 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Kind Filters & Star */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { label: 'All', value: '' },
                { label: 'Files', value: 'file' },
                { label: 'Notes', value: 'note' },
                { label: 'Links', value: 'link' },
                { label: 'Records', value: 'record' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilterKind(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterKind === tab.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <button
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1 transition-colors ${
                  onlyFavorites
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Filter favorites"
              >
                <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Active Folder Title & Count */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold text-white">{getCollectionTitle()}</h2>
              <span className="text-xs text-slate-400">({items.length} items)</span>
            </div>
            {currentCollection?.description && (
              <span className="text-xs text-slate-400 hidden sm:inline">
                {currentCollection.description}
              </span>
            )}
          </div>

          {/* Loading */}
          {itemsLoading && (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading items...</p>
            </div>
          )}

          {/* Empty State */}
          {!itemsLoading && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                <Sparkles className="w-6 h-6 text-brand-400" />
              </div>
              <h4 className="text-base font-semibold text-white">No items found</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Capture your first private note, bookmark, or structured record to organize your digital life.
              </p>
              <button
                onClick={() => setIsCreateItemOpen(true)}
                className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Item</span>
              </button>
            </div>
          )}

          {/* Items Grid */}
          {!itemsLoading && items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setViewingItem(item)}
                  className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4.5 flex flex-col justify-between transition-all duration-150 hover:shadow-xl hover:shadow-black/30 cursor-pointer"
                >
                  <div className="space-y-3">
                    {/* Top Row: Kind & Favorite */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        {getItemKindBadge(item.kind)}
                        {item.files && item.files.length > 0 && item.kind !== 'file' && (
                          <span className="inline-flex items-center space-x-0.5 text-[10px] font-medium text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">
                            <Paperclip className="w-2.5 h-2.5" />
                            <span>{item.files.length}</span>
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteMutation.mutate(item.id);
                        }}
                        className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            item.favorite ? 'fill-amber-400 text-amber-400' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Title & Preview */}
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {item.kind === 'note' && item.content && !item.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 font-mono">
                          {item.content}
                        </p>
                      )}
                      {item.kind === 'link' && item.url && (
                        <div className="mt-1 flex items-center space-x-1 text-xs text-brand-400/90 truncate">
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{item.url}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Tags & Expiry */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center space-x-1 overflow-hidden">
                      {item.tags && item.tags.length > 0 ? (
                        <div className="flex items-center space-x-1 truncate">
                          <Tag className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-slate-400 truncate">#{item.tags[0]}</span>
                          {item.tags.length > 1 && (
                            <span className="text-slate-400">+{item.tags.length - 1}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>

                    {item.expiresAt ? (
                      <span className="text-amber-400/90 font-medium flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(item.expiresAt).toLocaleDateString()}</span>
                      </span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateCollectionModal
        isOpen={isCreateColOpen}
        onClose={() => setIsCreateColOpen(false)}
        collections={collections}
        onSubmit={async (data) => {
          await createCollectionMutation.mutateAsync(data);
        }}
      />

      <CreateItemModal
        isOpen={isCreateItemOpen}
        onClose={() => setIsCreateItemOpen(false)}
        collections={collections}
        defaultCollectionId={selectedCollectionId !== 'none' ? selectedCollectionId : null}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['items'] });
          queryClient.invalidateQueries({ queryKey: ['collections'] });
        }}
        onSubmit={async (data) => {
          await createItemMutation.mutateAsync(data);
        }}
      />

      <ItemDetailModal
        item={viewingItem}
        collections={collections}
        onClose={() => setViewingItem(null)}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['items'] });
          if (viewingItem) {
            vaultApi.getItem(viewingItem.id).then(setViewingItem);
          }
        }}
        onToggleFavorite={async (id) => {
          await toggleFavoriteMutation.mutateAsync(id);
        }}
        onDeleteItem={async (id) => {
          await deleteItemMutation.mutateAsync(id);
        }}
      />
    </div>
  );
};
