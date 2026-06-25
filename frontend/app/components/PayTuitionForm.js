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

export default function PayTuitionForm({ universities, onSuccess }) {
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
      const { data: buildData } = await api.post('/transactions/pay-tuition/build', {
        universityId: values.universityId,
        amount: Number(values.amount),
      });

      let signedXdr;
      try {
        signedXdr = await signTransaction(buildData.xdr, { network: 'TESTNET' });
      } catch (signErr) {
        setSubmitError('Transaction signing was cancelled or failed.');
        return;
      }

      const { data } = await api.post('/transactions/pay-tuition/submit', {
        signedXdr,
        universityId: values.universityId,
        amount: Number(values.amount),
      });

      posthog.capture('tuition_paid', { amount: Number(values.amount) });
      reset();
      onSuccess(data);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  };

  if (!universities || universities.length === 0) {
    return (
      <Panel className="p-6">
        <p className="font-display text-lg mb-1">Pay tuition</p>
        <p className="text-sm text-slate-muted">
          No universities are registered yet. Once one signs up, it&apos;ll appear here.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <p className="font-display text-lg mb-4">Pay tuition</p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <Select
          label="University"
          error={errors.universityId?.message}
          {...register('universityId', { required: 'Choose a university.' })}
        >
          <option value="">Select a university</option>
          {universities.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Input
          label="Amount (XLM)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="200"
          error={errors.amount?.message}
          {...register('amount', { required: 'Enter an amount.', min: 0.01 })}
        />
        {submitError && (
          <p role="alert" className="text-sm text-coral">
            {submitError}
          </p>
        )}
        <Button type="submit" variant="secondary" loading={isSubmitting}>
          Pay via Stellar
        </Button>
      </form>
    </Panel>
  );
}
