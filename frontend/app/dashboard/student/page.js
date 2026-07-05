'use client';

import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../lib/api';
import { useRequireRole } from '../../lib/useRequireRole';
import { useAuth } from '../../lib/AuthContext';
import DashboardShell from '../../components/DashboardShell';
import Panel from '../../components/ui/Panel';
import { PanelSkeleton } from '../../components/ui/Feedback';
import Toast from '../../components/ui/Toast';
import AddExpenseForm from '../../components/AddExpenseForm';
import ExpenseList from '../../components/ExpenseList';
import ExpensePieChart from '../../components/ExpensePieChart';
import MonthlyTrendChart from '../../components/MonthlyTrendChart';
import AiAdvisorPanel from '../../components/AiAdvisorPanel';
import PayTuitionForm from '../../components/PayTuitionForm';
import ReleaseFundsForm from '../../components/ReleaseFundsForm';
import ErrorBoundary from '../../components/ErrorBoundary';
import ConnectWallet from '../../components/ConnectWallet';
import TransactionList from '../../components/TransactionList';

export default function StudentDashboardPage() {
  const { ready } = useRequireRole('student');
  const { refresh } = useAuth();
  const [data, setData] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [incomingTxns, setIncomingTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: dashboard }, { data: uniList }, { data: txList }] = await Promise.all([
        api.get('/users/student-dashboard'),
        api.get('/users/universities'),
        api.get('/users/student-transactions'),
      ]);
      setData(dashboard);
      setUniversities(uniList);
      setIncomingTxns(txList);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) fetchDashboard();
  }, [ready, fetchDashboard]);

  const handleExpenseAdded = () => {
    setToast({ message: 'Expense logged.', tone: 'mint' });
    fetchDashboard();
  };

  const handleExpenseDeleted = (id) => {
    setData((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e._id !== id) }));
  };

  const handleTuitionPaid = (result) => {
    const txHash = result?.transaction?.txHash;
    const explorerUrl = txHash ? `https://stellar.expert/explorer/testnet/tx/${txHash}` : null;
    setToast({
      message: txHash ? 'Tuition paid! View on Stellar Explorer ↗' : 'Tuition payment sent.',
      tone: 'mint',
      href: explorerUrl,
    });
    fetchDashboard();
    refresh();
  };

  const handleFundsReleased = (result) => {
    const txHash = result?.transaction?.txHash;
    const explorerUrl = txHash ? `https://stellar.expert/explorer/testnet/tx/${txHash}` : null;
    setToast({
      message: txHash ? 'Funds released from escrow! View on Explorer ↗' : 'Funds released.',
      tone: 'mint',
      href: explorerUrl,
    });
    fetchDashboard();
    refresh();
  };

  if (!ready) return null;

  return (
    <DashboardShell>
      <h1 className="font-display text-3xl mb-1">Student dashboard</h1>
      <p className="text-slate-muted mb-8">Track spending, settle tuition, get AI guidance.</p>
      <div className="bg-ink-raised p-4 rounded mb-8 border border-ink-border"><p className="font-medium text-parchment mb-2">Savings Goal</p><div className="w-full bg-ink-base rounded-full h-2.5"><div className="bg-signal-gold h-2.5 rounded-full" style={{width: "45%"}}></div></div></div>

      {loading && (
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {[0, 1, 2].map((i) => (
            <Panel key={i}>
              <PanelSkeleton rows={2} />
            </Panel>
          ))}
        </div>
      )}

      {!loading && error && (
        <Panel className="p-6 mb-8 border-coral/40">
          <p className="text-coral text-sm">{error}</p>
        </Panel>
      )}

      {!loading && !error && data && (
        <ErrorBoundary>
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            <Panel className="p-6">
              <p className="text-sm text-slate-muted mb-1">Wallet balance</p>
              <p className="font-display text-3xl tabular">
                {data.liveXlmBalance != null ? `${Number(data.liveXlmBalance).toLocaleString()} XLM` : '—'}
              </p>
            </Panel>
            <Panel className="p-6">
              <p className="text-sm text-slate-muted mb-1">Monthly budget</p>
              <p className="font-display text-3xl tabular">{data.monthlyBudget.toLocaleString()} XLM</p>
            </Panel>
            <Panel className="p-6">
              <p className="text-sm text-slate-muted mb-1">Expenses logged</p>
              <p className="font-display text-3xl tabular">{data.expenses.length}</p>
            </Panel>
          </div>

          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            <Panel className="p-6">
              <p className="font-display text-lg mb-4">Spending by category</p>
              <ExpensePieChart categoryBreakdown={data.categoryBreakdown} />
              <div className="mt-4"><button className="text-xs text-signal-gold underline w-full text-center">View Detailed Analytics Dashboard</button></div>
            </Panel>
            <Panel className="p-6">
              <p className="font-display text-lg mb-4">Monthly trend</p>
              <MonthlyTrendChart expenses={data.expenses} />
            </Panel>
          </div>

          <div className="grid lg:grid-cols-3 gap-5 mb-5">
            <div className="lg:col-span-2 flex flex-col gap-5">
              <div className="bg-ink-raised p-4 rounded mb-4 border border-ink-border flex justify-between items-center"><span className="text-sm">Split an expense with roommates?</span><button className="text-xs bg-signal-gold text-ink-base px-2 py-1 rounded">Split Bill Calculator</button></div>
              <AddExpenseForm onSuccess={handleExpenseAdded} />
            </div>
            <div className="flex flex-col gap-5">
              <ConnectWallet onWalletChange={fetchDashboard} />
              <PayTuitionForm universities={universities} onSuccess={handleTuitionPaid} />
              <ReleaseFundsForm linkedParents={data.linkedParents} onSuccess={handleFundsReleased} />
            </div>
          </div>

          <div className="mb-5">
            <AiAdvisorPanel hasExpenses={data.expenses.length > 0} />
          </div>

          <Panel className="p-6 mb-5">
            <div className="flex justify-between items-center mb-4"><p className="font-display text-lg">Wallet transaction history</p><button className="text-xs bg-ink-raised px-2 py-1 rounded border border-ink-border">Export to PDF</button></div>
            <TransactionList
              transactions={incomingTxns}
              emptyTitle="No wallet transactions yet"
              emptyDescription="Transactions from your parent or to university will appear here once complete."
            />
          </Panel>

          <Panel className="p-6">
            <p className="font-display text-lg mb-4">Expense history</p>
            <ExpenseList expenses={data.expenses} onDeleted={handleExpenseDeleted} />
          </Panel>
        </ErrorBoundary>
      )}

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </DashboardShell>
  );
}
