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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2.5">
            <Wallet className="w-6 h-6 text-brand-700" />
            <span>Finance & Bills</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track manual income, expenses, and recurring bills with exact integer minor-unit math.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsBillModalOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>+ Add Bill</span>
          </button>
          <button
            onClick={() => setIsTxnModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors shadow-sm "
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Transaction</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Income */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold uppercase">
            <span>Total Income</span>
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {summaryLoading ? '...' : formatCurrency(summary?.totalIncome || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Recorded cash inflows</p>
        </div>

        {/* Total Expenses */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold uppercase">
            <span>Total Expenses</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {summaryLoading ? '...' : formatCurrency(summary?.totalExpense || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Recorded outflows</p>
        </div>

        {/* Net Savings */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80">
          <div className="flex items-center justify-between text-xs text-brand-700 font-semibold uppercase">
            <span>Net Savings</span>
            <PiggyBank className="w-4 h-4" />
          </div>
          <p
            className={`text-2xl font-bold mt-2 ${
              (summary?.netSavings || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {summaryLoading ? '...' : formatCurrency(summary?.netSavings || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Income minus expenses</p>
        </div>

        {/* Upcoming Active Bills */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80">
          <div className="flex items-center justify-between text-xs text-amber-700 font-semibold uppercase">
            <span>Upcoming Bills</span>
            <CreditCard className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {summaryLoading ? '...' : formatCurrency(summary?.upcomingBillsTotal || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {summary?.activeBillsCount || 0} active recurring bills
          </p>
        </div>
      </div>

      {/* Category Breakdown Progress Bars */}
      {summary && summary.categoryBreakdown.length > 0 && (
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Spending Breakdown by Category
            </h3>
            <span className="text-xs text-slate-500">
              {summary.categoryBreakdown.length} active categories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{cat.category}</span>
                  <span className="font-bold text-slate-900">{formatCurrency(cat.totalAmount)}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
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
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'transactions'
                ? 'bg-brand-600 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'bills'
                ? 'bg-brand-600 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Bills & Subscriptions ({bills.length})
          </button>
        </div>

        {activeTab === 'transactions' && (
          <div className="flex items-center space-x-1 bg-slate-50/80 p-1 rounded-xl border border-slate-200">
            {[
              { label: 'All', val: '' },
              { label: 'Expenses', val: 'expense' },
              { label: 'Income', val: 'income' },
            ].map((t) => (
              <button
                key={t.label}
                onClick={() => setTypeFilter(t.val)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === t.val
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-500 hover:text-slate-900'
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
            <div className="p-16 text-center text-slate-500 space-y-3">
              <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading transactions...</p>
            </div>
          )}

          {!txnsLoading && transactions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/80 p-16 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                <Wallet className="w-6 h-6 text-brand-700" />
              </div>
              <h4 className="text-base font-semibold text-slate-900">No transactions found</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Log income or expenses to track your spending trends and budget summaries.
              </p>
              <button
                onClick={() => setIsTxnModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-brand-700 text-xs font-semibold border border-slate-200"
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
                  className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isIncome
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      }`}
                    >
                      {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {txn.category}
                        </span>
                        {txn.description && (
                          <span className="text-xs text-slate-500 truncate">
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
                        isIncome ? 'text-emerald-700' : 'text-slate-800'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                    </span>
                    <button
                      onClick={() => deleteTxnMutation.mutate(txn.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-800 hover:bg-slate-100 transition-colors"
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
            <div className="p-16 text-center text-slate-500 space-y-3">
              <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading bills...</p>
            </div>
          )}

          {!billsLoading && bills.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/80 p-16 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                <CreditCard className="w-6 h-6 text-amber-700" />
              </div>
              <h4 className="text-base font-semibold text-slate-900">No recurring bills set up</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Add subscriptions, rent, or utilities to receive upcoming due date alerts.
              </p>
              <button
                onClick={() => setIsBillModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-brand-700 text-xs font-semibold border border-slate-200"
              >
                + Add Recurring Bill
              </button>
            </div>
          )}

          {!billsLoading &&
            bills.map((bill) => (
              <div
                key={bill.id}
                className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-slate-900">{bill.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand-50 text-brand-700">
                      {bill.frequency}
                    </span>
                    <span className="text-xs text-slate-500">• {bill.category}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                    <span>Next Due: {new Date(bill.nextDueAt).toLocaleDateString()}</span>
                    {bill.autopay && <span className="text-emerald-700 font-medium">Autopay Active</span>}
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span className="text-base font-bold text-slate-900">
                    {formatCurrency(bill.amount)}
                  </span>
                  <button
                    onClick={() => payBillMutation.mutate(bill.id)}
                    disabled={payBillMutation.isPending}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-200 text-emerald-700 text-xs font-semibold border border-emerald-200/60 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Paid</span>
                  </button>
                  <button
                    onClick={() => deleteBillMutation.mutate(bill.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-800 hover:bg-slate-100 transition-colors"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80">
          <h2 className="text-base font-semibold text-slate-900">Add Transaction</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-slate-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200/60 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                type === 'expense'
                  ? 'bg-rose-100 border-rose-200/60 text-rose-700'
                  : 'bg-slate-50/80 border-slate-200 text-slate-500'
              }`}
            >
              Expense (-)
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                type === 'income'
                  ? 'bg-emerald-100 border-emerald-200/60 text-emerald-700'
                  : 'bg-slate-50/80 border-slate-200 text-slate-500'
              }`}
            >
              Income (+)
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Amount (INR)</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Category</label>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Groceries, Rent, Salary, Travel, Utilities"
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or merchant name"
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          {/* Occurred At */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Date (Optional)</label>
            <input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div className="pt-3 border-t border-slate-200/80 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80">
          <h2 className="text-base font-semibold text-slate-900">Add Recurring Bill</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-slate-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200/60 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Bill Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home Wi-Fi, Electricity, Netflix, Gym"
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Amount (INR)</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                className="field w-full px-3 py-2 text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Utilities"
                className="field w-full px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Next Due Date</label>
            <input
              type="date"
              required
              value={nextDueAt}
              onChange={(e) => setNextDueAt(e.target.value)}
              className="field w-full px-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autopay"
              checked={autopay}
              onChange={(e) => setAutopay(e.target.checked)}
              className="rounded bg-slate-100 border-slate-200 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="autopay" className="text-xs text-slate-700">
              Autopay enabled via credit card / standing order
            </label>
          </div>

          <div className="pt-3 border-t border-slate-200/80 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : 'Save Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
