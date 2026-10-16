import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import { CreateReminderModal } from '../components/CreateReminderModal';
import { ItemDetailModal } from '../components/ItemDetailModal';
import type { Reminder, DeadlineItem, Item, Collection } from '../types';

export const RemindersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'timeline' | 'all' | 'completed'>('timeline');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);

  // Unified Deadlines Query
  const { data: deadlines, isLoading: deadlinesLoading } = useQuery({
    queryKey: ['deadlines', 30],
    queryFn: () => vaultApi.getUpcomingDeadlines(30),
  });

  // Reminders List Query
  const { data: reminders = [], isLoading: remindersLoading } = useQuery<Reminder[]>({
    queryKey: ['reminders'],
    queryFn: () => vaultApi.getReminders(),
  });

  // Collections (for item detail modal)
  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: vaultApi.getCollections,
  });

  // Toggle complete mutation
  const toggleCompleteMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) =>
      vaultApi.updateReminder(id, {
        status: currentStatus === 'completed' ? 'pending' : 'completed',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Snooze mutation
  const snoozeMutation = useMutation({
    mutationFn: ({ id, daysAhead }: { id: string; daysAhead: number }) => {
      const target = new Date();
      target.setDate(target.getDate() + daysAhead);
      return vaultApi.updateReminder(id, {
        snoozedUntil: target.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => vaultApi.deleteReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Delete reminder "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleInspectLinkedItem = async (itemId: string) => {
    try {
      const it = await vaultApi.getItem(itemId);
      setViewingItem(it);
    } catch {
      // Ignored
    }
  };

  const overdueCount = deadlines?.overdue?.length ?? 0;
  const todayCount = deadlines?.today?.length ?? 0;
  const thisWeekCount = deadlines?.thisWeek?.length ?? 0;
  const totalCompleted = reminders.filter((r) => r.status === 'completed').length;

  const renderDeadlineCard = (item: DeadlineItem) => {
    const isOverdue = item.category === 'overdue';
    const isToday = item.category === 'today';

    return (
      <div
        key={`${item.kind}-${item.id}`}
        className={`p-4 rounded-xl border transition-all ${
          isOverdue
            ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
            : isToday
            ? 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700/60'
            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
        } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                item.kind === 'document_expiry'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
              }`}
            >
              {item.kind === 'document_expiry' ? 'Doc Expiry' : 'Reminder'}
            </span>

            {item.priority && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                  item.priority === 'urgent'
                    ? 'bg-rose-500/10 text-rose-400'
                    : item.priority === 'high'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {item.priority}
              </span>
            )}

            <span
              className={`text-xs font-semibold flex items-center space-x-1 ${
                isOverdue
                  ? 'text-rose-400'
                  : isToday
                  ? 'text-amber-400'
                  : 'text-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {isOverdue
                  ? `Overdue (${Math.abs(item.daysUntil)}d ago)`
                  : isToday
                  ? 'Due Today'
                  : `In ${item.daysUntil} days (${new Date(item.deadlineDate).toLocaleDateString()})`}
              </span>
            </span>
          </div>

          <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>

          {item.description && (
            <p className="text-xs text-slate-400 line-clamp-1">{item.description}</p>
          )}

          {item.itemId && item.kind === 'reminder' && (
            <button
              onClick={() => handleInspectLinkedItem(item.itemId!)}
              className="inline-flex items-center space-x-1 text-[11px] text-brand-400 hover:text-brand-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>View linked vault document</span>
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          {item.kind === 'reminder' ? (
            <>
              <button
                onClick={() =>
                  toggleCompleteMutation.mutate({
                    id: item.id,
                    currentStatus: item.status || 'pending',
                  })
                }
                title="Mark completed"
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 text-xs font-medium border border-emerald-500/20 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>

              <div className="flex items-center bg-slate-850 rounded-lg p-0.5 border border-slate-750 text-xs">
                <button
                  onClick={() => snoozeMutation.mutate({ id: item.id, daysAhead: 1 })}
                  className="px-2 py-1 text-slate-400 hover:text-white rounded"
                  title="Snooze 1 day"
                >
                  +1d
                </button>
                <button
                  onClick={() => snoozeMutation.mutate({ id: item.id, daysAhead: 7 })}
                  className="px-2 py-1 text-slate-400 hover:text-white rounded"
                  title="Snooze 1 week"
                >
                  +7d
                </button>
              </div>

              <button
                onClick={() => handleDelete(item.id, item.title)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Delete reminder"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => handleInspectLinkedItem(item.itemId!)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              <span>Inspect Document</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Bell className="w-6 h-6 text-brand-400" />
            <span>Reminders & Life Dates</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track document expirations, renewal deadlines, and personal alerts with clear timeline visibility.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-brand-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Reminder</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-rose-400 font-semibold uppercase">
            <span>Overdue</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{overdueCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Requires immediate attention</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold uppercase">
            <span>Due Today</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{todayCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Due before end of day</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-brand-400 font-semibold uppercase">
            <span>This Week</span>
            <Calendar className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{thisWeekCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Next 7 calendar days</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold uppercase">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalCompleted}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Resolved in-app alerts</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'timeline'
              ? 'bg-brand-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          Upcoming Deadlines
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'all'
              ? 'bg-brand-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          All Reminders ({reminders.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'completed'
              ? 'bg-brand-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          Completed Archive ({totalCompleted})
        </button>
      </div>

      {/* Content for: Upcoming Deadlines Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {deadlinesLoading && (
            <div className="p-16 text-center text-slate-400 space-y-3">
              <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Computing upcoming timeline...</p>
            </div>
          )}

          {!deadlinesLoading && (deadlines?.totalActive ?? 0) === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-16 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-white">No upcoming deadlines</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                All your documents are up-to-date and there are no pending reminders scheduled.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-brand-400 text-xs font-semibold border border-slate-700 transition-colors"
              >
                + Add a Reminder
              </button>
            </div>
          )}

          {/* Section: Overdue */}
          {!deadlinesLoading && deadlines?.overdue && deadlines.overdue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Overdue ({deadlines.overdue.length})</span>
              </div>
              <div className="space-y-2.5">{deadlines.overdue.map(renderDeadlineCard)}</div>
            </div>
          )}

          {/* Section: Due Today */}
          {!deadlinesLoading && deadlines?.today && deadlines.today.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Due Today ({deadlines.today.length})</span>
              </div>
              <div className="space-y-2.5">{deadlines.today.map(renderDeadlineCard)}</div>
            </div>
          )}

          {/* Section: This Week */}
          {!deadlinesLoading && deadlines?.thisWeek && deadlines.thisWeek.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                <Calendar className="w-4 h-4" />
                <span>Due This Week ({deadlines.thisWeek.length})</span>
              </div>
              <div className="space-y-2.5">{deadlines.thisWeek.map(renderDeadlineCard)}</div>
            </div>
          )}

          {/* Section: Upcoming Later */}
          {!deadlinesLoading && deadlines?.upcoming && deadlines.upcoming.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span>Upcoming (Next 30 Days) ({deadlines.upcoming.length})</span>
              </div>
              <div className="space-y-2.5">{deadlines.upcoming.map(renderDeadlineCard)}</div>
            </div>
          )}
        </div>
      )}

      {/* Content for: All Reminders or Completed Archive */}
      {(activeTab === 'all' || activeTab === 'completed') && (
        <div className="space-y-3">
          {remindersLoading && (
            <div className="p-16 text-center text-slate-400 space-y-3">
              <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading reminders...</p>
            </div>
          )}

          {(() => {
            const list = reminders.filter((r) =>
              activeTab === 'completed' ? r.status === 'completed' : r.status !== 'completed'
            );

            if (!remindersLoading && list.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-16 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                    <Bell className="w-6 h-6 text-brand-400" />
                  </div>
                  <h4 className="text-base font-semibold text-white">
                    {activeTab === 'completed' ? 'No completed reminders yet' : 'No active reminders'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {activeTab === 'completed'
                      ? 'Marked completed reminders will be archived here.'
                      : 'Set reminders for deadlines, appointments, and bill renewals.'}
                  </p>
                </div>
              );
            }

            return list.map((rem) => (
              <div
                key={rem.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        rem.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : rem.isOverdue
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {rem.status}
                    </span>
                    <h4
                      className={`text-sm font-semibold ${
                        rem.status === 'completed' ? 'line-through text-slate-500' : 'text-white'
                      }`}
                    >
                      {rem.title}
                    </h4>
                  </div>

                  {rem.description && (
                    <p className="text-xs text-slate-400 line-clamp-1">{rem.description}</p>
                  )}

                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Due: {new Date(rem.remindAt).toLocaleString()}</span>
                    </span>
                    {rem.itemTitle && (
                      <span className="text-brand-400">Linked: {rem.itemTitle}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() =>
                      toggleCompleteMutation.mutate({
                        id: rem.id,
                        currentStatus: rem.status,
                      })
                    }
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-brand-400 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    {rem.status === 'completed' ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(rem.id, rem.title)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Create Reminder Modal */}
      <CreateReminderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={viewingItem}
        collections={collections}
        onClose={() => setViewingItem(null)}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['deadlines'] });
        }}
        onToggleFavorite={async () => {}}
        onDeleteItem={async () => {}}
      />
    </div>
  );
};
