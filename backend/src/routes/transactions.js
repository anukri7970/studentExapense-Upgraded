const express = require('express');
const { TransactionBuilder, Networks, Operation, Asset, BASE_FEE, Keypair } = require('@stellar/stellar-sdk');

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticate, requireRole } = require('../middleware/auth');
const { buildDepositXdr, buildReleaseXdr } = require('../services/sorobanService');
const { getHorizonServer } = require('../services/stellarService');
const { track } = require('../config/analytics');

const router = express.Router();
const XLM_TO_STROOPS = 10_000_000;

function getNativeAssetAddress() {
  const address = process.env.STELLAR_NATIVE_ASSET_CONTRACT_ID;
  if (!address) throw new Error('STELLAR_NATIVE_ASSET_CONTRACT_ID is not set.');
  return address;
}

// ----------------------------------------------------------------------------
// DEPOSIT (Parent -> Student Escrow)
// ----------------------------------------------------------------------------
router.post('/deposit/build', authenticate, requireRole('parent'), async (req, res, next) => {
  try {
    const { studentId, amount } = req.body;
    if (!studentId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid input' });

    const parent = await User.findById(req.user.id);
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') return res.status(404).json({ error: 'Student not found.' });

    const xdr = await buildDepositXdr({
      parentPublicKey: parent.stellarPublicKey,
      studentPublicKey: student.stellarPublicKey,
      assetAddress: getNativeAssetAddress(),
      amountStroops: Math.round(amount * XLM_TO_STROOPS),
    });
    return res.json({ xdr });
  } catch (err) {
    return next(err);
  }
});

router.post('/deposit/submit', authenticate, requireRole('parent'), async (req, res, next) => {
  try {
    const { signedXdr, studentId, amount } = req.body;
    const server = getHorizonServer();
    const result = await server.submitTransaction(TransactionBuilder.fromXDR(signedXdr, process.env.STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET));
    
    const transaction = await Transaction.create({
      type: 'parent_deposit',
      fromUser: req.user.id,
      toUser: studentId,
      amount,
      assetCode: 'XLM',
      txHash: result.hash,
      contractId: process.env.SEND_FUNDS_CONTRACT_ID,
      status: 'success',
    });
    track(req.user.id, 'funds_sent', { amount, studentId });
    return res.status(201).json({ transaction });
  } catch (err) {
    return next(err);
  }
});

// ----------------------------------------------------------------------------
// RELEASE (Student pulls from Escrow)
// ----------------------------------------------------------------------------
router.post('/release/build', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { parentId, amount } = req.body;
    const student = await User.findById(req.user.id);
    const parent = await User.findById(parentId);

    const xdr = await buildReleaseXdr({
      parentPublicKey: parent.stellarPublicKey,
      studentPublicKey: student.stellarPublicKey,
      assetAddress: getNativeAssetAddress(),
      amountStroops: Math.round(amount * XLM_TO_STROOPS),
    });
    return res.json({ xdr });
  } catch (err) {
    return next(err);
  }
});

router.post('/release/submit', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { signedXdr, parentId, amount } = req.body;
    const server = getHorizonServer();
    const result = await server.submitTransaction(TransactionBuilder.fromXDR(signedXdr, process.env.STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET));
    
    const transaction = await Transaction.create({
      type: 'student_release',
      fromUser: parentId,
      toUser: req.user.id,
      amount,
      assetCode: 'XLM',
      txHash: result.hash,
      contractId: process.env.SEND_FUNDS_CONTRACT_ID,
      status: 'success',
    });
    return res.status(201).json({ transaction });
  } catch (err) {
    return next(err);
  }
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
    const account = await server.getAccount(student.stellarPublicKey);
    const networkPassphrase = process.env.STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET;

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
    const result = await server.submitTransaction(TransactionBuilder.fromXDR(signedXdr, process.env.STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET));
    
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
