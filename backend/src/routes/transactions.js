const express = require('express');
const { TransactionBuilder, Networks, Operation, Asset, BASE_FEE, Memo } = require('@stellar/stellar-sdk');

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticate, requireRole } = require('../middleware/auth');
const { getHorizonServer } = require('../services/stellarService');
const { track } = require('../config/analytics');

const router = express.Router();

// ----------------------------------------------------------------------------
// DEPOSIT (Parent -> Student) — simple Horizon XLM payment, signed by parent
// ----------------------------------------------------------------------------
router.post('/deposit/build', authenticate, requireRole('parent'), async (req, res, next) => {
  try {
    const { studentId, amount } = req.body;
    if (!studentId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid input.' });

    const parent = await User.findById(req.user.id);
    const student = await User.findById(studentId);

    if (!parent?.stellarPublicKey) return res.status(400).json({ error: 'Connect your Freighter wallet first.' });
    if (!student || student.role !== 'student') return res.status(404).json({ error: 'Student not found.' });
    if (!student.stellarPublicKey) return res.status(400).json({ error: 'Student has not connected a wallet yet.' });

    const server = getHorizonServer();
    const account = await server.loadAccount(parent.stellarPublicKey);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.payment({
        destination: student.stellarPublicKey,
        asset: Asset.native(),
        amount: amount.toString(),
      }))
      .addMemo(Memo.text('StudentXpense transfer'))
      .setTimeout(300)
      .build();

    return res.json({ xdr: tx.toXDR() });
  } catch (err) {
    return next(err);
  }
});

router.post('/deposit/submit', authenticate, requireRole('parent'), async (req, res, next) => {
  try {
    const { signedXdr, studentId, amount } = req.body;
    const server = getHorizonServer();
    const result = await server.submitTransaction(TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET));

    const transaction = await Transaction.create({
      type: 'parent_deposit',
      fromUser: req.user.id,
      toUser: studentId,
      amount,
      assetCode: 'XLM',
      txHash: result.hash,
      status: 'success',
    });
    track(req.user.id, 'funds_sent', { amount, studentId });
    return res.status(201).json({ transaction });
  } catch (err) {
    return next(err);
  }
});


// ----------------------------------------------------------------------------
// RELEASE — not used in current flow (funds go direct parent->student)
// ----------------------------------------------------------------------------
router.post('/release/build', authenticate, requireRole('student'), async (req, res) => {
  return res.status(501).json({ error: 'Release route not available. Funds are sent directly to student wallet.' });
});

router.post('/release/submit', authenticate, requireRole('student'), async (req, res) => {
  return res.status(501).json({ error: 'Release route not available.' });
});


// ----------------------------------------------------------------------------
// PAY TUITION (Student -> University)
// ----------------------------------------------------------------------------
router.post('/pay-tuition/build', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { universityId, amount } = req.body;
    const student = await User.findById(req.user.id);
    const university = await User.findById(universityId);

    const server = getHorizonServer();
    const account = await server.loadAccount(student.stellarPublicKey);
    const networkPassphrase = Networks.TESTNET;

    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
      .addOperation(Operation.payment({ destination: university.stellarPublicKey, asset: Asset.native(), amount: amount.toString() }))
      .addMemo(require('@stellar/stellar-sdk').Memo.text('Tuition payment'))
      .setTimeout(300)
      .build();

    return res.json({ xdr: tx.toXDR() });
  } catch (err) {
    return next(err);
  }
});

router.post('/pay-tuition/submit', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { signedXdr, universityId, amount } = req.body;
    const server = getHorizonServer();
    const result = await server.submitTransaction(TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET));
    
    const transaction = await Transaction.create({
      type: 'tuition_payment',
      fromUser: req.user.id,
      toUser: universityId,
      amount,
      assetCode: 'XLM',
      txHash: result.hash,
      status: 'success',
    });
    track(req.user.id, 'tuition_paid', { amount, universityId });
    return res.status(201).json({ transaction });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
