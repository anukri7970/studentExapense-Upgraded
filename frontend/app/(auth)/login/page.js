'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../lib/AuthContext';
import Panel from '../../components/ui/Panel';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    setSubmitError('');
    const result = await login(values.email, values.password);
    if (!result.ok) setSubmitError(result.message);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-lg block text-center mb-8">
          Student Expense Wallet
        </Link>

        <Panel className="p-8">
          <h1 className="font-display text-2xl mb-1">Welcome back</h1>
          <p className="text-sm text-slate-muted mb-6">Sign in to view your wallet and transfers.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email', { required: 'Email is required.' })}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Your password"
              error={errors.password?.message}
              {...register('password', { required: 'Password is required.' })}
            />

            {submitError && (
              <p role="alert" className="text-sm text-coral">
                {submitError}
              </p>
            )}

            <Button type="submit" loading={isSubmitting} className="mt-2 w-full" size="lg">
              Sign in
            </Button>
          </form>
        </Panel>

        <p className="text-center text-sm text-slate-muted mt-6">
          New here?{' '}
          <Link href="/signup" className="text-signal-gold hover:underline">
            Create a wallet
          </Link>
        </p>
      </div>
    </main>
  );
}
