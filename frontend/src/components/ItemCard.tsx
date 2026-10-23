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
  Tag,
  ExternalLink,
  ChevronRight,
  Eye,
  Lock,
} from 'lucide-react';
import type { FileAsset, Item, ItemKind } from '../types';

/* ------------------------------------------------------------------ */
/* Shared Helpers & Utilities                                         */
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

const isAutoDescription = (item: Item) => item.kind === 'file' && /^file asset:/i.test(item.description || '');

/* ------------------------------------------------------------------ */
/* File Strip Component inside Card                                   */
/* ------------------------------------------------------------------ */

const FileStrip: React.FC<{ file: FileAsset; extra: number }> = ({ file, extra }) => {
  const Icon = fileIconFor(file.mimeType);
  const ext = fileExt(file.originalName);
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-slate-950/70 px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-200" title={file.originalName}>
          {file.originalName}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500 tabular-nums">
          {[ext, formatFileSize(file.sizeBytes)].filter(Boolean).join(' · ')}
        </p>
      </div>
      {extra > 0 && (
        <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 tabular-nums">
          +{extra}
        </span>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Item Card (macOS Icons Grid Mode)                                  */
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
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(item);
        }
      }}
      className="group relative flex h-full cursor-pointer flex-col rounded-2xl border border-white/[0.08] bg-slate-900 p-4.5 shadow-card transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:border-brand-500/35 hover:bg-slate-850 hover:shadow-lift active:scale-[0.985] select-none"
    >
      {/* Header: Icon tile, title, favourite */}
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${meta.tile}`}>
          <TileIcon className="h-4.5 w-4.5" />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h4 className="line-clamp-2 text-[14px] font-semibold leading-snug text-white [overflow-wrap:anywhere]">
            {item.title}
          </h4>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className={`font-medium ${meta.chip}`}>{meta.label}</span>
            <span className="text-slate-600">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Lock className="h-2.5 w-2.5 text-brand-400" />
              AES-256
            </span>
            {item.kind !== 'file' && attachmentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Paperclip className="h-2.5 w-2.5" />
                {attachmentCount}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label={item.favorite ? 'Remove from favourites' : 'Add to favourites'}
          aria-pressed={item.favorite}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className="icon-btn -mr-1.5 -mt-1 h-8 w-8 hover:text-amber-300"
        >
          <Star className={`h-4 w-4 ${item.favorite ? 'fill-amber-300 text-amber-300' : 'text-slate-500'}`} />
        </button>
      </div>

      {/* Body */}
      <div className="mt-3.5 flex flex-1 flex-col gap-2.5">
        {showDescription && (
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">{item.description}</p>
        )}

        {item.kind === 'note' && item.content && !showDescription && (
          <p className="line-clamp-2 font-mono text-[11px] leading-relaxed text-slate-400">{item.content}</p>
        )}

        {item.kind === 'link' && item.url && (
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-sky-300/90">
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.url}</span>
          </div>
        )}

        {firstFile && item.kind === 'file' && <FileStrip file={firstFile} extra={attachmentCount - 1} />}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs text-slate-500">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 tabular-nums text-[11px] text-slate-400">{formatDate(item.createdAt)}</span>
          {tags.length > 0 && (
            <span className="flex min-w-0 items-center gap-1 text-slate-400">
              <Tag className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate text-[11px]">#{tags[0]}</span>
              {tags.length > 1 && <span className="shrink-0 text-[10px] text-slate-500">+{tags.length - 1}</span>}
            </span>
          )}
        </div>

        {/* QuickLook Spacebar Hint */}
        <div className="flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-brand-300 transition-colors">
          <kbd className="hidden rounded border border-white/10 bg-white/[0.05] px-1 py-0.2 text-[9px] font-medium sm:inline">
            Space
          </kbd>
          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </article>
  );
};

/* ------------------------------------------------------------------ */
/* Item Row (macOS Finder Details Table Mode)                         */
/* ------------------------------------------------------------------ */

interface ItemRowProps {
  item: Item;
  collectionName?: string;
  onOpen: (item: Item) => void;
  onToggleFavorite: (id: string) => void;
}

export const ItemRow: React.FC<ItemRowProps> = ({ item, collectionName, onOpen, onToggleFavorite }) => {
  const meta = KIND_META[item.kind] ?? KIND_META.file;
  const firstFile = item.files?.[0];
  const TileIcon = item.kind === 'file' && firstFile ? fileIconFor(firstFile.mimeType) : meta.icon;

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(item);
        }
      }}
      className="group cursor-pointer border-b border-white/[0.05] transition-colors hover:bg-slate-800/50 active:bg-slate-800/80"
    >
      {/* Name and Icon */}
      <td className="py-2.5 pl-4 pr-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${meta.tile}`}>
            <TileIcon className="h-3.5 w-3.5" />
          </div>
          <span className="truncate text-xs font-medium text-slate-100 group-hover:text-white" title={item.title}>
            {item.title}
          </span>
        </div>
      </td>

      {/* Kind */}
      <td className="px-3 py-2.5 text-xs text-slate-400">
        <span className={meta.chip}>{meta.label}</span>
      </td>

      {/* Collection */}
      <td className="px-3 py-2.5 text-xs text-slate-400">
        <span className="truncate block max-w-[140px] text-slate-400">
          {collectionName || '—'}
        </span>
      </td>

      {/* Date */}
      <td className="px-3 py-2.5 text-xs text-slate-400 tabular-nums">
        {formatDate(item.createdAt)}
      </td>

      {/* Size / Cryptographic Security */}
      <td className="px-3 py-2.5 text-xs text-slate-400 tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-brand-400" />
          {firstFile ? formatFileSize(firstFile.sizeBytes) : 'AES-256'}
        </span>
      </td>

      {/* Actions (Favorite & QuickLook) */}
      <td className="py-2.5 pl-3 pr-4 text-right">
        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label={item.favorite ? 'Remove from favourites' : 'Add to favourites'}
            onClick={() => onToggleFavorite(item.id)}
            className="icon-btn h-7 w-7 hover:text-amber-300"
          >
            <Star className={`h-3.5 w-3.5 ${item.favorite ? 'fill-amber-300 text-amber-300' : 'text-slate-500'}`} />
          </button>
          <button
            type="button"
            aria-label="Inspect Item"
            onClick={() => onOpen(item)}
            className="icon-btn h-7 w-7 hover:text-brand-300"
            title="QuickLook Inspection (Space)"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};
