import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  Calendar,
  CheckCircle2,
  Trash2,
  CreditCard,
  X,
  AlertCircle
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Wallet className="w-6 h-6 text-brand-400" />
            <span>Finance & Bills</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track manual income, expenses, and recurring bills with exact integer minor-unit math.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsBillModalOpen(true)}
            className="btn-secondary"
          >
            <Calendar className="w-4 h-4" />
            <span>Add Bill</span>
          </button>
          <button
            onClick={() => setIsTxnModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Income */}
        <div className="p-4 rounded-2xl panel">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold uppercase tracking-wider">
            <span>Total Income</span>
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 tracking-tight">
            {summaryLoading ? '...' : formatCurrency(summary?.totalIncome || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Recorded cash inflows</p>
        </div>

        {/* Total Expenses */}
        <div className="p-4 rounded-2xl panel">
          <div className="flex items-center justify-between text-xs text-rose-400 font-semibold uppercase tracking-wider">
            <span>Total Expenses</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 tracking-tight">
            {summaryLoading ? '...' : formatCurrency(summary?.totalExpense || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Recorded outflows</p>
        </div>

        {/* Net Savings */}
        <div className="p-4 rounded-2xl panel">
          <div className="flex items-center justify-between text-xs text-brand-400 font-semibold uppercase tracking-wider">
            <span>Net Savings</span>
            <PiggyBank className="w-4 h-4" />
          </div>
          <p
            className={`text-2xl font-bold mt-2 tracking-tight ${
              (summary?.netSavings || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {summaryLoading ? '...' : formatCurrency(summary?.netSavings || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Income minus expenses</p>
        </div>

        {/* Upcoming Active Bills */}
        <div className="p-4 rounded-2xl panel">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold uppercase tracking-wider">
            <span>Upcoming Bills</span>
            <CreditCard className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 tracking-tight">
            {summaryLoading ? '...' : formatCurrency(summary?.upcomingBillsTotal || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {summary?.activeBillsCount || 0} active recurring bills
          </p>
        </div>
      </div>

      {/* Category Breakdown Progress Bars */}
      {summary && summary.categoryBreakdown.length > 0 && (
        <div className="p-5 rounded-2xl panel space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Spending Breakdown by Category
            </h3>
            <span className="text-xs text-slate-500">
              {summary.categoryBreakdown.length} active categories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{cat.category}</span>
                  <span className="font-bold text-white">{formatCurrency(cat.totalAmount)}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{cat.count} transactions</span>
                  <span>{cat.percentage}% of expenses</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
              activeTab === 'transactions'
                ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
              activeTab === 'bills'
                ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Bills & Subscriptions ({bills.length})
          </button>
        </div>

        {activeTab === 'transactions' && (
          <div className="flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-white/[0.08]">
            {[
              { label: 'All', val: '' },
              { label: 'Expenses', val: 'expense' },
              { label: 'Income', val: 'income' },
            ].map((t) => (
              <button
                key={t.label}
                onClick={() => setTypeFilter(t.val)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-[0.97] ${
                  typeFilter === t.val
                    ? 'bg-brand-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transactions List */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          {txnsLoading && (
            <div className="p-16 text-center text-slate-400 space-y-3">
              <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading transactions...</p>
            </div>
          )}

          {!txnsLoading && transactions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-16 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                <Wallet className="w-6 h-6 text-brand-400" />
              </div>
              <h4 className="text-base font-semibold text-white">No transactions found</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Log income or expenses to track your spending trends and budget summaries.
              </p>
              <button
                onClick={() => setIsTxnModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-brand-400 text-xs font-semibold border border-slate-700"
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
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-slate-750 transition-colors"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {txn.category}
                        </span>
                        {txn.description && (
                          <span className="text-xs text-slate-400 truncate">
                            • {txn.description}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(txn.occurredAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span
                      className={`text-sm font-bold ${
                        isIncome ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                    </span>
                    <button
                      onClick={() => deleteTxnMutation.mutate(txn.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Bills List */}
      {activeTab === 'bills' && (
        <div className="space-y-3">
          {billsLoading && (
            <div className="p-16 text-center text-slate-400 space-y-3">
              <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading bills...</p>
            </div>
          )}

          {!billsLoading && bills.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-16 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                <CreditCard className="w-6 h-6 text-amber-400" />
              </div>
              <h4 className="text-base font-semibold text-white">No recurring bills set up</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Add subscriptions, rent, or utilities to receive upcoming due date alerts.
              </p>
              <button
                onClick={() => setIsBillModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-brand-400 text-xs font-semibold border border-slate-700"
              >
                + Add Recurring Bill
              </button>
            </div>
          )}

          {!billsLoading &&
            bills.map((bill) => (
              <div
                key={bill.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-white">{bill.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand-500/10 text-brand-400">
                      {bill.frequency}
                    </span>
                    <span className="text-xs text-slate-400">• {bill.category}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                    <span>Next Due: {new Date(bill.nextDueAt).toLocaleDateString()}</span>
                    {bill.autopay && <span className="text-emerald-400 font-medium">Autopay Active</span>}
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span className="text-base font-bold text-white">
                    {formatCurrency(bill.amount)}
                  </span>
                  <button
                    onClick={() => payBillMutation.mutate(bill.id)}
                    disabled={payBillMutation.isPending}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Paid</span>
                  </button>
                  <button
                    onClick={() => deleteBillMutation.mutate(bill.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
    <div className="modal-backdrop">
      <div className="modal-surface max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-900/60">
          <h2 className="text-base font-semibold text-white">Add Transaction</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector */}
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

          {/* Amount */}
          <div>
            <label className="field-label">Amount (INR)</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="field"
            />
          </div>

          {/* Category */}
          <div>
            <label className="field-label">Category</label>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Groceries, Rent, Salary, Travel, Utilities"
              className="field"
            />
          </div>

          {/* Description */}
          <div>
            <label className="field-label">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or merchant name"
              className="field"
            />
          </div>

          {/* Occurred At */}
          <div>
            <label className="field-label">Date (Optional)</label>
            <input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="field"
            />
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary"
            >
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
  const [nextDueAt, setNextDueAt] = useState('');
  const [autopay, setAutopay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: CreateBillRequest) => vaultApi.createBill(data),
    onSuccess,
    onError: (err: any) => setError(err.message || 'Failed to create bill'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid bill amount greater than 0');
      return;
    }
    if (!nextDueAt) {
      setError('Please specify a next due date');
      return;
    }

    mutation.mutate({
      name: name.trim(),
      amount: parsedAmount,
      currency: 'INR',
      frequency,
      category: category.trim(),
      nextDueAt: new Date(nextDueAt).toISOString(),
      autopay,
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-surface max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-900/60">
          <h2 className="text-base font-semibold text-white">Add Recurring Bill</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="field-label">Bill Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home Wi-Fi, Electricity, Netflix, Gym"
              className="field"
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
              className="field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                className="field"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
            <div>
              <label className="field-label">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Utilities"
                className="field"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Next Due Date</label>
            <input
              type="date"
              required
              value={nextDueAt}
              onChange={(e) => setNextDueAt(e.target.value)}
              className="field"
            />
          </div>

          <div className="flex items-center space-x-2.5 pt-1">
            <input
              type="checkbox"
              id="autopay"
              checked={autopay}
              onChange={(e) => setAutopay(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900 border-white/20 text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="autopay" className="text-xs text-slate-300 cursor-pointer">
              Autopay enabled via credit card / standing order
            </label>
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending ? 'Saving...' : 'Save Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
