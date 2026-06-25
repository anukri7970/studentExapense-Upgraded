'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { isAllowed, setAllowed, requestAccess } from '@stellar/freighter-api';
import { useAuth } from '../../lib/AuthContext';
import Panel from '../../components/ui/Panel';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const roles = [
  { value: 'parent', label: 'Parent', sub: 'Send funds to a student' },
  { value: 'student', label: 'Student', sub: 'Receive funds, track spending' },
  { value: 'university', label: 'University', sub: 'Receive tuition payments' },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const [role, setRole] = useState('student');
  const [stellarPublicKey, setStellarPublicKey] = useState('');
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const handleConnectWallet = async () => {
    setSubmitError('');
    setIsConnectingWallet(true);
    try {
      if (!(await isAllowed())) {
        await setAllowed();
      }
      const access = await requestAccess();
      if (access.error) {
        setSubmitError(access.error);
      } else {
        setStellarPublicKey(access.address);
      }
    } catch (err) {
      setSubmitError('Failed to connect Freighter wallet. Please ensure the extension is installed and unlocked.');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const onSubmit = async (values) => {
    if (!stellarPublicKey) {
      setSubmitError('Please connect your Freighter wallet first.');
      return;
    }
    setSubmitError('');
    const result = await signup({ ...values, role, stellarPublicKey });
    if (!result.ok) setSubmitError(result.message);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-lg block text-center mb-8">
          Student Expense Wallet
        </Link>

        <Panel className="p-8">
          <h1 className="font-display text-2xl mb-1">Create your account</h1>
          <p className="text-sm text-slate-muted mb-6">
            Connect your Freighter wallet to receive and send real transactions.
          </p>

          <fieldset className="mb-6">
            <legend className="text-sm font-medium text-slate-muted mb-2">I am a</legend>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  aria-pressed={role === r.value}
                  className={`text-left rounded-md border px-3 py-2.5 transition-colors duration-150 ${
                    role === r.value
                      ? 'border-signal-gold bg-signal-gold/10'
                      : 'border-ink-border bg-ink-raised hover:border-slate-faint'
                  }`}
                >
                  <span className="block text-sm font-medium text-parchment">{r.label}</span>
                  <span className="block text-xs text-slate-faint mt-0.5">{r.sub}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label={role === 'university' ? 'Institution name' : 'Full name'}
              placeholder={role === 'university' ? 'Greenfield University' : 'Asha Verma'}
              error={errors.name?.message}
              {...register('name', { required: 'Name is required.' })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required.',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email.' },
              })}
            />
            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required.',
                minLength: { value: 8, message: 'Use at least 8 characters.' },
              })}
            />

            <div className="mt-2">
              <p className="text-sm font-medium text-slate-muted mb-2">Wallet Connection</p>
              {stellarPublicKey ? (
                <div className="p-3 bg-ink-raised border border-ink-border rounded-md text-sm text-parchment flex items-center justify-between">
                  <span className="truncate mr-4">{stellarPublicKey}</span>
                  <span className="text-emerald-400 font-medium whitespace-nowrap">Connected</span>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleConnectWallet}
                  loading={isConnectingWallet}
                >
                  Connect Freighter Wallet
                </Button>
              )}
            </div>

            {submitError && (
              <p role="alert" className="text-sm text-coral">
                {submitError}
              </p>
            )}

            <Button type="submit" loading={isSubmitting} disabled={!stellarPublicKey} className="mt-2 w-full" size="lg">
              Create account
            </Button>
          </form>
        </Panel>

        <p className="text-center text-sm text-slate-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-signal-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
