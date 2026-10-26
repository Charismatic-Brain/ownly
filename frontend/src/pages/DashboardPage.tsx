import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  FolderLock,
  Star,
  Plus,
  Database,
  Calendar,
  CheckCircle2,
  Paperclip,
  Clock,
  Search,
  Bell,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { vaultApi } from '../lib/vaultApi';
import { KIND_META } from '../components/ItemCard';

/**
 * Colour system for this page (light only, shared with ItemCard / Sidebar / TopBar):
 *   surface   -> .panel (white, hairline border, shadow-card)
 *   inset row -> bg-slate-50/80 + border-slate-200/80
 *   text      -> slate-900 primary, slate-600 secondary, slate-500 labels
 *   accent    -> brand (teal) tint tile: bg-brand-50 / text-brand-700 / ring-brand-200/60
 *   status    -> emerald (healthy), amber (needs attention) as tint tile / chip
 *   item kind -> KIND_META (file teal, note amber, link sky, record purple)
 */

const TILE_BRAND = 'bg-brand-50 text-brand-700 ring-brand-200/60';
const TILE_AMBER = 'bg-amber-50 text-amber-700 ring-amber-200/60';
const TILE_EMERALD = 'bg-emerald-50 text-emerald-700 ring-emerald-200/60';
const CHIP_AMBER =
  'rounded-md border border-amber-200/60 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700';

const Tile: React.FC<{ tone: string; size?: 'sm' | 'md'; children: React.ReactNode }> = ({
  tone,
  size = 'md',
  children,
}) => (
  <div
    className={`grid shrink-0 place-items-center rounded-lg ring-1 ring-inset ${tone} ${
      size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'
    }`}
  >
    {children}
  </div>
);

const KindTile: React.FC<{ kind: string }> = ({ kind }) => {
  const meta = KIND_META[kind as keyof typeof KIND_META] ?? KIND_META.record;
  return (
    <Tile tone={meta.tile} size="sm">
      <meta.icon className="h-3.5 w-3.5" />
    </Tile>
  );
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: vaultApi.getDashboardStats,
  });

  const totalItems = stats?.totalItems ?? 0;
  const filesCount = stats?.totalFiles ?? 0;
  const collectionsCount = stats?.totalCollections ?? 0;
  const favoritesCount = stats?.totalFavorites ?? 0;
  const expiringSoonCount = stats?.expiringSoonCount ?? 0;
  const recentItems = stats?.recentItems ?? [];
  const upcomingExpiries = stats?.upcomingExpiries ?? [];
  const kindBreakdown = stats?.breakdownByKind ?? [];

  const metrics = [
    {
      title: 'Total Items',
      value: totalItems.toString(),
      change: 'Notes, Links, Records, Files',
      icon: FolderLock,
    },
    {
      title: 'Documents & Files',
      value: filesCount.toString(),
      change: 'MongoDB GridFS Storage',
      icon: Paperclip,
    },
    {
      title: 'Collections',
      value: collectionsCount.toString(),
      change: 'Root & Nested Hierarchy',
      icon: Database,
    },
    {
      title: 'Favorites',
      value: favoritesCount.toString(),
      change: 'Starred for Quick Access',
      icon: Star,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Welcome, {user?.displayName || 'Explorer'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your personal digital operating space is active. Capture once, organize flexibly, find quickly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/search" className="btn-ghost">
            <Search className="h-4 w-4 text-slate-500" />
            <span>Search Vault</span>
          </Link>
          <Link to="/vault" className="btn-brand">
            <Plus className="h-4 w-4" />
            <span>Open Vault</span>
          </Link>
        </div>
      </div>

      {/* Database connection banner */}
      <div className="panel flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Tile tone={TILE_EMERALD}>
            <CheckCircle2 className="h-4 w-4" />
          </Tile>
          <div>
            <span className="text-sm font-semibold text-slate-900">MongoDB Aggregations Active</span>
            <p className="text-xs text-slate-500">
              Aggregated real-time metrics across active database collections • GridFS bucket operational
            </p>
          </div>
        </div>
        <span className="hidden rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
          Live Operational
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.title} className="panel p-5 transition-colors hover:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {metric.title}
              </span>
              <Tile tone={TILE_BRAND}>
                <metric.icon className="h-4 w-4" />
              </Tile>
            </div>
            <div className="mt-4 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {isLoading ? '...' : metric.value}
              </span>
              <span className="text-xs font-medium text-slate-500">{metric.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown by Kind */}
      {kindBreakdown.length > 0 && (
        <div className="panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vault Items by Kind
            </span>
            <span className="text-xs text-slate-500">{totalItems} items total</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kindBreakdown.map((kb) => (
              <Link
                key={kb.kind}
                to={`/search?kind=${kb.kind}`}
                className="apple-press flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 transition-colors hover:border-slate-300 hover:bg-white"
              >
                <div className="flex items-center gap-2">
                  <KindTile kind={kb.kind} />
                  <span className="text-xs font-medium capitalize text-slate-700">{kb.kind}s</span>
                </div>
                <span className="text-xs font-bold text-slate-900">{kb.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Expiries & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Expiries / Deadlines */}
        <div className="panel space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Tile tone={TILE_AMBER}>
                <Clock className="h-4 w-4" />
              </Tile>
              <h2 className="text-base font-semibold text-slate-900">Upcoming Expirations</h2>
            </div>
            {expiringSoonCount > 0 && (
              <span className={`text-[11px] ${CHIP_AMBER}`}>{expiringSoonCount} within 30 days</span>
            )}
          </div>

          {upcomingExpiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-8 text-center">
              <Tile tone={TILE_EMERALD}>
                <CheckCircle2 className="h-4 w-4" />
              </Tile>
              <p className="text-sm font-medium text-slate-700">All documents are up-to-date</p>
              <p className="text-xs text-slate-500">No items expiring within the next 30 days.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingExpiries.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <KindTile kind={item.kind} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{item.title}</p>
                      {item.description && (
                        <p className="truncate text-[11px] text-slate-500">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 text-[11px] ${CHIP_AMBER}`}>
                    Expires {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <Link
                  to="/reminders"
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>Open Reminders & Deadlines &rarr;</span>
                </Link>
                <Link
                  to="/search?expiringSoon=true"
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Search Expiring
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Recent Vault Activity */}
        <div className="panel space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Tile tone={TILE_BRAND}>
                <Calendar className="h-4 w-4" />
              </Tile>
              <h2 className="text-base font-semibold text-slate-900">Recent Vault Items</h2>
            </div>
            <Link to="/vault" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
              View All &rarr;
            </Link>
          </div>

          {recentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-8 text-center">
              <p className="text-sm text-slate-500">No items created yet.</p>
              <Link to="/vault" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                + Add your first document, note or link
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <KindTile kind={item.kind} />
                    <span className="truncate font-semibold text-slate-900">{item.title}</span>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
