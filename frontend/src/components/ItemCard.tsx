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
    tile: 'bg-brand-500/10 text-brand-300 ring-brand-400/20',
    chip: 'text-brand-300',
  },
  note: {
    label: 'Note',
    icon: StickyNote,
    tile: 'bg-amber-500/10 text-amber-300 ring-amber-400/20',
    chip: 'text-amber-300',
  },
  link: {
    label: 'Link',
    icon: LinkIcon,
    tile: 'bg-sky-500/10 text-sky-300 ring-sky-400/20',
    chip: 'text-sky-300',
  },
  record: {
    label: 'Record',
    icon: Layers,
    tile: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
    chip: 'text-emerald-300',
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
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-slate-950/50 px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-200" title={file.originalName}>
          {file.originalName}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {[ext, formatFileSize(file.sizeBytes)].filter(Boolean).join(' · ')}
        </p>
      </div>
      {extra > 0 && (
        <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-slate-300">
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
      className="group flex h-full cursor-pointer flex-col rounded-2xl border border-white/[0.07] bg-slate-900/70 p-5 shadow-card transition duration-200 ease-spring hover:-translate-y-0.5 hover:border-brand-400/25 hover:bg-slate-900 hover:shadow-lift active:scale-[0.985] select-none"
    >
      {/* Header: icon tile, kind label, favourite */}
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${meta.tile}`}>
          <TileIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h4 className="line-clamp-2 text-[15px] font-semibold leading-snug text-white [overflow-wrap:anywhere]">
            {item.title}
          </h4>
          <p className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${meta.chip}`}>
            <span>{meta.label}</span>
            {item.kind !== 'file' && attachmentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-slate-400">
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
          className="icon-btn -mr-2 -mt-1.5 hover:text-amber-300"
        >
          <Star className={`h-[18px] w-[18px] ${item.favorite ? 'fill-amber-300 text-amber-300' : ''}`} />
        </button>
      </div>

      {/* Body: grows so every footer lines up along the bottom edge */}
      <div className="mt-4 flex flex-1 flex-col gap-3">
        {showDescription && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-400">{item.description}</p>
        )}

        {item.kind === 'note' && item.content && !showDescription && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-400">{item.content}</p>
        )}

        {item.kind === 'link' && item.url && (
          <div className="flex min-w-0 items-center gap-1.5 text-[13px] text-sky-300/90">
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.url}</span>
          </div>
        )}

        {firstFile && item.kind === 'file' && <FileStrip file={firstFile} extra={attachmentCount - 1} />}
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3.5 text-xs text-slate-500">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 tabular-nums">{formatDate(item.createdAt)}</span>
          {tags.length > 0 && (
            <span className="flex min-w-0 items-center gap-1 text-slate-400">
              <Tag className="h-3 w-3 shrink-0" />
              <span className="truncate">{tags[0]}</span>
              {tags.length > 1 && <span className="shrink-0 text-slate-500">+{tags.length - 1}</span>}
            </span>
          )}
        </div>

        {item.expiresAt ? (
          <span className="flex shrink-0 items-center gap-1 font-medium text-amber-300/90">
            <Clock className="h-3 w-3" />
            Expires {formatDate(item.expiresAt)}
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-brand-300" />
        )}
      </div>
    </article>
  );
};
