import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Image as ImageIcon,
  Plus,
  Upload,
  Calendar,
  Trash2,
  Download,
  ArrowLeft,
  X,
  Play,
  AlertCircle,
  Film,
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import type {
  Album,
  MediaAsset,
  CreateAlbumRequest
} from '../types';

export const MemoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'albums' | 'timeline'>('albums');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<MediaAsset | null>(null);

  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Keyboard shortcut: Escape to close Lightbox
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxMedia) {
        setLightboxMedia(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxMedia]);

  // Queries
  const { data: albums = [], isLoading: albumsLoading } = useQuery<Album[]>({
    queryKey: ['albums'],
    queryFn: vaultApi.getAlbums,
  });

  const { data: selectedAlbum, isLoading: albumDetailLoading } = useQuery<Album>({
    queryKey: ['album', selectedAlbumId],
    queryFn: () => vaultApi.getAlbum(selectedAlbumId!),
    enabled: !!selectedAlbumId,
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['media', 'timeline'],
    queryFn: vaultApi.getMediaTimeline,
    enabled: activeTab === 'timeline',
  });

  // Mutations
  const deleteAlbumMutation = useMutation({
    mutationFn: (id: string) => vaultApi.deleteAlbum(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['media', 'timeline'] });
      setSelectedAlbumId(null);
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (id: string) => vaultApi.deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['album', selectedAlbumId] });
      queryClient.invalidateQueries({ queryKey: ['media', 'timeline'] });
      if (lightboxMedia) setLightboxMedia(null);
    },
  });

  const handleDeleteAlbum = (id: string, title: string) => {
    if (confirm(`Delete album "${title}" and all its photos? This action cannot be undone.`)) {
      deleteAlbumMutation.mutate(id);
    }
  };

  const isVideo = (mimeType: string) => mimeType.startsWith('video/');

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Header (Apple Photos Archetype) */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {selectedAlbumId ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedAlbumId(null)}
                className="icon-btn h-9 w-9 hover:text-white"
                title="Back to all albums"
                aria-label="Back to all albums"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {selectedAlbum?.title || 'Album Details'}
                </h1>
                {selectedAlbum?.description && (
                  <p className="text-xs text-slate-400 mt-0.5">{selectedAlbum.description}</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Memories & Media</h1>
              <p className="mt-1 max-w-xl text-xs text-slate-400 sm:text-sm">
                Private encrypted photo & video library stored in zero-knowledge GridFS.
              </p>
            </div>
          )}
        </div>

        {/* Action Controls: 1 Prominent Button */}
        <div className="flex shrink-0 items-center gap-2">
          {!selectedAlbumId && (
            <button
              onClick={() => setIsAlbumModalOpen(true)}
              className="btn-secondary !text-xs !py-1.5 !px-3"
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              New Album
            </button>
          )}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-primary !text-xs !py-1.5 !px-3.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Media
          </button>
          {selectedAlbumId && selectedAlbum && (
            <button
              onClick={() => handleDeleteAlbum(selectedAlbum.id, selectedAlbum.title)}
              className="icon-btn h-9 w-9 hover:text-rose-400"
              title="Delete album"
              aria-label="Delete album"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Apple Photos View Switcher (Albums vs Moments Timeline) */}
      {!selectedAlbumId && (
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
          <div className="segmented-track">
            <button
              onClick={() => setActiveTab('albums')}
              className={`segmented-item ${activeTab === 'albums' ? 'segmented-item-active' : ''}`}
            >
              Albums ({albums.length})
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`segmented-item ${activeTab === 'timeline' ? 'segmented-item-active' : ''}`}
            >
              Moments Timeline
            </button>
          </div>
        </div>
      )}

      {/* Drill-down Album Media Grid */}
      {selectedAlbumId && (
        <div className="space-y-6">
          {albumDetailLoading && (
            <div className="p-16 text-center text-slate-400 space-y-2.5">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Decrypting album media...</p>
            </div>
          )}

          {!albumDetailLoading && (!selectedAlbum?.media || selectedAlbum.media.length === 0) && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-14 text-center flex flex-col items-center justify-center space-y-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-brand-400 border border-white/10">
                <ImageIcon className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-white">This album is empty</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Add encrypted photos or videos to this private collection.
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-primary mt-2 !text-xs !py-1.5 !px-3.5"
              >
                Upload First Photo
              </button>
            </div>
          )}

          {!albumDetailLoading && selectedAlbum?.media && selectedAlbum.media.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {selectedAlbum.media.map((media) => (
                <div
                  key={media.id}
                  onClick={() => setLightboxMedia(media)}
                  className="group relative aspect-square bg-slate-900 rounded-xl overflow-hidden border border-white/[0.08] hover:border-brand-500/50 cursor-pointer shadow-card transition-all select-none"
                >
                  {isVideo(media.mimeType) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
                      <Play className="w-7 h-7 text-brand-400 mb-1" />
                      <span className="text-[9px] uppercase font-bold tracking-wider">Video</span>
                    </div>
                  ) : (
                    <img
                      src={media.previewUrl}
                      alt={media.caption || media.originalName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                    <p className="text-xs font-medium text-white truncate">
                      {media.caption || media.originalName}
                    </p>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {new Date(media.takenAt || media.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Albums Grid View */}
      {!selectedAlbumId && activeTab === 'albums' && (
        <div className="space-y-6">
          {albumsLoading && (
            <div className="p-16 text-center text-slate-400 space-y-2.5">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading albums...</p>
            </div>
          )}

          {!albumsLoading && albums.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-14 text-center flex flex-col items-center justify-center space-y-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-brand-400 border border-white/10">
                <ImageIcon className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-white">No albums created yet</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Create albums to organize vacations, family milestones, and private memories.
              </p>
              <button
                onClick={() => setIsAlbumModalOpen(true)}
                className="btn-primary mt-2 !text-xs !py-1.5 !px-3.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Album</span>
              </button>
            </div>
          )}

          {!albumsLoading && albums.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => setSelectedAlbumId(album.id)}
                  className="group panel overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/35 hover:shadow-lift flex flex-col select-none"
                >
                  {/* Photo Stack Cover */}
                  <div className="aspect-[4/3] bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-white/[0.06]">
                    {album.coverMediaId ? (
                      <img
                        src={`/api/media/${album.coverMediaId}/preview`}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600">
                        <ImageIcon className="w-8 h-8 mb-1 text-slate-600" />
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">No Cover</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-semibold text-white border border-white/10 tabular-nums">
                      {album.mediaCount} {album.mediaCount === 1 ? 'item' : 'items'}
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-white group-hover:text-brand-300 transition-colors truncate">
                        {album.title}
                      </h3>
                      {album.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {album.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-500 tabular-nums">
                      <span>{new Date(album.createdAt).toLocaleDateString()}</span>
                      {album.tags && album.tags.length > 0 && (
                        <span className="text-brand-400 truncate">#{album.tags[0]}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Moments Timeline Stream */}
      {!selectedAlbumId && activeTab === 'timeline' && (
        <div className="space-y-6">
          {timelineLoading && (
            <div className="p-16 text-center text-slate-400 space-y-2.5">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading media timeline...</p>
            </div>
          )}

          {!timelineLoading && (!timelineData?.groups || timelineData.groups.length === 0) && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-14 text-center flex flex-col items-center justify-center space-y-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-brand-400 border border-white/10">
                <Calendar className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-white">No photos or videos yet</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Upload photos and videos to see your life's chronological media moments.
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-primary mt-2 !text-xs !py-1.5 !px-3.5"
              >
                Upload Photo
              </button>
            </div>
          )}

          {!timelineLoading &&
            timelineData?.groups.map((group) => (
              <div key={group.period} className="space-y-3">
                <div className="sticky top-16 z-20 flex items-center gap-2 border-b border-white/[0.08] bg-slate-950/85 backdrop-blur-xl py-2 px-1">
                  <Calendar className="w-3.5 h-3.5 text-brand-400" />
                  <h3 className="text-xs font-semibold text-white tracking-wide">
                    {group.period}
                  </h3>
                  <span className="text-xs text-slate-500 tabular-nums">({group.items.length})</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {group.items.map((media) => (
                    <div
                      key={media.id}
                      onClick={() => setLightboxMedia(media)}
                      className="group relative aspect-square bg-slate-900 rounded-xl overflow-hidden border border-white/[0.08] hover:border-brand-500/50 cursor-pointer shadow-card transition-all select-none"
                    >
                      {isVideo(media.mimeType) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
                          <Film className="w-6 h-6 text-brand-400 mb-1" />
                          <span className="text-[9px] uppercase font-bold tracking-wider">Video</span>
                        </div>
                      ) : (
                        <img
                          src={media.previewUrl}
                          alt={media.caption || media.originalName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-[11px] font-medium text-white truncate">
                          {media.caption || media.originalName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Apple Photos Darkroom Lightbox Viewer */}
      {lightboxMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-fade-in" onClick={() => setLightboxMedia(null)}>
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Liquid Glass Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-xl">
              <div className="flex items-center gap-2 truncate pr-4">
                <span className="text-xs font-semibold text-white truncate">
                  {lightboxMedia.originalName}
                </span>
                {lightboxMedia.albumTitle && (
                  <span className="text-[10px] text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                    {lightboxMedia.albumTitle}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href={lightboxMedia.downloadUrl}
                  download={lightboxMedia.originalName}
                  className="icon-btn h-8 w-8 hover:text-white"
                  title="Download media"
                  aria-label="Download media"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => {
                    if (confirm('Permanently delete this media asset?')) {
                      deleteMediaMutation.mutate(lightboxMedia.id);
                    }
                  }}
                  className="icon-btn h-8 w-8 hover:text-rose-400"
                  title="Delete media"
                  aria-label="Delete media"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLightboxMedia(null)}
                  className="icon-btn h-8 w-8"
                  aria-label="Close viewer (Esc)"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Darkroom Media Canvas */}
            <div className="flex-1 bg-black flex items-center justify-center p-3 overflow-hidden min-h-[320px]">
              {isVideo(lightboxMedia.mimeType) ? (
                <video
                  src={lightboxMedia.previewUrl}
                  controls
                  autoPlay
                  className="max-h-[65vh] max-w-full rounded"
                />
              ) : (
                <img
                  src={lightboxMedia.previewUrl}
                  alt={lightboxMedia.caption || lightboxMedia.originalName}
                  className="max-h-[65vh] max-w-full object-contain rounded"
                />
              )}
            </div>

            {/* Bottom Caption Bar */}
            <div className="p-3.5 bg-slate-950/80 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
              <p className="text-slate-300 truncate">
                {lightboxMedia.caption || 'Encrypted Media Asset'}
              </p>
              <span className="tabular-nums text-[11px] text-slate-500">
                Added {new Date(lightboxMedia.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Create Album Modal */}
      {isAlbumModalOpen && (
        <CreateAlbumModal
          onClose={() => setIsAlbumModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['albums'] });
            setIsAlbumModalOpen(false);
          }}
        />
      )}

      {/* Upload Media Modal */}
      {isUploadModalOpen && (
        <UploadMediaModal
          albums={albums}
          defaultAlbumId={selectedAlbumId}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['albums'] });
            queryClient.invalidateQueries({ queryKey: ['album', selectedAlbumId] });
            queryClient.invalidateQueries({ queryKey: ['media', 'timeline'] });
            setIsUploadModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

// ------------------------------------------------------------------
// Internal Modal: Create Album
// ------------------------------------------------------------------
interface AlbumModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAlbumModal: React.FC<AlbumModalProps> = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: CreateAlbumRequest) => vaultApi.createAlbum(data),
    onSuccess,
    onError: (err: any) => setError(err.message || 'Failed to create album'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Album title is required');
      return;
    }

    const tagList = tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      tags: tagList,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-surface max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-950/70">
          <h2 className="text-sm font-semibold text-white">Create New Album</h2>
          <button onClick={onClose} className="icon-btn h-8 w-8" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="field-label">Album Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Vacation, Milestone 2026"
              className="field !h-9 text-xs"
            />
          </div>

          <div>
            <label className="field-label">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or details about this album..."
              className="field text-xs"
            />
          </div>

          <div>
            <label className="field-label">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="vacation, family, beach"
              className="field !h-9 text-xs"
            />
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost !text-xs !py-1 !px-3">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary !text-xs !py-1.5 !px-3.5">
              {mutation.isPending ? 'Creating...' : 'Create Album'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// Internal Modal: Upload Media
// ------------------------------------------------------------------
interface UploadModalProps {
  albums: Album[];
  defaultAlbumId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const UploadMediaModal: React.FC<UploadModalProps> = ({
  albums,
  defaultAlbumId,
  onClose,
  onSuccess,
}) => {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(defaultAlbumId || '');
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an image or video file');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      await vaultApi.uploadMedia(
        selectedAlbumId || null,
        file,
        caption.trim(),
        undefined,
        tags.trim()
      );
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-surface max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-950/70">
          <h2 className="text-sm font-semibold text-white">Upload Photo or Video</h2>
          <button onClick={onClose} className="icon-btn h-8 w-8" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="field-label">Select Album (Optional)</label>
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="field !h-9 text-xs"
            >
              <option value="">-- No album (General Timeline) --</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">File (Image or Video, max 50 MB)</label>
            <input
              type="file"
              required
              accept="image/*,video/mp4,video/webm"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="field !py-1 text-xs file:mr-3 file:py-0.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-white/[0.08] file:text-brand-300 hover:file:bg-white/[0.12] cursor-pointer"
            />
          </div>

          <div>
            <label className="field-label">Caption</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Sunset at the resort"
              className="field !h-9 text-xs"
            />
          </div>

          <div>
            <label className="field-label">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="beach, sunset, holiday"
              className="field !h-9 text-xs"
            />
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost !text-xs !py-1 !px-3">
              Cancel
            </button>
            <button type="submit" disabled={isUploading} className="btn-primary !text-xs !py-1.5 !px-3.5">
              {isUploading ? 'Uploading to GridFS...' : 'Upload Media'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
