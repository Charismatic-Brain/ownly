import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Trash2,
  CreditCard,
  X,
  AlertCircle,
  Receipt,
  Repeat,
} from 'lucide-react';
import { vaultApi } from '../lib/vaultApi';
import type {
  Transaction,
  Bill,
  TransactionType,
  BillFrequency,
  CreateTransactionRequest,
  CreateBillRequest
} from '../types';

export const FinancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'transactions' | 'bills'>('transactions');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  // Queries
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: vaultApi.getFinanceSummary,
  });

  const { data: transactions = [], isLoading: txnsLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', typeFilter],
    queryFn: () => vaultApi.getTransactions({ type: typeFilter || undefined }),
  });

  const { data: bills = [], isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ['bills'],
    queryFn: () => vaultApi.getBills(),
  });

  // Mutations
  const deleteTxnMutation = useMutation({
    mutationFn: (id: string) => vaultApi.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: (id: string) => vaultApi.deleteBill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });

  const payBillMutation = useMutation({
    mutationFn: (id: string) => vaultApi.payBill(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Page Header (Apple Wallet Archetype) */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Finance & Ledger</h1>
          <p className="mt-1 max-w-xl text-xs text-slate-400 sm:text-sm">
            Sovereign ledger with exact integer minor-unit math and recurring subscriptions.
          </p>
        </div>

        {/* 1 Prominent Action Budget */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setIsBillModalOpen(true)}
            className="btn-secondary !text-xs !py-1.5 !px-3"
          >
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Add Bill
          </button>
          <button
            onClick={() => setIsTxnModalOpen(true)}
            className="btn-primary !text-xs !py-1.5 !px-3.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Transaction
          </button>
        </div>
      </header>

      {/* Apple Wallet Pass Card: Net Balance & Core Flow Metrics */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-modal">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold uppercase tracking-wider text-slate-400">Total Net Balance</span>
            <span className="rounded bg-brand-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-brand-300 border border-brand-500/20">
              INR · ₹
            </span>
          </div>
          <Wallet className="h-4 w-4 text-brand-400" />
        </div>

        {/* Main Big Currency Figure */}
        <div className="mt-3">
          <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono tabular-nums">
            {summaryLoading ? '...' : formatCurrency(summary?.netSavings || 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Cumulative balance across all recorded flows</p>
        </div>

        {/* Three High-Contrast Apple Ledger Metrics */}
        <div className="mt-6 grid grid-cols-1 divide-y divide-white/[0.06] border-t border-white/[0.07] pt-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:gap-4 sm:pt-4">
          {/* Inflow */}
          <div className="flex items-center justify-between pb-3 sm:pb-0 sm:pr-4">
            <div>
              <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Total Inflow
              </span>
              <span className="mt-0.5 block text-lg font-semibold text-emerald-400 font-mono tabular-nums">
                {summaryLoading ? '...' : `+${formatCurrency(summary?.totalIncome || 0)}`}
              </span>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>

          {/* Outflow */}
          <div className="flex items-center justify-between py-3 sm:py-0 sm:px-4">
            <div>
              <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Total Outflow
              </span>
              <span className="mt-0.5 block text-lg font-semibold text-rose-400 font-mono tabular-nums">
                {summaryLoading ? '...' : `-${formatCurrency(summary?.totalExpense || 0)}`}
              </span>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>

          {/* Active Recurring Load */}
          <div className="flex items-center justify-between pt-3 sm:pt-0 sm:pl-4">
            <div>
              <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Active Bills Load
              </span>
              <span className="mt-0.5 block text-lg font-semibold text-amber-300 font-mono tabular-nums">
                {summaryLoading ? '...' : formatCurrency(summary?.upcomingBillsTotal || 0)}
              </span>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown (Apple Card Style Spectrum) */}
      {summary && summary.categoryBreakdown.length > 0 && (
        <div className="panel p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="source-list-header !p-0">Spending by Category</h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {summary.categoryBreakdown.length} Categories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="rounded-xl bg-slate-950/60 border border-white/[0.06] p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200 truncate pr-2">{cat.category}</span>
                  <span className="font-semibold text-white font-mono tabular-nums">{formatCurrency(cat.totalAmount)}</span>
                </div>
                {/* Thin progress track */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 tabular-nums">
                  <span>{cat.count} txns</span>
                  <span>{cat.percentage}% of total</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Switcher: Segmented Control (Apple HIG: segmented-controls.md) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.07] pb-3">
        <div className="segmented-track">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`segmented-item ${activeTab === 'transactions' ? 'segmented-item-active' : ''}`}
          >
            Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`segmented-item ${activeTab === 'bills' ? 'segmented-item-active' : ''}`}
          >
            Bills & Subscriptions ({bills.length})
          </button>
        </div>

        {activeTab === 'transactions' && (
          <div className="segmented-track">
            {[
              { label: 'All', val: '' },
              { label: 'Expenses', val: 'expense' },
              { label: 'Income', val: 'income' },
            ].map((t) => (
              <button
                key={t.label}
                onClick={() => setTypeFilter(t.val)}
                className={`segmented-item ${typeFilter === t.val ? 'segmented-item-active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transactions Ledger */}
      {activeTab === 'transactions' && (
        <div className="space-y-2">
          {txnsLoading && (
            <div className="p-14 text-center text-slate-400 space-y-2.5">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading ledger...</p>
            </div>
          )}

          {!txnsLoading && transactions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-14 text-center flex flex-col items-center justify-center space-y-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-brand-400 border border-white/10">
                <Receipt className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-white">No transactions recorded</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Log income or expenses to track your spending trends and budget summaries.
              </p>
              <button
                onClick={() => setIsTxnModalOpen(true)}
                className="btn-primary mt-2 !text-xs !py-1.5 !px-3.5"
              >
                + Add Transaction
              </button>
            </div>
          )}

          {!txnsLoading &&
            transactions.map((txn) => {
              const isIncome = txn.type === 'income';
              return (
                <div
                  key={txn.id}
                  className="group panel p-3.5 flex items-center justify-between gap-4 hover:border-brand-500/25 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          {txn.category}
                        </span>
                        {txn.description && (
                          <span className="text-xs text-slate-400 truncate hidden sm:inline">
                            · {txn.description}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        {new Date(txn.occurredAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-semibold font-mono tabular-nums ${
                        isIncome ? 'text-emerald-400' : 'text-slate-100'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                    </span>
                    <button
                      onClick={() => deleteTxnMutation.mutate(txn.id)}
                      className="icon-btn h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-400 transition-opacity"
                      title="Delete entry"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Recurring Bills List */}
      {activeTab === 'bills' && (
        <div className="space-y-2">
          {billsLoading && (
            <div className="p-14 text-center text-slate-400 space-y-2.5">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading subscriptions...</p>
            </div>
          )}

          {!billsLoading && bills.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-14 text-center flex flex-col items-center justify-center space-y-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-amber-300 border border-white/10">
                <Repeat className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-white">No recurring bills set up</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Add subscriptions, rent, or utilities to receive upcoming due date alerts.
              </p>
              <button
                onClick={() => setIsBillModalOpen(true)}
                className="btn-primary mt-2 !text-xs !py-1.5 !px-3.5"
              >
                + Add Recurring Bill
              </button>
            </div>
          )}

          {!billsLoading &&
            bills.map((bill) => (
              <div
                key={bill.id}
                className="group panel p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-500/25 transition-all"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{bill.name}</span>
                    <span className="rounded bg-brand-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-brand-300 border border-brand-500/20 uppercase">
                      {bill.frequency}
                    </span>
                    <span className="text-xs text-slate-400">· {bill.category}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 tabular-nums">
                    <span>Next Due: {new Date(bill.nextDueAt).toLocaleDateString()}</span>
                    {bill.autopay && <span className="text-emerald-400 font-medium">Autopay Active</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span className="text-xs font-bold text-white font-mono tabular-nums">
                    {formatCurrency(bill.amount)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => payBillMutation.mutate(bill.id)}
                      disabled={payBillMutation.isPending}
                      className="btn-secondary !text-xs !py-1 !px-2.5 text-emerald-400 hover:text-emerald-300"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Mark Paid</span>
                    </button>
                    <button
                      onClick={() => deleteBillMutation.mutate(bill.id)}
                      className="icon-btn h-7 w-7 hover:text-rose-400"
                      title="Delete bill"
                      aria-label="Delete bill"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add Transaction Modal */}
      {isTxnModalOpen && (
        <AddTransactionModal
          onClose={() => setIsTxnModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
            setIsTxnModalOpen(false);
          }}
        />
      )}

      {/* Add Bill Modal */}
      {isBillModalOpen && (
        <AddBillModal
          onClose={() => setIsBillModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
            setIsBillModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

// ------------------------------------------------------------------
// Internal Modal: Add Transaction
// ------------------------------------------------------------------
interface ModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddTransactionModal: React.FC<ModalProps> = ({ onClose, onSuccess }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: CreateTransactionRequest) => vaultApi.createTransaction(data),
    onSuccess,
    onError: (err: any) => setError(err.message || 'Failed to save transaction'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    mutation.mutate({
      type,
      amount: parsedAmount,
      currency: 'INR',
      category: category.trim(),
      description: description.trim(),
      occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-surface max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-950/70">
          <h2 className="text-sm font-semibold text-white">Add Transaction</h2>
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

          {/* Type Segmented Control */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-semibold rounded-xl border transition-all active:scale-[0.98] ${
                type === 'expense'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white'
              }`}
            >
              Expense (-)
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-xs font-semibold rounded-xl border transition-all active:scale-[0.98] ${
                type === 'income'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white'
              }`}
            >
              Income (+)
            </button>
          </div>

          <div>
            <label className="field-label">Amount (INR)</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="field !h-9 text-xs"
            />
          </div>

          <div>
            <label className="field-label">Category</label>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Groceries, Rent, Salary, Utilities"
              className="field !h-9 text-xs"
            />
          </div>

          <div>
            <label className="field-label">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Merchant or note"
              className="field !h-9 text-xs"
            />
          </div>

          <div>
            <label className="field-label">Date (Optional)</label>
            <input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="field !h-9 text-xs"
            />
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost !text-xs !py-1 !px-3">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary !text-xs !py-1.5 !px-3.5">
              {mutation.isPending ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// Internal Modal: Add Bill
// ------------------------------------------------------------------
const AddBillModal: React.FC<ModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [dueDate, setDueDate] = useState('');
  const [autopay, setAutopay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: CreateBillRequest) => vaultApi.createBill(data),
    onSuccess,
    onError: (err: any) => setError(err.message || 'Failed to save bill'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (!dueDate) {
      setError('Please select a due date');
      return;
    }

    mutation.mutate({
      name: name.trim(),
      amount: parsedAmount,
      currency: 'INR',
      category: category.trim(),
      frequency,
      nextDueAt: new Date(dueDate).toISOString(),
      autopay,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-surface max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-950/70">
          <h2 className="text-sm font-semibold text-white">Add Recurring Bill</h2>
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
            <label className="field-label">Bill / Subscription Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Netflix, Electricity, Rent"
              className="field !h-9 text-xs"
            />
          </div>

          <div>
            <label className="field-label">Amount (INR)</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="field !h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Category</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Utilities"
                className="field !h-9 text-xs"
              />
            </div>
            <div>
              <label className="field-label">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                className="field !h-9 text-xs"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">Next Due Date</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="field !h-9 text-xs"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={autopay}
              onChange={(e) => setAutopay(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-brand-500/20"
            />
            <span>Autopay Enabled</span>
          </label>

          <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost !text-xs !py-1 !px-3">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary !text-xs !py-1.5 !px-3.5">
              {mutation.isPending ? 'Saving...' : 'Save Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
