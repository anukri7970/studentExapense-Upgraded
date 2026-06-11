const mongoose = require('mongoose');

const { Schema } = mongoose;

const budgetReportSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    summary: { type: String, required: true },
    recommendations: [{ type: String }],
    categoryBreakdown: {
      type: Map,
      of: Number,
    },
    rawModelResponse: { type: String }, // kept for debugging / transparency
  },
  { timestamps: true }
);

budgetReportSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('BudgetReport', budgetReportSchema);
