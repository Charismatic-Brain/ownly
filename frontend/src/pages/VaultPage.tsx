import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderLock,
  Plus,
  Search,
  Star,
  Folder,
  FolderOpen,
  Heart,
  Briefcase,
  Landmark,
  FileText,
  Shield,
  Car,
  Plane,
  Key,
  Trash2,
  X,
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import { CreateCollectionModal } from '../components/CreateCollectionModal';
import { CreateItemModal } from '../components/CreateItemModal';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { ItemCard, pluralize } from '../components/ItemCard';
import type { Item, Collection } from '../types';

// Collections store a lucide icon *name* (see CreateCollectionModal), not an emoji.
const COLLECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  folder: Folder,
  'heart-pulse': Heart,
  briefcase: Briefcase,
  landmark: Landmark,
  'file-text': FileText,
  shield: Shield,
  car: Car,
  plane: Plane,
  key: Key,
};

const KIND_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Files', value: 'file' },
  { label: 'Notes', value: 'note' },
  { label: 'Links', value: 'link' },
  { label: 'Records', value: 'record' },
];

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

  const navBtn = (active: boolean) =>
    `relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-all active:scale-[0.98] ${
      active
        ? 'bg-brand-500/10 text-brand-200 border border-brand-500/20'
        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100 border border-transparent'
    }`;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white">My Vault</h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-400">
            Documents, notes, links and records, organised into your own collections.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <button onClick={() => setIsCreateColOpen(true)} className="btn-ghost">
            <Folder className="h-4 w-4 text-brand-300" />
            New collection
          </button>
          <button onClick={() => setIsCreateItemOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* Collections rail */}
        <aside className="panel p-3 lg:sticky lg:top-24">
          <div className="flex items-center justify-between px-3 pb-2 pt-1.5">
            <h3 className="text-sm font-semibold text-slate-200">Collections</h3>
            <span className="text-xs tabular-nums text-slate-500">{collections.length}</span>
          </div>

          <nav className="space-y-0.5">
            <button onClick={() => setSelectedCollectionId(null)} className={navBtn(selectedCollectionId === null)}>
              <FolderLock className="h-4 w-4 shrink-0" />
              <span className="truncate">All items</span>
            </button>
            <button onClick={() => setSelectedCollectionId('none')} className={navBtn(selectedCollectionId === 'none')}>
              <FolderOpen className="h-4 w-4 shrink-0" />
              <span className="truncate">Uncollected</span>
            </button>
          </nav>

          {collections.length > 0 && (
            <div className="mt-3 space-y-0.5 border-t border-white/[0.06] pt-3">
              {collections.map((col) => {
                const Icon = COLLECTION_ICONS[col.icon] ?? Folder;
                const active = selectedCollectionId === col.id;
                return (
                  <div key={col.id} className="group relative">
                    <button onClick={() => setSelectedCollectionId(col.id)} className={`${navBtn(active)} pr-11`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{col.name}</span>
                    </button>

                    {/* Count and delete share one slot so rows never shift on hover */}
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums text-slate-500 group-focus-within:hidden group-hover:hidden">
                      {col.itemCount || 0}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(`Delete collection "${col.name}"?`)) {
                          deleteCollectionMutation.mutate(col.id);
                        }
                      }}
                      className="icon-btn absolute right-1.5 top-1/2 hidden h-7 w-7 -translate-y-1/2 hover:text-rose-300 group-focus-within:grid group-hover:grid"
                      aria-label={`Delete collection ${col.name}`}
                      title="Delete collection"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {collections.length === 0 && (
            <div className="mt-3 rounded-xl border border-dashed border-white/10 px-3 py-5 text-center">
              <p className="text-sm text-slate-400">No collections yet.</p>
              <button
                onClick={() => setIsCreateColOpen(true)}
                className="mt-2 text-sm font-semibold text-brand-300 hover:text-brand-200"
              >
                Create your first collection
              </button>
            </div>
          )}
        </aside>

        {/* Content */}
        <section className="min-w-0 space-y-5">
          {/* Search + filters */}
          <div className="panel flex flex-col gap-3 p-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by title or tag"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field pl-10 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="icon-btn absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2"
                  aria-label="Clear filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-xl border border-white/[0.07] bg-slate-950/50 p-1 md:flex-none">
                {KIND_FILTERS.map((tab) => {
                  const active = filterKind === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setFilterKind(tab.value)}
                      aria-pressed={active}
                      className={`h-8 shrink-0 rounded-lg px-3.5 text-sm font-medium transition-all active:scale-[0.97] ${
                        active
                          ? 'bg-brand-500 text-slate-950 font-semibold shadow-sm'
                          : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                aria-pressed={onlyFavorites}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-colors ${
                  onlyFavorites
                    ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                    : 'border-white/[0.07] bg-slate-950/50 text-slate-400 hover:text-slate-100'
                }`}
                title="Show favourites only"
              >
                <Star className={`h-4 w-4 ${onlyFavorites ? 'fill-amber-300' : ''}`} />
              </button>
            </div>
          </div>

          {/* Section heading */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
            <h2 className="text-lg font-semibold text-white">{getCollectionTitle()}</h2>
            <span className="text-sm tabular-nums text-slate-500">{pluralize(items.length, 'item')}</span>
            {currentCollection?.description && (
              <span className="hidden text-sm text-slate-500 sm:inline">{currentCollection.description}</span>
            )}
          </div>

          {itemsLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl border border-white/[0.05] bg-slate-900/50" />
              ))}
            </div>
          )}

          {!itemsLoading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 px-6 py-16 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/10 text-brand-300 ring-1 ring-inset ring-brand-400/20">
                <FolderLock className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-base font-semibold text-white">Nothing here yet</h4>
              <p className="mt-1.5 max-w-sm text-sm text-slate-400">
                Add a document, note, link or record. Items you add appear here.
              </p>
              <button onClick={() => setIsCreateItemOpen(true)} className="btn-primary mt-5">
                <Plus className="h-4 w-4" />
                Add item
              </button>
            </div>
          )}

          {!itemsLoading && items.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onOpen={setViewingItem}
                  onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </section>
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
