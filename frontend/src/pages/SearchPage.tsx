import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  X,
  Star,
  FileText,
  Link as LinkIcon,
  Layers,
  Paperclip,
  Clock,
  Tag,
  ChevronRight,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import { ItemDetailModal } from '../components/ItemDetailModal';
import type { Item, Collection, ItemKind } from '../types';

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

  const getItemKindBadge = (itemKind: ItemKind) => {
    switch (itemKind) {
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
          <Search className="w-6 h-6 text-brand-400" />
          <span>Universal Search</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Search and filter across authorized documents, notes, bookmarks, custom fields, and tags.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl shadow-black/20">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type anything (e.g. 'passport', 'insurance', 'wifi', tags, URLs)..."
            className="w-full bg-slate-850 border border-slate-750 rounded-xl pl-12 pr-10 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors shadow-inner"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-white absolute right-3.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            {/* Kind Tabs */}
            <div className="flex items-center space-x-1 bg-slate-850 p-1 rounded-xl border border-slate-750">
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
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
              className="bg-slate-850 border border-slate-750 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
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
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-slate-200'
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
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Expiring Soon (30d)</span>
            </button>
          </div>

          {/* Sorting */}
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-850 border border-slate-750 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="updatedAt">Recently Updated</option>
              <option value="createdAt">Date Created</option>
              <option value="title">Title (Alphabetical)</option>
              <option value="expiresAt">Expiration Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-850 border border-slate-750 text-xs text-slate-300 hover:bg-slate-800"
              title="Toggle sort direction"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <div>
          {isLoading ? (
            <span>Searching...</span>
          ) : (
            <span>
              Found <strong className="text-white">{total}</strong> {total === 1 ? 'item' : 'items'}
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
        <div className="p-16 text-center text-slate-400 space-y-3">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Searching authorized vault records...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-16 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
            <Sparkles className="w-6 h-6 text-brand-400" />
          </div>
          <h4 className="text-base font-semibold text-white">No matching items found</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Try adjusting your search keyword or clearing filters to locate what you are looking for.
          </p>
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setViewingItem(item)}
              className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4.5 flex flex-col justify-between transition-all duration-150 hover:shadow-xl hover:shadow-black/30 cursor-pointer"
            >
              <div className="space-y-3">
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
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center space-x-1 overflow-hidden">
                  {item.tags && item.tags.length > 0 ? (
                    <div className="flex items-center space-x-1 truncate">
                      <Tag className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-400 truncate">#{item.tags[0]}</span>
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

