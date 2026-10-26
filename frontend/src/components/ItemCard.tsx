import React from 'react';
import {
  Star,
  FileText,
  FileImage,
  File as FileIcon,
  FileSpreadsheet,
  Link as LinkIcon,
  Layers,
  StickyNote,
  Paperclip,
  Clock,
  Tag,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import type { FileAsset, Item, ItemKind } from '../types';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const pluralize = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Icon for a stored file, chosen by MIME type. */
export const fileIconFor = (mime?: string) => {
  if (!mime) return FileIcon;
  if (mime.startsWith('image/')) return FileImage;
  if (mime === 'application/pdf' || mime.startsWith('text/')) return FileText;
  if (mime.includes('sheet') || mime.includes('csv')) return FileSpreadsheet;
  return FileIcon;
};

const fileExt = (name: string) => {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toUpperCase() : '';
};

interface KindMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Full class strings so Tailwind can see them. */
  tile: string;
  chip: string;
}

export const KIND_META: Record<ItemKind, KindMeta> = {
  file: {
    label: 'File',
    icon: Paperclip,
    tile: 'bg-teal-50 text-teal-700 ring-teal-200/60',
    chip: 'text-teal-700',
  },
  note: {
    label: 'Note',
    icon: StickyNote,
    tile: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    chip: 'text-amber-700',
  },
  link: {
    label: 'Link',
    icon: LinkIcon,
    tile: 'bg-sky-50 text-sky-700 ring-sky-200/60',
    chip: 'text-sky-700',
  },
  record: {
    label: 'Record',
    icon: Layers,
    tile: 'bg-purple-50 text-purple-700 ring-purple-200/60',
    chip: 'text-purple-700',
  },
};

/** Auto-generated descriptions like "File asset: foo.pdf" just repeat the title. */
const isAutoDescription = (item: Item) => item.kind === 'file' && /^file asset:/i.test(item.description || '');

/* ------------------------------------------------------------------ */
/* File strip: the "file container" inside a card                       */
/* ------------------------------------------------------------------ */

const FileStrip: React.FC<{ file: FileAsset; extra: number }> = ({ file, extra }) => {
  const Icon = fileIconFor(file.mimeType);
  const ext = fileExt(file.originalName);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-800" title={file.originalName}>
          {file.originalName}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {[ext, formatFileSize(file.sizeBytes)].filter(Boolean).join(' · ')}
        </p>
      </div>
      {extra > 0 && (
        <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
          +{extra}
        </span>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

interface ItemCardProps {
  item: Item;
  onOpen: (item: Item) => void;
  onToggleFavorite: (id: string) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onOpen, onToggleFavorite }) => {
  const meta = KIND_META[item.kind] ?? KIND_META.file;
  const firstFile = item.files?.[0];
  const TileIcon = item.kind === 'file' && firstFile ? fileIconFor(firstFile.mimeType) : meta.icon;
  const showDescription = item.description && !isAutoDescription(item);
  const attachmentCount = item.files?.length ?? 0;
  const tags = item.tags ?? [];

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return; // ignore keys from the favourite button
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(item);
        }
      }}
      className="group flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      {/* Header: icon tile, kind label, favourite */}
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${meta.tile}`}>
          <TileIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h4 className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 [overflow-wrap:anywhere]">
            {item.title}
          </h4>
          <p className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${meta.chip}`}>
            <span>{meta.label}</span>
            {item.kind !== 'file' && attachmentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Paperclip className="h-3 w-3" />
                {attachmentCount}
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          aria-label={item.favorite ? 'Remove from favourites' : 'Add to favourites'}
          aria-pressed={item.favorite}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className="icon-btn -mr-2 -mt-1.5 hover:text-amber-500"
        >
          <Star className={`h-[18px] w-[18px] ${item.favorite ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
        </button>
      </div>

      {/* Body: grows so every footer lines up along the bottom edge */}
      <div className="mt-4 flex flex-1 flex-col gap-3">
        {showDescription && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-600">{item.description}</p>
        )}

        {item.kind === 'note' && item.content && !showDescription && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-600 font-mono text-xs">{item.content}</p>
        )}

        {item.kind === 'link' && item.url && (
          <div className="flex min-w-0 items-center gap-1.5 text-[13px] text-sky-600 font-medium">
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.url}</span>
          </div>
        )}

        {firstFile && item.kind === 'file' && <FileStrip file={firstFile} extra={attachmentCount - 1} />}
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-3.5 text-xs text-slate-500">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 tabular-nums text-slate-400">{formatDate(item.createdAt)}</span>
          {tags.length > 0 && (
            <span className="flex min-w-0 items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
              <Tag className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{tags[0]}</span>
              {tags.length > 1 && <span className="shrink-0 text-slate-400">+{tags.length - 1}</span>}
            </span>
          )}
        </div>

        {item.expiresAt ? (
          <span className="flex shrink-0 items-center gap-1 font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
            <Clock className="h-3 w-3" />
            Expires {formatDate(item.expiresAt)}
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
        )}
      </div>
    </article>
  );
};
