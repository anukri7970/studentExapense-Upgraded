const express = require('express');

const Expense = require('../models/Expense');
const { authenticate, requireRole } = require('../middleware/auth');
const { track } = require('../config/analytics');

const router = express.Router();

router.post('/', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { category, amount, note, spentAt } = req.body;
    if (!category || amount == null || amount < 0) {
      return res.status(400).json({ error: 'category and a non-negative amount are required.' });
    }

    const expense = await Expense.create({
      student: req.user.id,
      category,
      amount,
      note,
      spentAt: spentAt || Date.now(),
    });

    track(req.user.id, 'expense_added', { category, amount });

    return res.status(201).json(expense);
  } catch (err) {
    return next(err);
  }
});

router.get('/', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const expenses = await Expense.find({ student: req.user.id }).sort({ spentAt: -1 });
    return res.json(expenses);
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, student: req.user.id });
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
