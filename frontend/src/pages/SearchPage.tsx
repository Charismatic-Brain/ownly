import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  X,
  Star,
  Clock,
  LayoutGrid,
  List,
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { ItemCard, ItemRow, pluralize } from '../components/ItemCard';
import type { Item, Collection } from '../types';

const KIND_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Files', value: 'file' },
  { label: 'Notes', value: 'note' },
  { label: 'Links', value: 'link' },
  { label: 'Records', value: 'record' },
];

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);
  const [kind, setKind] = useState<string>(searchParams.get('kind') || '');
  const [collectionId, setCollectionId] = useState<string>(searchParams.get('collectionId') || '');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(searchParams.get('favorite') === 'true');
  const [expiringSoon, setExpiringSoon] = useState<boolean>(searchParams.get('expiringSoon') === 'true');
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [viewingItem, setViewingItem] = useState<Item | null>(null);

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      const params: Record<string, string> = {};
      if (query) params.q = query;
      if (kind) params.kind = kind;
      if (collectionId) params.collectionId = collectionId;
      if (onlyFavorites) params.favorite = 'true';
      if (expiringSoon) params.expiringSoon = 'true';
      setSearchParams(params);
    }, 250);
    return () => clearTimeout(handler);
  }, [query, kind, collectionId, onlyFavorites, expiringSoon, setSearchParams]);

  // Fetch collections for dropdown
  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: vaultApi.getCollections,
  });

  // Search query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: [
      'search',
      debouncedQuery,
      kind,
      collectionId,
      onlyFavorites,
      expiringSoon,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      vaultApi.search({
        q: debouncedQuery.trim() || undefined,
        kind: kind || undefined,
        collectionId: collectionId || undefined,
        favorite: onlyFavorites ? true : undefined,
        expiringSoon: expiringSoon ? true : undefined,
        sortBy,
        sortOrder,
        limit: 50,
      }),
  });

  const items = searchResults?.items || [];
  const total = searchResults?.total || 0;

  const collectionMap = React.useMemo(() => {
    const map = new Map<string, string>();
    collections.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [collections]);

  const toggleFavoriteMutation = useMutation({
    mutationFn: vaultApi.toggleFavorite,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      if (viewingItem && viewingItem.id === updated.id) {
        setViewingItem(updated);
      }
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: vaultApi.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setViewingItem(null);
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Spotlight Search</h1>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
          Full-text cryptographic search across encrypted titles, metadata, tags, and collections.
        </p>
      </div>

      {/* Main Spotlight Input & Controls Bar */}
      <div className="panel p-4 space-y-3.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vault items, documents, credentials..."
            aria-label="Search query"
            className="field !h-11 pl-10 pr-10 text-sm font-medium"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="icon-btn absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2"
              aria-label="Clear query"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Kind Segmented Control */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="segmented-track">
              {KIND_FILTERS.map((tab) => {
                const active = kind === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setKind(tab.value)}
                    className={`segmented-item ${active ? 'segmented-item-active' : ''}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Collection Select */}
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              className="field !h-8 !py-0 !w-auto text-xs bg-slate-950/80 cursor-pointer"
            >
              <option value="">All Collections</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="field !h-8 !py-0 !w-auto text-xs bg-slate-950/80 cursor-pointer"
            >
              <option value="updatedAt-desc">Recently Updated</option>
              <option value="createdAt-desc">Newest First</option>
              <option value="title-asc">Title (A-Z)</option>
            </select>

            {/* Favorite & Expiring Toggles */}
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`grid h-8 w-8 place-items-center rounded-xl border transition-colors ${
                onlyFavorites
                  ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                  : 'border-white/[0.08] bg-slate-950/70 text-slate-400 hover:text-slate-200'
              }`}
              title="Show Favorites Only"
            >
              <Star className={`h-3.5 w-3.5 ${onlyFavorites ? 'fill-amber-300' : ''}`} />
            </button>

            <button
              onClick={() => setExpiringSoon(!expiringSoon)}
              className={`grid h-8 w-8 place-items-center rounded-xl border transition-colors ${
                expiringSoon
                  ? 'border-rose-400/40 bg-rose-400/10 text-rose-300'
                  : 'border-white/[0.08] bg-slate-950/70 text-slate-400 hover:text-slate-200'
              }`}
              title="Expiring Soon"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="segmented-track">
            <button
              onClick={() => setViewMode('grid')}
              className={`segmented-item ${viewMode === 'grid' ? 'segmented-item-active' : ''}`}
              title="Icons Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`segmented-item ${viewMode === 'list' ? 'segmented-item-active' : ''}`}
              title="Details List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {isLoading ? 'Searching...' : `Found ${pluralize(total, 'result')}`}
        </span>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/[0.05] bg-slate-900" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-14 text-center flex flex-col items-center justify-center space-y-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-brand-400 border border-white/10">
            <Search className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold text-white">No items match your search</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Try adjusting keywords or clearing category filters.
          </p>
        </div>
      )}

      {/* Results Display */}
      {!isLoading && items.length > 0 && viewMode === 'grid' && (
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

      {!isLoading && items.length > 0 && viewMode === 'list' && (
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

      {/* QuickLook Inspection Sheet */}
      <ItemDetailModal
        item={viewingItem}
        collections={collections}
        onClose={() => setViewingItem(null)}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['search'] });
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
