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
import ErrorBoundary from '../../components/ErrorBoundary';
import ConnectWallet from '../../components/ConnectWallet';

export default function StudentDashboardPage() {
  const { ready } = useRequireRole('student');
  const { refresh } = useAuth();
  const [data, setData] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: dashboard }, { data: uniList }] = await Promise.all([
        api.get('/users/student-dashboard'),
        api.get('/users/universities'),
      ]);
      setData(dashboard);
      setUniversities(uniList);
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

  const handleTuitionPaid = () => {
    setToast({ message: 'Tuition payment sent.', tone: 'mint' });
    fetchDashboard();
    refresh();
  };

  if (!ready) return null;

  return (
    <DashboardShell>
      <h1 className="font-display text-3xl mb-1">Student dashboard</h1>
      <p className="text-slate-muted mb-8">Track spending, settle tuition, get AI guidance.</p>

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
            </Panel>
            <Panel className="p-6">
              <p className="font-display text-lg mb-4">Monthly trend</p>
              <MonthlyTrendChart expenses={data.expenses} />
            </Panel>
          </div>

          <div className="grid lg:grid-cols-3 gap-5 mb-5">
            <div className="lg:col-span-2 flex flex-col gap-5">
              <AddExpenseForm onSuccess={handleExpenseAdded} />
            </div>
            <div className="flex flex-col gap-5">
              <ConnectWallet />
              <PayTuitionForm universities={universities} onSuccess={handleTuitionPaid} />
            </div>
          </div>

          <div className="mb-5">
            <AiAdvisorPanel hasExpenses={data.expenses.length > 0} />
          </div>

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
