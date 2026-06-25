const express = require('express');

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Expense = require('../models/Expense');
const { authenticate, requireRole } = require('../middleware/auth');
const { getXlmBalance } = require('../services/stellarService');

const router = express.Router();

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let liveBalance = null;
    try {
      liveBalance = await getXlmBalance(user.stellarPublicKey);
    } catch (e) {
      liveBalance = null; // account may not be funded/found yet; non-fatal
    }

    return res.json({ ...user.toSafeJSON(), liveXlmBalance: liveBalance });
  } catch (err) {
    return next(err);
  }
});

/**
 * Connect a Freighter wallet to the user's account.
 * On testnet, also auto-fund via Friendbot if the account has no balance.
 */
router.post('/connect-wallet', authenticate, async (req, res, next) => {
  try {
    const { stellarPublicKey } = req.body;
    if (!stellarPublicKey) return res.status(400).json({ error: 'stellarPublicKey is required.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.stellarPublicKey = stellarPublicKey;
    await user.save();

    // Auto-fund via Friendbot on testnet if account doesn't exist yet
    let funded = false;
    try {
      const checkRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${stellarPublicKey}`);
      if (!checkRes.ok) {
        // Account not found — fund it via Friendbot
        const fbRes = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(stellarPublicKey)}`);
        funded = fbRes.ok;
      }
    } catch (_) {
      // Non-fatal — wallet connect still succeeds
    }

    return res.json({
      message: `Wallet connected successfully.${funded ? ' Funded via Friendbot.' : ''}`,
      user: user.toSafeJSON(),
      funded,
    });
  } catch (err) {
    return next(err);
  }
});


/**
 * Disconnect a Freighter wallet from the user's account.
 */
router.post('/disconnect-wallet', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.stellarPublicKey = null;
    await user.save();

    return res.json({ message: 'Wallet disconnected successfully.', user: user.toSafeJSON() });
  } catch (err) {
    return next(err);
  }
});

/**
 * Parent links a student by email. This is a simple MVP "invite" — in a
 * production version this would be a two-sided confirmation flow, but for
 * demoing real fund transfers between two real onboarded users, a direct
 * link is enough.
 */
router.post('/link-student', authenticate, requireRole('parent'), async (req, res, next) => {
  try {
    const { studentEmail } = req.body;
    if (!studentEmail) return res.status(400).json({ error: 'studentEmail is required.' });

    const student = await User.findOne({ email: studentEmail.toLowerCase(), role: 'student' });
    if (!student) return res.status(404).json({ error: 'No student found with that email.' });

    const parent = await User.findById(req.user.id);

    if (!parent.linkedStudents.includes(student._id)) {
      parent.linkedStudents.push(student._id);
      await parent.save();
    }
    if (!student.linkedParents.includes(parent._id)) {
      student.linkedParents.push(parent._id);
      await student.save();
    }

    return res.json({ message: `Linked to ${student.name}.`, student: student.toSafeJSON() });
  } catch (err) {
    return next(err);
  }
});

/**
 * Any authenticated user can list registered universities — students need
 * this to pick a payee for tuition, and it's harmless, non-sensitive
 * directory data (name + public key only).
 */
router.get('/universities', authenticate, async (req, res, next) => {
  try {
    const universities = await User.find({ role: 'university' }).select('name email stellarPublicKey');
    return res.json(universities);
  } catch (err) {
    return next(err);
  }
});

router.get('/parent-dashboard', authenticate, requireRole('parent'), async (req, res, next) => {
  try {
    const parent = await User.findById(req.user.id).populate('linkedStudents');
    const transactions = await Transaction.find({ fromUser: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('toUser', 'name email role');

    const totalSent = transactions
      .filter((t) => t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0);

    let liveBalance = null;
    try {
      liveBalance = await getXlmBalance(parent.stellarPublicKey);
    } catch (e) {
      liveBalance = null;
    }

    return res.json({
      studentsLinked: parent.linkedStudents.map((s) => s.toSafeJSON()),
      totalSent,
      transactions,
      liveXlmBalance: liveBalance,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/student-dashboard', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const student = await User.findById(req.user.id);

    let liveBalance = null;
    try {
      liveBalance = await getXlmBalance(student.stellarPublicKey);
    } catch (e) {
      liveBalance = null;
    }

    const expenses = await Expense.find({ student: req.user.id }).sort({ spentAt: -1 }).limit(100);

    const categoryBreakdown = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    return res.json({
      monthlyBudget: student.monthlyBudget,
      liveXlmBalance: liveBalance,
      expenses,
      categoryBreakdown,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/university-dashboard', authenticate, requireRole('university'), async (req, res, next) => {
  try {
    const payments = await Transaction.find({ toUser: req.user.id, type: 'tuition_payment' })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('fromUser', 'name email');

    const totalReceived = payments
      .filter((p) => p.status === 'success')
      .reduce((sum, p) => sum + p.amount, 0);

    return res.json({ totalReceived, payments });
  } catch (err) {
    return next(err);
  }
});

/**
 * Returns all transactions relevant to the logged-in student:
 * - incoming deposits from parents (parent_deposit where toUser = student)
 * - outgoing tuition payments (tuition_payment where fromUser = student)
 */
router.get('/student-transactions', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const transactions = await Transaction.find({
      $or: [
        { toUser: req.user.id, type: 'parent_deposit' },
        { fromUser: req.user.id, type: 'tuition_payment' },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('fromUser', 'name email role')
      .populate('toUser', 'name email role');

    return res.json(transactions);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

