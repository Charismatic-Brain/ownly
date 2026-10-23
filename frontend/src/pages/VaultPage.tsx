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
  LayoutGrid,
  List,
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import { CreateCollectionModal } from '../components/CreateCollectionModal';
import { CreateItemModal } from '../components/CreateItemModal';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { ItemCard, ItemRow, pluralize } from '../components/ItemCard';
import type { Item, Collection } from '../types';

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
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<string>('');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  const collectionMap = React.useMemo(() => {
    const map = new Map<string, string>();
    collections.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [collections]);

  const navBtn = (active: boolean) =>
    `relative flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-xs font-medium transition-all active:scale-[0.98] select-none ${
      active
        ? 'bg-brand-500/15 text-brand-300 font-semibold border border-brand-500/25 shadow-sm'
        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent'
    }`;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Page Header (Restrained Apple Tooling) */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">My Vault</h1>
          <p className="mt-1 max-w-xl text-xs text-slate-400 sm:text-sm">
            Sovereign encrypted documents, credentials, notes, and records.
          </p>
        </div>

        {/* Action Buttons: 1 Prominent Primary Button */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setIsCreateColOpen(true)}
            className="btn-secondary !text-xs !py-1.5 !px-3"
          >
            <Folder className="h-3.5 w-3.5 text-brand-400" />
            New Collection
          </button>
          <button
            onClick={() => setIsCreateItemOpen(true)}
            className="btn-primary !text-xs !py-1.5 !px-3.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </button>
        </div>
      </header>

      {/* Main Workspace Split: Collections Sidebar + Content Canvas */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Collections Rail (macOS Source List) */}
        <aside className="panel p-3 lg:sticky lg:top-20">
          <div className="flex items-center justify-between px-2.5 pb-2 pt-1">
            <h3 className="source-list-header !p-0">Collections</h3>
            <span className="text-[11px] tabular-nums font-semibold text-slate-500">{collections.length}</span>
          </div>

          <nav className="space-y-0.5 mt-1">
            <button onClick={() => setSelectedCollectionId(null)} className={navBtn(selectedCollectionId === null)}>
              <FolderLock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">All Items</span>
            </button>
            <button onClick={() => setSelectedCollectionId('none')} className={navBtn(selectedCollectionId === 'none')}>
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Uncollected</span>
            </button>
          </nav>

          {collections.length > 0 && (
            <div className="mt-3 space-y-0.5 border-t border-white/[0.06] pt-2.5">
              {collections.map((col) => {
                const Icon = COLLECTION_ICONS[col.icon] ?? Folder;
                const active = selectedCollectionId === col.id;
                return (
                  <div key={col.id} className="group relative">
                    <button onClick={() => setSelectedCollectionId(col.id)} className={`${navBtn(active)} pr-9`}>
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{col.name}</span>
                    </button>

                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-slate-500 group-focus-within:hidden group-hover:hidden">
                      {col.itemCount || 0}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(`Delete collection "${col.name}"?`)) {
                          deleteCollectionMutation.mutate(col.id);
                        }
                      }}
                      className="icon-btn absolute right-1 top-1/2 hidden h-6 w-6 -translate-y-1/2 hover:text-rose-300 group-focus-within:grid group-hover:grid"
                      aria-label={`Delete collection ${col.name}`}
                      title="Delete collection"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {collections.length === 0 && (
            <div className="mt-3 rounded-xl border border-dashed border-white/10 px-3 py-4 text-center">
              <p className="text-xs text-slate-400">No collections yet.</p>
              <button
                onClick={() => setIsCreateColOpen(true)}
                className="mt-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200"
              >
                Create First Collection
              </button>
            </div>
          )}
        </aside>

        {/* Content Pane */}
        <section className="min-w-0 space-y-4">
          {/* Controls Bar: Filter input + Segmented Kind + View Switcher */}
          <div className="panel flex flex-col gap-3 p-3 md:flex-row md:items-center">
            {/* Filter Input */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter items by title or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field !h-8 pl-8 pr-8 !text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="icon-btn absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                  aria-label="Clear filter"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Segmented Controls Group */}
            <div className="flex items-center gap-2">
              {/* Kind Filters */}
              <div className="segmented-track">
                {KIND_FILTERS.map((tab) => {
                  const active = filterKind === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setFilterKind(tab.value)}
                      aria-pressed={active}
                      className={`segmented-item ${active ? 'segmented-item-active' : ''}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Favorites Toggle */}
              <button
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                aria-pressed={onlyFavorites}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition-colors ${
                  onlyFavorites
                    ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                    : 'border-white/[0.08] bg-slate-950/70 text-slate-400 hover:text-slate-200'
                }`}
                title="Show Favourites Only"
                aria-label="Show Favourites Only"
              >
                <Star className={`h-3.5 w-3.5 ${onlyFavorites ? 'fill-amber-300' : ''}`} />
              </button>

              {/* macOS Finder View Mode Switcher: Grid vs List */}
              <div className="segmented-track">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`segmented-item ${viewMode === 'grid' ? 'segmented-item-active' : ''}`}
                  title="Icons Grid View"
                  aria-label="Icons Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`segmented-item ${viewMode === 'list' ? 'segmented-item-active' : ''}`}
                  title="Details List View"
                  aria-label="Details List View"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Section Heading & Item Counter */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-semibold text-white">{getCollectionTitle()}</h2>
              <span className="text-xs tabular-nums text-slate-500">{pluralize(items.length, 'item')}</span>
            </div>
            {currentCollection?.description && (
              <span className="text-xs text-slate-500">{currentCollection.description}</span>
            )}
          </div>

          {/* Loading Skeleton */}
          {itemsLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/[0.05] bg-slate-900" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!itemsLoading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/40 px-6 py-14 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/10 text-brand-300 ring-1 ring-inset ring-brand-400/20">
                <FolderLock className="h-6 w-6" />
              </div>
              <h4 className="mt-3.5 text-sm font-semibold text-white">No items found</h4>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                Add an encrypted document, private note, link or record to this collection.
              </p>
              <button onClick={() => setIsCreateItemOpen(true)} className="btn-primary mt-4 !text-xs !py-1.5 !px-3.5">
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>
          )}

          {/* Items Display: Grid or Finder List */}
          {!itemsLoading && items.length > 0 && viewMode === 'grid' && (
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

          {!itemsLoading && items.length > 0 && viewMode === 'list' && (
            <div className="panel overflow-hidden border border-white/[0.07]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.07] bg-slate-950/60 text-[11px] font-semibold tracking-wider text-slate-400 uppercase select-none">
                      <th className="py-2.5 pl-4 pr-3">Name</th>
                      <th className="px-3 py-2.5">Kind</th>
                      <th className="px-3 py-2.5">Collection</th>
                      <th className="px-3 py-2.5">Modified</th>
                      <th className="px-3 py-2.5">Security / Size</th>
                      <th className="py-2.5 pl-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        collectionName={item.collectionId ? collectionMap.get(item.collectionId) : undefined}
                        onOpen={setViewingItem}
                        onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modals & QuickLook Sheet */}
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
