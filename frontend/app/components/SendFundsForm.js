'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { signTransaction } from '@stellar/freighter-api';
import posthog from 'posthog-js';
import api, { getErrorMessage } from '../lib/api';
import Panel from './ui/Panel';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';

export default function SendFundsForm({ students, onSuccess }) {
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    setSubmitError('');
    try {
      const { data: buildData } = await api.post('/transactions/deposit/build', {
        studentId: values.studentId,
        amount: Number(values.amount),
      });
      
      let signedXdr;
      try {
        signedXdr = await signTransaction(buildData.xdr, { network: 'TESTNET' });
      } catch (signErr) {
        setSubmitError('Transaction signing was cancelled or failed.');
        return;
      }

      const { data } = await api.post('/transactions/deposit/submit', {
        signedXdr,
        studentId: values.studentId,
        amount: Number(values.amount),
      });

      posthog.capture('funds_sent', { amount: Number(values.amount) });
      reset();
      onSuccess(data);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  };

  if (students.length === 0) {
    return (
      <Panel className="p-6">
        <p className="font-display text-lg mb-1">Send funds</p>
        <p className="text-sm text-slate-muted">
          Link a student by email below before you can send a transfer.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <p className="font-display text-lg mb-4">Send funds</p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Select
          label="Student"
          error={errors.studentId?.message}
          {...register('studentId', { required: 'Choose a student.' })}
        >
          <option value="">Select a student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.email})
            </option>
          ))}
        </Select>
        <Input
          label="Amount (XLM)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="500"
          error={errors.amount?.message}
          {...register('amount', {
            required: 'Enter an amount.',
            min: { value: 0.01, message: 'Amount must be greater than 0.' },
          })}
        />
        {submitError && (
          <p role="alert" className="text-sm text-coral">
            {submitError}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} className="w-full">
          Send via Stellar
        </Button>
      </form>
    </Panel>
  );
}
