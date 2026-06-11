const express = require('express');

const Expense = require('../models/Expense');
const User = require('../models/User');
const BudgetReport = require('../models/BudgetReport');
const { authenticate, requireRole } = require('../middleware/auth');
const { analyzeBudget } = require('../services/geminiService');
const { track } = require('../config/analytics');

const router = express.Router();

router.post('/analyze', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const student = await User.findById(req.user.id);
    const expenses = await Expense.find({ student: req.user.id });

    if (expenses.length === 0) {
      return res.status(400).json({ error: 'Add at least one expense before requesting an analysis.' });
    }

    const categoryBreakdown = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    let analysis;
    try {
      analysis = await analyzeBudget({ categoryBreakdown, monthlyBudget: student.monthlyBudget });
    } catch (aiErr) {
      const wrapped = new Error(`AI budget analysis failed: ${aiErr.message}`);
      wrapped.category = 'api';
      wrapped.statusCode = 502;
      return next(wrapped);
    }

    const report = await BudgetReport.create({
      student: student._id,
      summary: analysis.summary,
      recommendations: analysis.recommendations,
      categoryBreakdown,
      rawModelResponse: analysis.rawModelResponse,
    });

    track(student._id.toString(), 'ai_analysis_run', { riskLevel: analysis.riskLevel });

    return res.status(201).json({ ...report.toObject(), riskLevel: analysis.riskLevel });
  } catch (err) {
    return next(err);
  }
});

router.get('/history', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const reports = await BudgetReport.find({ student: req.user.id }).sort({ createdAt: -1 }).limit(20);
    return res.json(reports);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
