import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  Lock,
  Share2,
  Users,
  FileText,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import type { AuditLog } from '../types';

export const ActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('all');
  const [page, setPage] = useState(1);

  const fetchLogs = async (isRefresh: boolean = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const actionFilter = selectedCategory === 'all' ? undefined : selectedCategory;
      const outcomeFilter = selectedOutcome === 'all' ? undefined : selectedOutcome;
      const res = await vaultApi.getAuditLogs({
        action: actionFilter,
        outcome: outcomeFilter,
        page,
        limit: 50,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err: any) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedCategory, selectedOutcome, page]);

  const getActionIcon = (action: string) => {
    if (action.startsWith('auth.')) return <Lock className="w-4 h-4 text-brand-400" />;
    if (action.startsWith('share.')) return <Share2 className="w-4 h-4 text-purple-400" />;
    if (action.startsWith('family.')) return <Users className="w-4 h-4 text-teal-400" />;
    if (action.startsWith('item.') || action.startsWith('file.'))
      return <FileText className="w-4 h-4 text-sky-400" />;
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  const formatActionTitle = (action: string) => {
    switch (action) {
      case 'auth.login':
        return 'User Authenticated';
      case 'auth.register':
        return 'Account Registered';
      case 'item.create':
        return 'Vault Item Created';
      case 'item.delete':
        return 'Vault Item Trashed';
      case 'item.restore':
        return 'Vault Item Restored';
      case 'share.create':
        return 'Share Permission Granted';
      case 'share.revoke':
        return 'Share Permission Revoked';
      case 'share.access':
        return 'Shared Resource Accessed';
      case 'share.file_download':
        return 'Shared File Streamed';
      case 'family.create':
        return 'Family Group Established';
      case 'family.invite':
        return 'Family Member Invited';
      case 'family.invite_respond':
        return 'Family Invite Responded';
      case 'family.member_remove':
        return 'Family Member Removed';
      default:
        return action.replace('.', ' ').toUpperCase();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Activity className="w-7 h-7 text-brand-400" />
            <span>Security & Audit Trail</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable log of account authentication, access verification, and vault permissions.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="btn-secondary self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 panel rounded-2xl">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Activities' },
            { id: 'auth.login', label: 'Logins' },
            { id: 'item.create', label: 'Item Changes' },
            { id: 'share.create', label: 'Sharing Grants' },
            { id: 'family.invite', label: 'Family Events' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] ${
                selectedCategory === cat.id
                  ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Outcome Filter */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Outcome:</span>
          <select
            value={selectedOutcome}
            onChange={(e) => {
              setSelectedOutcome(e.target.value);
              setPage(1);
            }}
            className="field !w-auto !py-1 !text-xs"
          >
            <option value="all">All Outcomes</option>
            <option value="success">Successful</option>
            <option value="denied">Blocked / Denied</option>
          </select>
        </div>
      </div>

      {/* Audit Log Stream */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
          <span>Loading security audit records...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-16 panel rounded-2xl text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-300">No audit events match your filter</p>
          <p className="text-xs text-slate-500">
            Security actions, authorization checks, and vault mutations are automatically logged here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 panel rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/15 transition-all"
            >
              <div className="flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getActionIcon(log.action)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">
                      {formatActionTitle(log.action)}
                    </span>
                    {log.outcome === 'success' ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Success</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                        <XCircle className="w-3 h-3" />
                        <span>Denied</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                    <span>
                      Actor: <strong className="text-slate-300 font-medium">{log.actorEmail || log.actorUserId}</strong>
                    </span>
                    {log.resourceType && (
                      <>
                        <span>•</span>
                        <span>
                          Resource: <span className="text-slate-300 capitalize">{log.resourceType}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Metadata chips */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {Object.entries(log.metadata).map(([k, v]) => (
                        <span
                          key={k}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800"
                        >
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-right text-xs text-slate-500 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center flex-shrink-0">
                <span className="text-slate-400 font-medium">
                  {new Date(log.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-[11px] text-slate-500">
                  {new Date(log.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}

          {/* Footer total */}
          <div className="text-center text-xs text-slate-500 pt-2">
            Showing {logs.length} of {total} security audit events
          </div>
        </div>
      )}
    </div>
  );
};
