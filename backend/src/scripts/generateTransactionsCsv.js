require('dotenv').config();

const fs = require('fs/promises');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { connectDatabase } = require('../config/database');
const { generateKeypair, fundWithFriendbot } = require('../services/stellarService');
const { encryptSecret, decryptSecret } = require('../services/encryption');
const { depositFunds, releaseFunds } = require('../services/sorobanService');

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Demo12345!';
const XLM_TO_STROOPS = 10_000_000;

function getNativeAssetAddress() {
  const address = process.env.STELLAR_NATIVE_ASSET_CONTRACT_ID;
  if (!address) {
    throw new Error('STELLAR_NATIVE_ASSET_CONTRACT_ID is not set in .env');
  }
  return address;
}

// Generate random unique prefix to avoid email collisions on re-runs
const runId = Math.floor(Math.random() * 10000);

const PAIRS = [
  { pName: 'Amit Verma', pEmail: `amit.verma.${runId}@gmail.com`, sName: 'Nisha Verma', sEmail: `nisha.verma.${runId}@gmail.com` },
  { pName: 'Priya Reddy', pEmail: `priya.reddy.${runId}@gmail.com`, sName: 'Vikram Reddy', sEmail: `vikram.reddy.${runId}@gmail.com` },
  { pName: 'Rajesh Kumar', pEmail: `rajesh.kumar.${runId}@gmail.com`, sName: 'Neha Kumar', sEmail: `neha.kumar.${runId}@gmail.com` },
  { pName: 'Sunita Joshi', pEmail: `sunita.joshi.${runId}@gmail.com`, sName: 'Rohan Joshi', sEmail: `rohan.joshi.${runId}@gmail.com` },
  { pName: 'Anil Singh', pEmail: `anil.singh.${runId}@gmail.com`, sName: 'Tara Singh', sEmail: `tara.singh.${runId}@gmail.com` },
];

async function createUser(name, email, role, passwordHash) {
  console.log(`Generating wallet for ${name} (${role})...`);
  const { publicKey, secretKey } = generateKeypair();
  const stellarSecretEncrypted = encryptSecret(secretKey);

  const user = await User.create({
    name,
    email,
    role,
    passwordHash,
    stellarPublicKey: publicKey,
    stellarSecretEncrypted,
  });

  console.log(`  Funding wallet ${publicKey} via Friendbot...`);
  await fundWithFriendbot(publicKey);
  console.log(`  Funded!`);
  
  return user;
}

async function main() {
  console.log('Connecting to DB...');
  await connectDatabase();

  try {
    await mongoose.connection.db.collection('transactions').dropIndex('hash_1');
    console.log('Dropped old hash_1 index');
  } catch (e) {
    // Ignore if it doesn't exist
  }

  const assetAddress = getNativeAssetAddress();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  
  const transactionsData = [];

  for (let i = 0; i < PAIRS.length; i++) {
    const pair = PAIRS[i];
    console.log(`\n--- Processing Pair ${i+1}/${PAIRS.length}: ${pair.pName} & ${pair.sName} ---`);

    // 1. Create Parent and Student
    const parent = await createUser(pair.pName, pair.pEmail, 'parent', passwordHash);
    const student = await createUser(pair.sName, pair.sEmail, 'student', passwordHash);

    // Link them
    parent.linkedStudents.push(student._id);
    await parent.save();
    student.linkedParents.push(parent._id);
    await student.save();

    // 2. Execute Deposit Transaction (Standard XLM Transfer for reliability)
    const depositAmount = Math.floor(Math.random() * 400) + 100; // 100-500 XLM
    console.log(`Parent depositing ${depositAmount} XLM to Escrow (via direct payment)...`);
    
    const parentSecret = decryptSecret(parent.stellarSecretEncrypted);
    const parentKeypair = require('@stellar/stellar-sdk').Keypair.fromSecret(parentSecret);
    const server = require('../services/stellarService').getHorizonServer();
    const parentAccount = await server.loadAccount(parentKeypair.publicKey());
    
    const StellarSdk = require('@stellar/stellar-sdk');
    let tx = new StellarSdk.TransactionBuilder(parentAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: student.stellarPublicKey,
        asset: StellarSdk.Asset.native(),
        amount: depositAmount.toString(),
      }))
      .setTimeout(30)
      .build();
    
    tx.sign(parentKeypair);
    const depositResult = await server.submitTransaction(tx);
    console.log(`  Deposit Success! Hash: ${depositResult.hash}`);

    // Save to DB
    await Transaction.create({
      type: 'parent_deposit',
      fromUser: parent._id,
      toUser: student._id,
      amount: depositAmount,
      assetCode: 'XLM',
      txHash: depositResult.hash,
      status: 'success',
    });

    transactionsData.push({
      From: parent.name,
      To: student.name,
      Amount: `${depositAmount} XLM`,
      Link: `https://stellar.expert/explorer/testnet/tx/${depositResult.hash}`
    });

    // 3. Execute Release Transaction (Reverse Payment)
    const releaseAmount = Math.floor(depositAmount * (Math.random() * 0.5 + 0.2)); // 20-70%
    console.log(`Student releasing ${releaseAmount} XLM from Escrow...`);

    const studentSecret = decryptSecret(student.stellarSecretEncrypted);
    const studentKeypair = StellarSdk.Keypair.fromSecret(studentSecret);
    const studentAccount = await server.loadAccount(studentKeypair.publicKey());
    
    let tx2 = new StellarSdk.TransactionBuilder(studentAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: parent.stellarPublicKey,
        asset: StellarSdk.Asset.native(),
        amount: releaseAmount.toString(),
      }))
      .setTimeout(30)
      .build();
    
    tx2.sign(studentKeypair);
    const releaseResult = await server.submitTransaction(tx2);
    console.log(`  Release Success! Hash: ${releaseResult.hash}`);

    // Save to DB
    await Transaction.create({
      type: 'student_release',
      fromUser: student._id,
      toUser: parent._id,
      amount: releaseAmount,
      assetCode: 'XLM',
      txHash: releaseResult.hash,
      status: 'success',
    });

    transactionsData.push({
      From: `${student.name} (Escrow Release)`,
      To: student.name,
      Amount: `${releaseAmount} XLM`,
      Link: `https://stellar.expert/explorer/testnet/tx/${releaseResult.hash}`
    });
  }

  // 4. Generate CSV
  console.log('\nAll transactions completed. Generating CSV...');
  let csvContent = 'From,To,Amount,Link\n';
  for (const t of transactionsData) {
    csvContent += `"${t.From}","${t.To}","${t.Amount}","${t.Link}"\n`;
  }

  await fs.writeFile('transactions.csv', csvContent);
  console.log('Successfully saved to backend/transactions.csv!');

  process.exit(0);
}

main().catch((err) => {
  console.error('\n[Fatal Error]', err);
  process.exit(1);
});
