const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * A mirrored record of an on-chain Stellar/Soroban transfer. The chain is
 * the source of truth; this collection exists so the dashboard can query
 * transaction history quickly and so we have a durable audit trail even if
 * Horizon/RPC history windows roll off.
 */
const transactionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['parent_deposit', 'student_release', 'tuition_payment'],
      required: true,
    },
    fromUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    assetCode: { type: String, default: 'XLM' },
    txHash: { type: String, required: true, unique: true },
    contractId: { type: String }, // populated for deposit/release via Soroban contract
    memo: { type: String },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

transactionSchema.index({ fromUser: 1, createdAt: -1 });
transactionSchema.index({ toUser: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
