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
  Layers,
  Paperclip,
  Clock,
  Search,
  Bell,
  FileText,
  Link as LinkIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { vaultApi } from '../lib/vaultApi';

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

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'file':
        return <Paperclip className="w-3.5 h-3.5 text-brand-400" />;
      case 'note':
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      case 'link':
        return <LinkIcon className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome, {user?.displayName || 'Explorer'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Your personal digital operating space is active. Capture once, organize flexibly, find quickly.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/search"
            className="btn-secondary"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span>Search Vault</span>
          </Link>
          <Link
            to="/vault"
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Open Vault</span>
          </Link>
        </div>
      </div>

      {/* Database connection banner */}
      <div className="p-4 rounded-2xl panel-subtle flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-200">MongoDB Aggregations Active</span>
            <p className="text-xs text-slate-400">
              Aggregated real-time metrics across database <code className="text-slate-300 font-mono">ownly_dev</code> • GridFS bucket operational
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Live Operational
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="p-5 rounded-2xl panel hover:border-white/15 transition-all duration-200 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {metric.title}
              </span>
              <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-brand-400">
                <metric.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white tracking-tight">
                {isLoading ? '...' : metric.value}
              </span>
              <span className="text-xs font-medium text-slate-400">{metric.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown by Kind & Quick Stats */}
      {kindBreakdown.length > 0 && (
        <div className="panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Vault Items by Kind
            </span>
            <span className="text-xs text-slate-500">{totalItems} items total</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kindBreakdown.map((kb) => (
              <Link
                key={kb.kind}
                to={`/search?kind=${kb.kind}`}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-brand-500/40 hover:bg-white/[0.06] transition-all active:scale-[0.98]"
              >
                <div className="flex items-center space-x-2">
                  {getKindIcon(kb.kind)}
                  <span className="text-xs font-medium capitalize text-slate-200">{kb.kind}s</span>
                </div>
                <span className="text-xs font-bold text-white">{kb.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Sections: Upcoming Expiries & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Expiries / Deadlines */}
        <div className="p-6 rounded-2xl panel space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Upcoming Expirations</h2>
            </div>
            {expiringSoonCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {expiringSoonCount} within 30 days
              </span>
            )}
          </div>

          {upcomingExpiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 space-y-2">
              <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-500">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-slate-300">All documents are up-to-date</p>
              <p className="text-xs text-slate-500">No items expiring within the next 30 days.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingExpiries.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    {getKindIcon(item.kind)}
                    <div className="truncate">
                      <p className="font-semibold text-slate-200 truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-[11px] text-slate-400 truncate">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-amber-400 font-medium text-[11px] block">
                      Expires {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
                <Link
                  to="/reminders"
                  className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center space-x-1"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Open Reminders & Deadlines &rarr;</span>
                </Link>
                <Link
                  to="/search?expiringSoon=true"
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Search Expiring
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Recent Vault Activity */}
        <div className="p-6 rounded-2xl panel space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              <h2 className="text-base font-semibold text-white">Recent Vault Items</h2>
            </div>
            <Link
              to="/vault"
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              View All &rarr;
            </Link>
          </div>

          {recentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 space-y-2">
              <p className="text-sm">No items created yet.</p>
              <Link
                to="/vault"
                className="text-xs text-brand-400 hover:text-brand-300 font-medium"
              >
                + Add your first document, note or link
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    {getKindIcon(item.kind)}
                    <span className="font-semibold text-slate-200 truncate">{item.title}</span>
                  </div>
                  <span className="text-slate-400 flex-shrink-0 text-[11px]">
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
