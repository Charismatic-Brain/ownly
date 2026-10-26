import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  X,
  Star,
  Clock,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { ItemCard } from '../components/ItemCard';
import type { Item, Collection } from '../types';

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
  }, [query, kind, collectionId, onlyFavorites, expiringSoon]);

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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2.5">
          <Search className="w-6 h-6 text-brand-700" />
          <span>Universal Search</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Search and filter across authorized documents, notes, bookmarks, custom fields, and tags.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-4 shadow-xl shadow-black/20">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type anything (e.g. 'passport', 'insurance', 'wifi', tags, URLs)..."
            className="field w-full pl-12 pr-10 py-3 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 absolute right-3.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2">
            {/* Kind Tabs */}
            <div className="flex items-center space-x-1 bg-slate-50/80 p-1 rounded-xl border border-slate-200">
              {[
                { label: 'All', value: '' },
                { label: 'Files', value: 'file' },
                { label: 'Notes', value: 'note' },
                { label: 'Links', value: 'link' },
                { label: 'Records', value: 'record' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setKind(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    kind === tab.value
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Collection Dropdown */}
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              className="field px-3 py-1.5 text-xs"
            >
              <option value="">All Collections</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Favorites Toggle */}
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`px-3 py-1.5 rounded-xl border text-xs flex items-center space-x-1.5 transition-colors ${
                onlyFavorites
                  ? 'bg-amber-50 border-amber-200/60 text-amber-700'
                  : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400' : ''}`} />
              <span>Favorites Only</span>
            </button>

            {/* Expiring Soon Toggle */}
            <button
              onClick={() => setExpiringSoon(!expiringSoon)}
              className={`px-3 py-1.5 rounded-xl border text-xs flex items-center space-x-1.5 transition-colors ${
                expiringSoon
                  ? 'bg-rose-50 border-rose-200/60 text-rose-700'
                  : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Expiring Soon (30d)</span>
            </button>
          </div>

          {/* Sorting */}
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="field px-3 py-1.5 text-xs"
            >
              <option value="updatedAt">Recently Updated</option>
              <option value="createdAt">Date Created</option>
              <option value="title">Title (Alphabetical)</option>
              <option value="expiresAt">Expiration Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50/80 border border-slate-200 text-xs text-slate-700 hover:bg-slate-100"
              title="Toggle sort direction"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500">
        <div>
          {isLoading ? (
            <span>Searching...</span>
          ) : (
            <span>
              Found <strong className="text-slate-900">{total}</strong> {total === 1 ? 'item' : 'items'}
              {debouncedQuery && (
                <>
                  {' '}
                  matching "<span className="text-brand-400">{debouncedQuery}</span>"
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-16 text-center text-slate-500 space-y-3">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Searching authorized vault records...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/80 p-16 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <Sparkles className="w-6 h-6 text-brand-700" />
          </div>
          <h4 className="text-base font-semibold text-slate-900">No matching items found</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            Try adjusting your search keyword or clearing filters to locate what you are looking for.
          </p>
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && items.length > 0 && (
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

      {/* Item Detail Modal */}
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

