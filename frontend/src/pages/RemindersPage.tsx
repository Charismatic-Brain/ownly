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
  ExternalLink,
  Check,
  CalendarDays,
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
        className={`group panel p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isOverdue
            ? 'border-rose-500/30 bg-rose-950/10'
            : isToday
            ? 'border-amber-500/30 bg-amber-950/10'
            : 'border-white/[0.08]'
        }`}
      >
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider ${
                item.kind === 'document_expiry'
                  ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                  : 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
              }`}
            >
              {item.kind === 'document_expiry' ? 'Doc Expiry' : 'Reminder'}
            </span>

            {item.priority && (
              <span
                className={`rounded px-1.5 py-0.2 text-[10px] font-semibold capitalize ${
                  item.priority === 'urgent'
                    ? 'bg-rose-500/15 text-rose-400'
                    : item.priority === 'high'
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {item.priority}
              </span>
            )}

            <span
              className={`text-xs font-semibold flex items-center gap-1 tabular-nums ${
                isOverdue
                  ? 'text-rose-400'
                  : isToday
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>
                {isOverdue
                  ? `Overdue (${Math.abs(item.daysUntil)}d ago)`
                  : isToday
                  ? 'Due Today'
                  : `In ${item.daysUntil} days (${new Date(item.deadlineDate).toLocaleDateString()})`}
              </span>
            </span>
          </div>

          <h4 className="text-xs font-semibold text-white truncate">{item.title}</h4>

          {item.description && (
            <p className="text-[11px] text-slate-400 line-clamp-1">{item.description}</p>
          )}

          {item.itemId && item.kind === 'reminder' && (
            <button
              onClick={() => handleInspectLinkedItem(item.itemId!)}
              className="inline-flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Inspect linked vault item</span>
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
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
                className="btn-secondary !text-xs !py-1 !px-2.5 text-emerald-400 hover:text-emerald-300"
              >
                <Check className="w-3 h-3" />
                <span>Done</span>
              </button>

              <div className="flex items-center bg-slate-950/70 rounded-lg p-0.5 border border-white/[0.08] text-xs">
                <button
                  onClick={() => snoozeMutation.mutate({ id: item.id, daysAhead: 1 })}
                  className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white rounded"
                  title="Snooze 1 day"
                >
                  +1d
                </button>
                <button
                  onClick={() => snoozeMutation.mutate({ id: item.id, daysAhead: 7 })}
                  className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white rounded"
                  title="Snooze 1 week"
                >
                  +7d
                </button>
              </div>

              <button
                onClick={() => handleDelete(item.id, item.title)}
                className="icon-btn h-7 w-7 hover:text-rose-400"
                title="Delete reminder"
                aria-label="Delete reminder"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button
              onClick={() => handleInspectLinkedItem(item.itemId!)}
              className="btn-secondary !text-xs !py-1 !px-2.5"
            >
              <span>Inspect Document</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Header (Apple Reminders Archetype) */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Reminders & Life Dates</h1>
          <p className="mt-1 max-w-xl text-xs text-slate-400 sm:text-sm">
            Document expirations, sovereign renewals, and timeline checklist.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary !text-xs !py-1.5 !px-3.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Reminder</span>
        </button>
      </header>

      {/* Apple Reminders Smart List Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Overdue */}
        <div className="panel p-3.5 space-y-1 border-rose-500/20">
          <div className="flex items-center justify-between text-xs text-rose-400 font-semibold uppercase tracking-wider">
            <span>Overdue</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight tabular-nums font-mono">{overdueCount}</p>
          <p className="text-[10px] text-slate-500">Urgent attention needed</p>
        </div>

        {/* Today */}
        <div className="panel p-3.5 space-y-1 border-amber-500/20">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold uppercase tracking-wider">
            <span>Due Today</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight tabular-nums font-mono">{todayCount}</p>
          <p className="text-[10px] text-slate-500">Expires before midnight</p>
        </div>

        {/* This Week */}
        <div className="panel p-3.5 space-y-1 border-brand-500/20">
          <div className="flex items-center justify-between text-xs text-brand-400 font-semibold uppercase tracking-wider">
            <span>This Week</span>
            <Calendar className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight tabular-nums font-mono">{thisWeekCount}</p>
          <p className="text-[10px] text-slate-500">Next 7 calendar days</p>
        </div>

        {/* Completed */}
        <div className="panel p-3.5 space-y-1 border-emerald-500/20">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold uppercase tracking-wider">
            <span>Completed</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight tabular-nums font-mono">{totalCompleted}</p>
          <p className="text-[10px] text-slate-500">Resolved life items</p>
        </div>
      </div>

      {/* Recessed Segmented Navigation */}
      <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
        <div className="segmented-track">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`segmented-item ${activeTab === 'timeline' ? 'segmented-item-active' : ''}`}
          >
            Active Timeline ({(deadlines?.overdue?.length || 0) + (deadlines?.today?.length || 0) + (deadlines?.thisWeek?.length || 0) + (deadlines?.upcoming?.length || 0)})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`segmented-item ${activeTab === 'all' ? 'segmented-item-active' : ''}`}
          >
            All Reminders ({reminders.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`segmented-item ${activeTab === 'completed' ? 'segmented-item-active' : ''}`}
          >
            Completed ({totalCompleted})
          </button>
        </div>
      </div>

      {/* View: Unified Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {deadlinesLoading && (
            <div className="p-14 text-center text-slate-400 space-y-2.5">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Computing cryptographic deadlines...</p>
            </div>
          )}

          {!deadlinesLoading &&
            (!deadlines ||
              (overdueCount === 0 &&
                todayCount === 0 &&
                thisWeekCount === 0 &&
                (deadlines.upcoming?.length ?? 0) === 0)) && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-14 text-center flex flex-col items-center justify-center space-y-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-brand-400 border border-white/10">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-semibold text-white">No upcoming deadlines</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Your vault has no upcoming document expirations or reminders scheduled.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn-primary mt-2 !text-xs !py-1.5 !px-3.5"
                >
                  Create First Reminder
                </button>
              </div>
            )}

          {/* Overdue Section */}
          {overdueCount > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                  Overdue ({overdueCount})
                </h3>
              </div>
              <div className="space-y-2">{deadlines?.overdue?.map(renderDeadlineCard)}</div>
            </div>
          )}

          {/* Today Section */}
          {todayCount > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <Clock className="h-4 w-4 text-amber-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Due Today ({todayCount})
                </h3>
              </div>
              <div className="space-y-2">{deadlines?.today?.map(renderDeadlineCard)}</div>
            </div>
          )}

          {/* This Week Section */}
          {thisWeekCount > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <Calendar className="h-4 w-4 text-brand-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  This Week ({thisWeekCount})
                </h3>
              </div>
              <div className="space-y-2">{deadlines?.thisWeek?.map(renderDeadlineCard)}</div>
            </div>
          )}

          {/* Upcoming Section */}
          {(deadlines?.upcoming?.length ?? 0) > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Later (Next 30 Days) ({deadlines?.upcoming?.length})
                </h3>
              </div>
              <div className="space-y-2">{deadlines?.upcoming?.map(renderDeadlineCard)}</div>
            </div>
          )}
        </div>
      )}

      {/* View: All Reminders (Apple Reminders Circular Checklist) */}
      {activeTab === 'all' && (
        <div className="space-y-2">
          {remindersLoading && (
            <div className="p-14 text-center text-slate-400 space-y-2.5">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading reminders...</p>
            </div>
          )}

          {!remindersLoading && reminders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-14 text-center flex flex-col items-center justify-center space-y-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-brand-400 border border-white/10">
                <Bell className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-white">No reminders created</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Add renewal alerts, passport dates, and critical follow-ups.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary mt-2 !text-xs !py-1.5 !px-3.5"
              >
                + Add Reminder
              </button>
            </div>
          )}

          {!remindersLoading &&
            reminders.map((r) => {
              const isCompleted = r.status === 'completed';
              return (
                <div
                  key={r.id}
                  className="group panel p-3 flex items-center justify-between gap-3 hover:border-brand-500/25 transition-all select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Apple Reminders Circular Checkbox */}
                    <button
                      onClick={() =>
                        toggleCompleteMutation.mutate({
                          id: r.id,
                          currentStatus: r.status,
                        })
                      }
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-all ${
                        isCompleted
                          ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                          : 'border-slate-600 hover:border-brand-400 bg-transparent'
                      }`}
                      aria-label={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                    >
                      {isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                    </button>

                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isCompleted ? 'text-slate-500 line-through' : 'text-white'
                        }`}
                      >
                        {r.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 tabular-nums">
                        <span>Due {new Date(r.remindAt).toLocaleDateString()}</span>
                        {r.priority && (
                          <span
                            className={`rounded px-1 text-[9px] font-bold uppercase ${
                              r.priority === 'urgent'
                                ? 'bg-rose-500/15 text-rose-400'
                                : r.priority === 'high'
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {r.priority}
                          </span>
                        )}
                        {r.itemId && (
                          <button
                            onClick={() => handleInspectLinkedItem(r.itemId!)}
                            className="text-brand-400 hover:underline"
                          >
                            Linked Asset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDelete(r.id, r.title)}
                      className="icon-btn h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-400 transition-opacity"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* View: Completed Reminders */}
      {activeTab === 'completed' && (
        <div className="space-y-2">
          {reminders.filter((r) => r.status === 'completed').length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-14 text-center">
              <p className="text-xs text-slate-400">No completed reminders yet.</p>
            </div>
          ) : (
            reminders
              .filter((r) => r.status === 'completed')
              .map((r) => (
                <div
                  key={r.id}
                  className="panel p-3 flex items-center justify-between gap-3 text-slate-500"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() =>
                        toggleCompleteMutation.mutate({
                          id: r.id,
                          currentStatus: r.status,
                        })
                      }
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-emerald-500 bg-emerald-500 text-slate-950"
                      title="Mark incomplete"
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </button>
                    <span className="text-xs line-through truncate text-slate-400">{r.title}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id, r.title)}
                    className="icon-btn h-7 w-7 hover:text-rose-400"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
          )}
        </div>
      )}

      {/* Modals & QuickLook */}
      {isCreateModalOpen && (
        <CreateReminderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      <ItemDetailModal
        item={viewingItem}
        collections={collections}
        onClose={() => setViewingItem(null)}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['items'] });
          if (viewingItem) {
            vaultApi.getItem(viewingItem.id).then(setViewingItem);
          }
        }}
        onToggleFavorite={async () => {}}
        onDeleteItem={async () => {
          setViewingItem(null);
        }}
      />
    </div>
  );
};
