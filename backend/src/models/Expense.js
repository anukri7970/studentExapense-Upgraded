const mongoose = require('mongoose');

const { Schema } = mongoose;

const expenseSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['food', 'books', 'transport', 'rent', 'fees', 'other'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, maxlength: 200 },
    spentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

expenseSchema.index({ student: 1, spentAt: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
