import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Image,
  Plus,
  Upload,
  Calendar,
  Sparkles,
  Trash2,
  Download,
  ArrowLeft,
  X,
  Play,
  AlertCircle
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {selectedAlbumId ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedAlbumId(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Back to albums"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
                  <span>{selectedAlbum?.title || 'Album Details'}</span>
                </h1>
                {selectedAlbum?.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{selectedAlbum.description}</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2.5">
                <Image className="w-6 h-6 text-brand-700" />
                <span>Memories & Media Vault</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Private, secure photo & video albums stored in encrypted MongoDB GridFS.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Media</span>
          </button>
          {!selectedAlbumId && (
            <button
              onClick={() => setIsAlbumModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors shadow-sm "
            >
              <Plus className="w-4 h-4" />
              <span>+ New Album</span>
            </button>
          )}
          {selectedAlbumId && selectedAlbum && (
            <button
              onClick={() => handleDeleteAlbum(selectedAlbum.id, selectedAlbum.title)}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-800 hover:bg-slate-100 transition-colors border border-slate-200/80"
              title="Delete album"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs (only when not drilling into an album) */}
      {!selectedAlbumId && (
        <div className="flex items-center space-x-1 border-b border-slate-200/80 pb-2">
          <button
            onClick={() => setActiveTab('albums')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'albums'
                ? 'bg-brand-600 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Albums ({albums.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'timeline'
                ? 'bg-brand-600 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Media Timeline
          </button>
        </div>
      )}

      {/* View: Album Drill-Down Details */}
      {selectedAlbumId && (
        <div className="space-y-6">
          {albumDetailLoading && (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading album photos...</p>
            </div>
          )}

          {!albumDetailLoading && (!selectedAlbum?.media || selectedAlbum.media.length === 0) && (
            <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/80 p-16 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                <Image className="w-6 h-6 text-brand-700" />
              </div>
              <h4 className="text-base font-semibold text-slate-900">This album is empty</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Add photos or videos to this private album.
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-brand-700 text-xs font-semibold border border-slate-200"
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
                  className="group relative aspect-square bg-white rounded-xl overflow-hidden border border-slate-200/80 hover:border-brand-500 cursor-pointer shadow-md transition-all"
                >
                  {isVideo(media.mimeType) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500">
                      <Play className="w-8 h-8 text-brand-700 mb-1" />
                      <span className="text-[10px] uppercase font-bold">Video</span>
                    </div>
                  ) : (
                    <img
                      src={media.previewUrl}
                      alt={media.caption || media.originalName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {media.caption || media.originalName}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {new Date(media.takenAt || media.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View: Albums Grid */}
      {!selectedAlbumId && activeTab === 'albums' && (
        <div className="space-y-6">
          {albumsLoading && (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading albums...</p>
            </div>
          )}

          {!albumsLoading && albums.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/80 p-16 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                <Sparkles className="w-6 h-6 text-brand-700" />
              </div>
              <h4 className="text-base font-semibold text-slate-900">No albums created yet</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Create albums to curate memorable trips, family milestones, and personal moments.
              </p>
              <button
                onClick={() => setIsAlbumModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-brand-700 text-xs font-semibold border border-slate-200"
              >
                + Create First Album
              </button>
            </div>
          )}

          {!albumsLoading && albums.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => setSelectedAlbumId(album.id)}
                  className="group bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl overflow-hidden cursor-pointer transition-all duration-150 hover:shadow-xl hover:shadow-black/30 flex flex-col"
                >
                  {/* Cover image or placeholder */}
                  <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center">
                    {album.coverMediaId ? (
                      <img
                        src={`/api/media/${album.coverMediaId}/preview`}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Image className="w-10 h-10 mb-1" />
                        <span className="text-[11px]">No Cover Photo</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-[10px] font-bold text-slate-700 border border-slate-200/80">
                      {album.mediaCount} {album.mediaCount === 1 ? 'item' : 'items'}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-800 transition-colors truncate">
                        {album.title}
                      </h3>
                      {album.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {album.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{new Date(album.createdAt).toLocaleDateString()}</span>
                      {album.tags && album.tags.length > 0 && (
                        <span className="text-brand-700 truncate">#{album.tags[0]}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View: Timeline Stream */}
      {!selectedAlbumId && activeTab === 'timeline' && (
        <div className="space-y-6">
          {timelineLoading && (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading media timeline...</p>
            </div>
          )}

          {!timelineLoading && (!timelineData?.groups || timelineData.groups.length === 0) && (
            <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/80 p-16 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                <Calendar className="w-6 h-6 text-brand-700" />
              </div>
              <h4 className="text-base font-semibold text-slate-900">No photos or videos yet</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Upload photos and videos to see your life's chronological media stream.
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-brand-700 text-xs font-semibold border border-slate-200"
              >
                Upload Photo
              </button>
            </div>
          )}

          {!timelineLoading &&
            timelineData?.groups.map((group) => (
              <div key={group.period} className="space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-2">
                  <Calendar className="w-4 h-4 text-brand-700" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {group.period}
                  </h3>
                  <span className="text-xs text-slate-500">({group.items.length})</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {group.items.map((media) => (
                    <div
                      key={media.id}
                      onClick={() => setLightboxMedia(media)}
                      className="group relative aspect-square bg-white rounded-xl overflow-hidden border border-slate-200/80 hover:border-brand-500 cursor-pointer shadow-md transition-all"
                    >
                      {isVideo(media.mimeType) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500">
                          <Play className="w-6 h-6 text-brand-700 mb-1" />
                          <span className="text-[9px] uppercase font-bold">Video</span>
                        </div>
                      ) : (
                        <img
                          src={media.previewUrl}
                          alt={media.caption || media.originalName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-[11px] font-semibold text-slate-900 truncate">
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

      {/* Lightbox Modal */}
      {lightboxMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xl">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 bg-slate-50/80">
              <div className="flex items-center space-x-2 truncate">
                <span className="text-xs font-semibold text-slate-900 truncate">
                  {lightboxMedia.originalName}
                </span>
                {lightboxMedia.albumTitle && (
                  <span className="text-[11px] text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                    {lightboxMedia.albumTitle}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={lightboxMedia.downloadUrl}
                  download={lightboxMedia.originalName}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  title="Download media"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => {
                    if (confirm('Permanently delete this media asset?')) {
                      deleteMediaMutation.mutate(lightboxMedia.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-800 hover:bg-slate-100 transition-colors"
                  title="Delete media"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLightboxMedia(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Media Canvas */}
            <div className="flex-1 bg-slate-100 flex items-center justify-center p-2 overflow-hidden min-h-[300px]">
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

            {/* Bottom Caption / Info */}
            <div className="p-4 bg-white border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <p className="italic text-slate-700 truncate">
                {lightboxMedia.caption || 'No caption provided'}
              </p>
              <span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80">
          <h2 className="text-base font-semibold text-slate-900">Create New Album</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-slate-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200/60 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Album Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Vacation, Birthday 2026, Family Gathering"
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or details about this album..."
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="vacation, family, beach"
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div className="pt-3 border-t border-slate-200/80 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50"
            >
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80">
          <h2 className="text-base font-semibold text-slate-900">Upload Photo or Video</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-slate-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200/60 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Select Album (Optional)</label>
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="field w-full px-3 py-2 text-sm"
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
            <label className="block text-xs font-medium text-slate-700 mb-1.5">File (Image or Video, max 50 MB)</label>
            <input
              type="file"
              required
              accept="image/*,video/mp4,video/webm"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-brand-700 hover:file:bg-slate-200 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Caption</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Sunset at the resort"
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="beach, sunset, holiday"
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div className="pt-3 border-t border-slate-200/80 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50"
            >
              {isUploading ? 'Uploading to GridFS...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
